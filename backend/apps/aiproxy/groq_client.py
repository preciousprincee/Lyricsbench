import requests
from django.conf import settings

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"


class GroqError(Exception):
    def __init__(self, message, status=500):
        super().__init__(message)
        self.message = message
        self.status = status


def groq_chat(messages, model=None, temperature=0.9, max_tokens=1200, json_mode=False):
    if not settings.GROQ_API_KEY:
        raise GroqError("AI is not configured on the server yet.", 503)

    chosen_model = model if model in settings.GROQ_ALLOWED_MODELS else settings.GROQ_DEFAULT_MODEL

    body = {
        "model": chosen_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    try:
        resp = requests.post(
            GROQ_ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            },
            json=body,
            timeout=30,
        )
    except requests.RequestException:
        raise GroqError("Could not reach the AI provider. Try again.", 502)

    if not resp.ok:
        detail = ""
        try:
            detail = resp.json().get("error", {}).get("message", "")
        except ValueError:
            pass
        if resp.status_code == 429:
            raise GroqError("The AI is rate-limited right now. Wait a moment and try again.", 429)
        raise GroqError(detail or f"AI request failed ({resp.status_code}).", resp.status_code)

    data = resp.json()
    text = (data.get("choices") or [{}])[0].get("message", {}).get("content")
    if not text:
        raise GroqError("The AI returned an empty response. Try again.", 502)

    usage = data.get("usage", {})
    return {
        "text": text,
        "model": chosen_model,
        "prompt_tokens": usage.get("prompt_tokens", 0),
        "completion_tokens": usage.get("completion_tokens", 0),
    }
