from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.roles import Cap, has_cap

from .models import Cohort, Domain, Porteur, Project, Subdomain
from .rules import ACTIVE_STATUSES, PROTO_NONE, Status, days_late


class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domain
        fields = ["id", "code", "label"]


class SubdomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subdomain
        fields = ["id", "code", "label", "domain"]


class CohortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cohort
        fields = ["id", "name", "year", "start_date", "end_date", "applications_count", "selected_count"]

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "La fin doit être postérieure au début."})
        return attrs


class PorteurSerializer(serializers.ModelSerializer):
    projects_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Porteur
        fields = ["id", "full_name", "gender", "projects_count"]


class ProjectSerializer(serializers.ModelSerializer):
    cohort_name = serializers.CharField(source="cohort.name", read_only=True)
    domain_label = serializers.CharField(source="domain.label", read_only=True)
    subdomain_label = serializers.CharField(source="subdomain.label", read_only=True, default=None)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    prototype_stage_label = serializers.CharField(source="get_prototype_stage_display", read_only=True)
    porteur_detail = serializers.SerializerMethodField()
    days_late = serializers.SerializerMethodField()
    partnerships_count = serializers.IntegerField(read_only=True, default=0)
    funding_obtained = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "description",
            "cohort",
            "cohort_name",
            "domain",
            "domain_label",
            "subdomain",
            "subdomain_label",
            "porteur",
            "porteur_detail",
            "received_date",
            "status",
            "status_label",
            "start_date",
            "deadline",
            "progress",
            "prototype_stage",
            "prototype_stage_label",
            "prototype_notes",
            "days_late",
            "partnerships_count",
            "funding_obtained",
            "mentor",
            "phase",
            "team_size",
            "evaluation_score",
            "delay_days",
            "budget_requested_xof",
            "budget_granted_xof",
            "budget_spent_xof",
            "external_id",
            "is_demo",
            "created_at",
            "updated_at",
        ]
        # is_demo, created_at... ne sont jamais modifiables par le client (pas d'affectation de masse).
        read_only_fields = ["id", "external_id", "is_demo", "created_at", "updated_at"]

    @extend_schema_field(serializers.DictField())
    def get_porteur_detail(self, obj):
        user = self.context["request"].user
        if has_cap(user, Cap.VIEW_PERSONAL):
            return {"id": obj.porteur_id, "full_name": obj.porteur.full_name, "gender": obj.porteur.gender}
        return {"id": obj.porteur_id, "full_name": f"Porteur n°{obj.porteur_id}", "gender": None}

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_days_late(self, obj):
        return days_late(obj, timezone.localdate())

    def validate_progress(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("La progression doit être comprise entre 0 et 100.")
        return value

    def validate(self, attrs):
        get = lambda k: attrs.get(k, getattr(self.instance, k, None))  # noqa: E731
        received, start, deadline = get("received_date"), get("start_date"), get("deadline")
        status, progress, stage = get("status"), get("progress"), get("prototype_stage")
        errors = {}
        if start and received and start < received:
            errors["start_date"] = "Le démarrage ne peut pas précéder la réception de l'idée."
        if start and deadline and deadline < start:
            errors["deadline"] = "La date limite doit être postérieure à la date de début."
        if status == Status.TERMINE and progress != 100:
            errors["progress"] = "Un projet terminé doit avoir une progression de 100 %."
        if status in (Status.RECU, Status.REJETE) and progress and progress > 0:
            errors["progress"] = "Une idée non retenue ou tout juste reçue ne peut pas avoir de progression."
        if status in ACTIVE_STATUSES and not deadline:
            pass  # facultatif : l'absence de date limite est signalée comme limite des données
        if stage and stage != PROTO_NONE and status in (Status.RECU, Status.REJETE):
            errors["prototype_stage"] = "Un prototype ne peut pas exister avant la sélection du projet."
        domain, subdomain = get("domain"), get("subdomain")
        if subdomain and domain and subdomain.domain_id != domain.pk:
            errors["subdomain"] = "Ce sous-domaine n'appartient pas au domaine choisi."
        requested, granted, spent = get("budget_requested_xof"), get("budget_granted_xof"), get("budget_spent_xof")
        if granted is not None and requested is not None and granted > requested:
            errors["budget_granted_xof"] = "Le budget accordé ne peut pas dépasser le budget demandé."
        if spent is not None and granted is not None and spent > granted:
            errors["budget_spent_xof"] = "Le budget dépensé ne peut pas dépasser le budget accordé."
        score = get("evaluation_score")
        if score is not None and not 0 <= score <= 20:
            errors["evaluation_score"] = "La note doit être comprise entre 0 et 20."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
