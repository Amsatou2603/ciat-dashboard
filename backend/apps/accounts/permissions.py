from rest_framework.permissions import BasePermission

from .roles import Cap, has_cap


def require(*caps: Cap):
    """Fabrique une permission DRF exigeant TOUTES les capacités listées."""

    class _Require(BasePermission):
        message = "Votre rôle ne permet pas cette action."

        def has_permission(self, request, view):
            return bool(request.user and request.user.is_authenticated and all(has_cap(request.user, c) for c in caps))

    _Require.__name__ = "Require_" + "_".join(c.value for c in caps)
    return _Require


class ReadOrWrite(BasePermission):
    """Lecture : view_projects ; écriture : write_projects ; suppression : delete_projects."""

    message = "Votre rôle ne permet pas cette action."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return has_cap(user, Cap.VIEW_PROJECTS)
        if request.method == "DELETE":
            return has_cap(user, Cap.DELETE_PROJECTS)
        return has_cap(user, Cap.WRITE_PROJECTS)
