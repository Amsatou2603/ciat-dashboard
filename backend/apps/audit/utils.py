from .models import AuditLog

_UNSET = object()


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    ip = forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")
    return ip or None


def record(request, action, object_type="", object_id="", extra=None, user=_UNSET):
    actor = request.user if user is _UNSET else user
    actor = actor if getattr(actor, "is_authenticated", False) else None
    AuditLog.objects.create(
        user=actor,
        username=(actor.username if actor else (str(object_id)[:150] if action.startswith("login") else "")),
        action=action,
        object_type=object_type,
        object_id=str(object_id)[:150],
        extra=extra or {},
        ip_address=_client_ip(request),
    )
