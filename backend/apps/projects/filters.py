"""Filtres communs à la liste des projets, aux indicateurs, aux exports et à l'assistant IA."""

import django_filters as df
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.roles import Cap, has_cap

from .models import Project
from .rules import STATUS_CHOICES


class ProjectFilter(df.FilterSet):
    period_start = df.DateFilter(field_name="received_date", lookup_expr="gte")
    period_end = df.DateFilter(field_name="received_date", lookup_expr="lte")
    cohort = df.NumberFilter(field_name="cohort_id")
    domain = df.NumberFilter(field_name="domain_id")
    subdomain = df.NumberFilter(field_name="subdomain_id")
    status = df.MultipleChoiceFilter(choices=STATUS_CHOICES)
    porteur = df.NumberFilter(field_name="porteur_id")

    class Meta:
        model = Project
        fields: list[str] = []

    def __init__(self, data=None, *args, **kwargs):
        # Les valeurs vides (« ?cohort=&status= ») signifient « pas de filtre » et non « valeur invalide ».
        if data is not None:
            from django.http import QueryDict

            cleaned = QueryDict(mutable=True)
            for key in data:
                values = (
                    data.getlist(key) if hasattr(data, "getlist") else (data[key] if isinstance(data[key], (list, tuple)) else [data[key]])
                )
                values = [v for v in values if v not in ("", None)]
                if values:
                    cleaned.setlist(key, [str(v) for v in values])
            data = cleaned
        super().__init__(data, *args, **kwargs)

    def filter_queryset(self, queryset):
        data = self.form.cleaned_data
        start, end = data.get("period_start"), data.get("period_end")
        if start and end and start > end:
            raise ValidationError({"period_end": "La date de fin doit être postérieure à la date de début."})
        request = getattr(self, "request", None)
        if data.get("porteur") and request is not None and not has_cap(request.user, Cap.VIEW_PERSONAL):
            raise PermissionDenied("Le filtre par porteur n'est pas autorisé pour votre rôle.")
        return super().filter_queryset(queryset)


def filtered_projects(params, user):
    """Applique les filtres validés ; lève ValidationError (400) sur valeur ou période invalide."""

    class _Req:  # objet minimal pour le contrôle de rôle dans le FilterSet
        pass

    req = _Req()
    req.user = user
    fs = ProjectFilter(data=params, queryset=Project.objects.all(), request=req)
    if not fs.is_valid():
        raise ValidationError(fs.errors)
    return fs.qs
