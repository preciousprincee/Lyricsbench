import requests
from django.conf import settings

PAYSTACK_BASE = "https://api.paystack.co"


class PaystackError(Exception):
    def __init__(self, message, status=500):
        super().__init__(message)
        self.message = message
        self.status = status


def _headers():
    if not settings.PAYSTACK_SECRET_KEY:
        raise PaystackError("Billing is not configured on the server yet.", 503)
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def _request(method, path, **kwargs):
    try:
        resp = requests.request(method, f"{PAYSTACK_BASE}{path}", headers=_headers(), timeout=15, **kwargs)
    except requests.RequestException:
        raise PaystackError("Could not reach Paystack. Try again shortly.", 502)

    try:
        data = resp.json()
    except ValueError:
        raise PaystackError("Paystack returned an unexpected response.", 502)

    if not resp.ok or not data.get("status", True):
        raise PaystackError(data.get("message") or f"Paystack request failed ({resp.status_code}).", resp.status_code)

    return data.get("data", data)


def get_or_create_customer(email, profile_id):
    """Paystack customers are keyed by email; creating one that already
    exists just returns the existing record, so this is safe to call
    every time rather than caching a lookup."""
    return _request("POST", "/customer", json={
        "email": email,
        "metadata": {"profile_id": str(profile_id)},
    })


def initialize_transaction(email, plan_code, callback_url, profile_id):
    """Starts a hosted Paystack checkout. Passing `plan` means Paystack
    creates the subscription automatically once payment succeeds — we
    don't need a separate 'create subscription' call."""
    return _request("POST", "/transaction/initialize", json={
        "email": email,
        "plan": plan_code,
        "callback_url": callback_url,
        "metadata": {"profile_id": str(profile_id)},
    })


def verify_transaction(reference):
    return _request("GET", f"/transaction/verify/{reference}")


def fetch_subscription(subscription_code):
    return _request("GET", f"/subscription/{subscription_code}")


def get_manage_link(subscription_code):
    """Paystack's closest equivalent to Stripe's billing portal: a
    hosted page where the customer can update their card on file. It
    does not let them view invoices/history the way Stripe's portal
    does — that's a genuine feature gap, not an oversight."""
    return _request("GET", f"/subscription/{subscription_code}/manage/link")


def disable_subscription(subscription_code, email_token):
    return _request("POST", "/subscription/disable", json={
        "code": subscription_code,
        "token": email_token,
    })
