from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Wraps DRF's default handler so every error response has a consistent
    `{"error": {"message": ..., "code": ...}}` shape the frontend can rely on.

    DRF's default response.data isn't one consistent shape — it varies by
    what raised the exception:
      - APIException with a plain detail: {"detail": "..."}
      - A serializer's field errors (raise_exception=True):
            {"email": ["already exists"]}
      - A non-field error raised inside serializer.validate():
            {"non_field_errors": ["Incorrect email or password."]}
    Reading only `detail["detail"]` (as an earlier version of this handler
    did) silently returns None for the second and third cases — exactly
    the register/login validation errors this app relies on — so every
    "email already exists" or "wrong password" surfaced to the user as the
    literal string "None" instead of the real message.
    """
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    message = None

    if isinstance(detail, dict):
        if isinstance(detail.get("detail"), (str, list)):
            message = detail["detail"]
        else:
            # Field-keyed validation errors — prefer non_field_errors (the
            # common case for login), otherwise take the first field's
            # first message.
            for key in ("non_field_errors", *detail.keys()):
                value = detail.get(key)
                if isinstance(value, list) and value:
                    message = value[0]
                    break
                if isinstance(value, str):
                    message = value
                    break
    else:
        message = detail

    if isinstance(message, list):
        message = message[0] if message else None
    if message is None:
        message = "Something went wrong."

    response.data = {
        "error": {
            "message": str(message),
            "code": response.status_code,
        }
    }
    return response
