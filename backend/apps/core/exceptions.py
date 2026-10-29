"""Format d'erreur unique : {code, message, details}."""

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler

_CODES = {
    status.HTTP_400_BAD_REQUEST: "validation_error",
    status.HTTP_401_UNAUTHORIZED: "not_authenticated",
    status.HTTP_403_FORBIDDEN: "permission_denied",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_409_CONFLICT: "conflict",
    status.HTTP_429_TOO_MANY_REQUESTS: "throttled",
}


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None  # erreur serveur : Django journalise, le client reçoit un 500 générique
    code = _CODES.get(response.status_code, "error")
    details = None
    if isinstance(exc, ValidationError):
        message = "Certaines données sont invalides."
        details = response.data
    else:
        data = response.data
        message = data.get("detail") if isinstance(data, dict) else None
        message = str(message) if message else "Une erreur est survenue."
        if hasattr(exc, "get_codes") and isinstance(exc.get_codes(), str):
            code = exc.get_codes() if response.status_code != 400 else code
    response.data = {"code": code, "message": message, "details": details}
    return response
