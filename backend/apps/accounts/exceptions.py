from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Wraps DRF's default handler so every error response has a consistent
    `{"error": {"message": ..., "code": ...}}` shape the frontend can rely on."""
    response = exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    message = detail.get("detail") if isinstance(detail, dict) else detail
    if isinstance(message, list):
        message = message[0] if message else "Something went wrong."

    response.data = {
        "error": {
            "message": str(message),
            "code": response.status_code,
        }
    }
    return response
