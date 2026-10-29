"""En-têtes de sécurité complémentaires pour l'API (réponses JSON uniquement)."""

from django.conf import settings


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        docs = request.path.startswith(("/api/docs", "/api/schema"))
        admin = request.path.startswith("/" + settings.ADMIN_URL)
        if not docs and not admin:
            # L'API ne sert jamais de page : on interdit tout chargement de ressource.
            response.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        response.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        if request.path.startswith("/api/"):
            response.setdefault("Cache-Control", "no-store")  # pas de mise en cache de données privées
        return response


class ApiTrailingSlashMiddleware:
    """Accepte les URL d'API sans « / » final (certains proxys, dont les règles de réécriture, peuvent le retirer).

    Contrairement à APPEND_SLASH (qui redirige, et ne convient pas aux POST), la requête est traitée directement.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info
        if path.startswith("/api/") and not path.endswith("/"):
            request.path_info = path + "/"
            request.path = request.path + "/"
        return self.get_response(request)
