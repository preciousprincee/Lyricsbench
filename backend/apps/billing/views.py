import hashlib
import hmac

from django.conf import settings
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Profile

from . import paystack_client
from .models import BillingEvent, Subscription
from .paystack_client import PaystackError


def _get_or_create_subscription_row(profile: Profile) -> Subscription:
    sub, _created = Subscription.objects.get_or_create(
        profile=profile,
        defaults={"paystack_customer_code": ""},
    )
    if not sub.paystack_customer_code:
        customer = paystack_client.get_or_create_customer(profile.email, profile.id)
        sub.paystack_customer_code = customer.get("customer_code", "")
        sub.save(update_fields=["paystack_customer_code"])
    return sub


class CreateCheckoutSessionView(APIView):
    """Starts a Paystack Checkout flow to upgrade the current user to Pro.
    Kept the same URL/response shape as before (`checkout_url`) so the
    frontend didn't need to change when we swapped off Stripe."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        interval = request.data.get("interval", "monthly")
        plan_code = (
            settings.PAYSTACK_PLAN_CODE_PRO_YEARLY
            if interval == "yearly"
            else settings.PAYSTACK_PLAN_CODE_PRO_MONTHLY
        )
        if not plan_code:
            return Response({"error": {"message": "Billing is not configured yet."}}, status=503)

        try:
            _get_or_create_subscription_row(request.user)
            init = paystack_client.initialize_transaction(
                email=request.user.email,
                plan_code=plan_code,
                callback_url=f"{settings.FRONTEND_URL}/settings?checkout=success",
                profile_id=request.user.id,
            )
        except PaystackError as exc:
            return Response({"error": {"message": exc.message}}, status=exc.status if exc.status < 500 else 502)

        return Response({"checkout_url": init.get("authorization_url")})


class CreateBillingPortalView(APIView):
    """Paystack's nearest equivalent to a billing portal: a hosted link
    where the customer can update the card on their existing subscription.
    Response shape (`portal_url`) matches the old Stripe endpoint."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        sub = Subscription.objects.filter(profile=request.user).first()
        if not sub or not sub.paystack_subscription_code:
            return Response({"error": {"message": "No active subscription to manage yet."}}, status=400)

        try:
            link = paystack_client.get_manage_link(sub.paystack_subscription_code)
        except PaystackError as exc:
            return Response({"error": {"message": exc.message}}, status=exc.status if exc.status < 500 else 502)

        return Response({"portal_url": link.get("link")})


@method_decorator(csrf_exempt, name="dispatch")
class PaystackWebhookView(APIView):
    """Receives Paystack events and syncs Subscription/Profile.plan.
    Authenticated via the X-Paystack-Signature header (HMAC-SHA512 of the
    raw body using the secret key), not Supabase auth."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw_body = request.body
        signature = request.META.get("HTTP_X_PAYSTACK_SIGNATURE", "")

        if not settings.PAYSTACK_SECRET_KEY:
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        expected = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode("utf-8"), raw_body, hashlib.sha512
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        event = request.data
        event_type = event.get("event", "")
        data = event.get("data", {})

        # Paystack doesn't send a stable top-level event id, so we use the
        # signature itself (a deterministic hash of this exact payload) to
        # de-duplicate retried deliveries.
        event_id = signature
        if BillingEvent.objects.filter(paystack_event_id=event_id).exists():
            return Response(status=200)

        profile = self._resolve_profile(data)
        BillingEvent.objects.create(
            paystack_event_id=event_id, event_type=event_type,
            profile=profile, payload=event,
        )

        if event_type == "charge.success":
            self._handle_charge_success(data)
        elif event_type == "subscription.create":
            self._handle_subscription_create(data)
        elif event_type in ("subscription.disable", "subscription.not_renew"):
            self._handle_subscription_disabled(data, event_type)
        elif event_type == "invoice.payment_failed":
            self._handle_payment_failed(data)

        return Response(status=200)

    def _resolve_profile(self, data):
        customer = data.get("customer") or {}
        customer_code = customer.get("customer_code")
        email = customer.get("email")
        sub = None
        if customer_code:
            sub = Subscription.objects.filter(paystack_customer_code=customer_code).first()
        if not sub and email:
            sub = Subscription.objects.filter(profile__email=email).first()
        return sub.profile if sub else None

    def _handle_charge_success(self, data):
        # Fires for the initial payment on a new subscription (and each
        # renewal). If a plan/subscription is attached, treat the user as
        # Pro immediately rather than waiting on subscription.create.
        plan = data.get("plan") or {}
        if not plan:
            return
        customer = data.get("customer") or {}
        customer_code = customer.get("customer_code")
        sub_row = Subscription.objects.filter(paystack_customer_code=customer_code).first()
        if not sub_row:
            return

        sub_row.status = Subscription.Status.ACTIVE
        sub_row.paystack_plan_code = plan.get("plan_code", sub_row.paystack_plan_code)
        sub_row.unit_amount_cents = plan.get("amount") or sub_row.unit_amount_cents
        sub_row.currency = plan.get("currency") or sub_row.currency
        sub_row.billing_interval = plan.get("interval") or sub_row.billing_interval
        sub_row.save()

        profile = sub_row.profile
        profile.plan = Profile.Plan.PRO
        profile.save(update_fields=["plan"])

    def _handle_subscription_create(self, data):
        customer = data.get("customer") or {}
        customer_code = customer.get("customer_code")
        sub_row = Subscription.objects.filter(paystack_customer_code=customer_code).first()
        if not sub_row:
            return

        plan = data.get("plan") or {}
        sub_row.paystack_subscription_code = data.get("subscription_code", sub_row.paystack_subscription_code)
        sub_row.paystack_email_token = data.get("email_token", sub_row.paystack_email_token)
        sub_row.paystack_plan_code = plan.get("plan_code", sub_row.paystack_plan_code)
        sub_row.unit_amount_cents = plan.get("amount") or sub_row.unit_amount_cents
        sub_row.currency = plan.get("currency") or sub_row.currency
        sub_row.billing_interval = plan.get("interval") or sub_row.billing_interval
        sub_row.status = Subscription.Status.ACTIVE
        next_payment = data.get("next_payment_date")
        if next_payment:
            sub_row.current_period_end = timezone.datetime.fromisoformat(next_payment.replace("Z", "+00:00"))
        sub_row.save()

        profile = sub_row.profile
        profile.plan = Profile.Plan.PRO
        profile.save(update_fields=["plan"])

    def _handle_subscription_disabled(self, data, event_type):
        subscription_code = data.get("subscription_code")
        sub_row = Subscription.objects.filter(paystack_subscription_code=subscription_code).first()
        if not sub_row:
            return

        if event_type == "subscription.not_renew":
            sub_row.cancel_at_period_end = True
            sub_row.status = Subscription.Status.NON_RENEWING
            sub_row.save(update_fields=["cancel_at_period_end", "status"])
            return  # still Pro until the period actually ends

        sub_row.status = Subscription.Status.CANCELED
        sub_row.save(update_fields=["status"])
        profile = sub_row.profile
        profile.plan = Profile.Plan.FREE
        profile.save(update_fields=["plan"])

    def _handle_payment_failed(self, data):
        subscription = data.get("subscription") or {}
        subscription_code = subscription.get("subscription_code")
        sub_row = Subscription.objects.filter(paystack_subscription_code=subscription_code).first()
        if not sub_row:
            return
        sub_row.status = Subscription.Status.ATTENTION
        sub_row.save(update_fields=["status"])
