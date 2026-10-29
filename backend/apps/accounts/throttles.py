from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = "login"


class RefreshRateThrottle(AnonRateThrottle):
    """Le rafraîchissement a lieu à chaque rechargement de page : plafond plus large que la connexion."""

    scope = "refresh"
