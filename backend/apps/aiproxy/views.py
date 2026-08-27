import json

from django.conf import settings
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from . import quota
from .groq_client import GroqError, groq_chat
from .models import AIRequestLog


class ChatView(APIView):
    """
    Generic, quota-metered proxy in front of Groq. The frontend still owns
    prompt construction (Sound Bible + pre-write → system prompt) since
    that's product logic, not a secret — only the API key and quota
    enforcement live server-side.

    Quota is reserved atomically via a cache counter *before* calling
    Groq (see apps/aiproxy/quota.py) so concurrent requests from the same
    user can't all slip through at once, then refunded if the call fails.

    POST body: {
      messages: [{role, content}, ...],
      purpose: "onboarding_chat" | "onboarding_extract" | "generate" | "rhymes",
      model, temperature, max_tokens, json_mode
    }
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "ai-generate"

    def post(self, request):
        profile = request.user
        month = quota.month_key()

        allowed, used, limit = quota.try_consume(profile, month)
        if not allowed:
            return Response({
                "error": {
                    "message": (
                        "You've used all your AI generations for this month on the Free plan. "
                        "Upgrade to Pro in Settings for a much higher monthly limit."
                        if not profile.is_pro else
                        "You've hit this month's generation limit. It resets next month."
                    ),
                    "code": "quota_exceeded",
                }
            }, status=402)

        messages = request.data.get("messages")
        if not messages or not isinstance(messages, list):
            quota.refund(profile, month)
            return Response({"error": {"message": "`messages` is required."}}, status=400)

        purpose = request.data.get("purpose", "other")
        model = request.data.get("model")
        temperature = float(request.data.get("temperature", 0.9))
        max_tokens = int(request.data.get("max_tokens", 1200))
        json_mode = bool(request.data.get("json_mode", False))

        log = AIRequestLog(profile=profile, purpose=purpose, model=model or settings.GROQ_DEFAULT_MODEL, month=month)

        try:
            result = groq_chat(
                messages, model=model, temperature=temperature,
                max_tokens=max_tokens, json_mode=json_mode,
            )
        except GroqError as exc:
            quota.refund(profile, month)  # don't charge quota for a failed call
            log.succeeded = False
            log.error_message = str(exc.message)[:500]
            log.save()
            return Response({"error": {"message": exc.message}}, status=exc.status if exc.status < 500 else 502)

        log.model = result["model"]
        log.prompt_tokens_estimate = result["prompt_tokens"]
        log.completion_tokens_estimate = result["completion_tokens"]
        log.save()

        text = result["text"]
        payload = {"text": text, "remaining": max(limit - used, 0)}

        if json_mode:
            cleaned = text.replace("```json", "").replace("```", "").strip()
            try:
                payload["json"] = json.loads(cleaned)
            except ValueError:
                pass  # frontend can fall back to parsing `text` itself

        return Response(payload)
