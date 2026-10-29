from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health(request):
    """Vérification de santé : ne révèle ni version, ni configuration, ni erreur interne."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok"})
    except Exception:  # noqa: BLE001 - volontairement opaque
        return JsonResponse({"status": "degraded"}, status=503)
