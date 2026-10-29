"""Matrice rôles → capacités. Source unique de vérité pour le backend ET l'API /me (le frontend ne fait qu'afficher)."""

from enum import StrEnum


class Cap(StrEnum):
    VIEW_DASHBOARD = "view_dashboard"  # indicateurs et graphiques agrégés
    VIEW_PROJECTS = "view_projects"  # liste et détail des projets
    VIEW_PERSONAL = "view_personal"  # identité et genre des porteurs
    WRITE_PROJECTS = "write_projects"  # créer / modifier projets, partenariats, financements
    DELETE_PROJECTS = "delete_projects"
    EXPORT = "export"
    USE_AI = "use_ai"
    MANAGE_USERS = "manage_users"
    VIEW_AUDIT = "view_audit"


ROLE_ADMIN, ROLE_COORDINATOR, ROLE_ANALYST, ROLE_READER = "admin", "coordinator", "analyst", "reader"

ROLE_CAPABILITIES: dict[str, frozenset[Cap]] = {
    ROLE_ADMIN: frozenset(Cap),
    ROLE_COORDINATOR: frozenset(
        {Cap.VIEW_DASHBOARD, Cap.VIEW_PROJECTS, Cap.VIEW_PERSONAL, Cap.WRITE_PROJECTS, Cap.DELETE_PROJECTS, Cap.EXPORT, Cap.USE_AI}
    ),
    ROLE_ANALYST: frozenset({Cap.VIEW_DASHBOARD, Cap.VIEW_PROJECTS, Cap.VIEW_PERSONAL, Cap.EXPORT, Cap.USE_AI}),
    ROLE_READER: frozenset({Cap.VIEW_DASHBOARD, Cap.VIEW_PROJECTS}),
}


def capabilities_for(user) -> frozenset[Cap]:
    if not user or not user.is_authenticated or not user.is_active:
        return frozenset()
    return ROLE_CAPABILITIES.get(user.role, frozenset())


def has_cap(user, cap: Cap) -> bool:
    return cap in capabilities_for(user)
