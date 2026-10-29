from rest_framework import serializers

from .models import Funding, Partner, Partnership


class PartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        fields = ["id", "name", "kind", "specialty", "is_active"]


class PartnershipSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source="partner.name", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)
    nature_label = serializers.CharField(source="get_nature_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Partnership
        fields = [
            "id",
            "project",
            "project_title",
            "partner",
            "partner_name",
            "nature",
            "nature_label",
            "status",
            "status_label",
            "start_date",
        ]

    def validate(self, attrs):
        qs = Partnership.objects.filter(
            project=attrs.get("project", getattr(self.instance, "project", None)),
            partner=attrs.get("partner", getattr(self.instance, "partner", None)),
            nature=attrs.get("nature", getattr(self.instance, "nature", None)),
        )
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce partenariat existe déjà pour ce projet.")
        return attrs


class FundingSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source="partner.name", read_only=True)
    project_title = serializers.CharField(source="project.title", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Funding
        fields = ["id", "project", "project_title", "partner", "partner_name", "amount_xof", "status", "status_label", "date"]

    def validate_amount_xof(self, value):
        if value <= 0:
            raise serializers.ValidationError("Le montant doit être strictement positif.")
        if value > 10_000_000_000:
            raise serializers.ValidationError("Montant improbable : vérifiez la saisie (maximum 10 milliards XOF).")
        return value
