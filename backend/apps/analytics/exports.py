"""Génération des exports (Excel, PDF, image). Les filtres et les droits sont appliqués par la vue appelante."""

from __future__ import annotations

import io
from datetime import date

from django.conf import settings
from django.utils import timezone

from apps.projects.rules import STATUS_CHOICES

from . import services

STATUS_LABELS = dict(STATUS_CHOICES)
GENDER = {"F": "Femme", "M": "Homme", "NS": "Non renseigné"}


def _safe_cell(value):
    """Neutralise l'injection de formules Excel (=, +, -, @) dans les textes saisis par les utilisateurs."""
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def filename(kind: str, ext: str) -> str:
    return f"ciat-{kind}-{timezone.localdate():%Y%m%d}.{ext}"


def filters_text(params) -> list[str]:
    labels = {
        "period_start": "Début",
        "period_end": "Fin",
        "cohort": "Cohorte (id)",
        "domain": "Domaine (id)",
        "subdomain": "Sous-domaine (id)",
        "status": "Statut",
        "porteur": "Porteur (id)",
    }
    out = []
    for key, label in labels.items():
        values = params.getlist(key) if hasattr(params, "getlist") else params.get(key)
        if values in (None, "", []):
            continue
        out.append(f"{label} : {', '.join(values) if isinstance(values, list) else values}")
    return out or ["Aucun filtre (toutes les données autorisées)"]


def build_xlsx(projects, params, summary_data, can_see_personal: bool) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill

    wb = Workbook()
    ws = wb.active
    ws.title = "Synthèse"
    head = Font(bold=True, color="FFFFFF")
    fill = PatternFill("solid", fgColor="1F4FD8")
    ws.append(["Tableau de bord décisionnel du CIAT — synthèse"])
    ws["A1"].font = Font(bold=True, size=14)
    ws.append([f"Généré le {timezone.localtime():%d/%m/%Y %H:%M}"])
    ws.append(["Filtres actifs"] + filters_text(params))
    ws.append([])
    ws.append(["Indicateur", "Valeur"])
    for c in ws[5]:
        c.font, c.fill = head, fill
    ind = summary_data["indicators"]
    rows = [
        ("Idées reçues", ind["ideas_received"]),
        ("Projets sélectionnés", ind["projects_selected"]),
        ("Taux de sélection (%)", ind["selection_rate_pct"] if ind["selection_rate_pct"] is not None else "n/d"),
        ("Prototypes", ind["prototypes"]),
        ("Porteurs distincts", ind["porteurs"]),
        ("Progression moyenne des projets en cours (%)", ind["average_progress_pct"] if ind["average_progress_pct"] is not None else "n/d"),
        ("Projets en retard", ind["late_projects"]),
        ("Partenariats", ind["partnerships"]),
        ("Financements obtenus (XOF)", ind["funding_obtained_xof"]),
        ("Financements promis (XOF)", ind["funding_promised_xof"]),
    ]
    for r in rows:
        ws.append(list(r))
    ws.append([])
    ws.append(["Limites des données"])
    ws[ws.max_row][0].font = Font(bold=True)
    for text in summary_data["limits"]:
        ws.append([text])
    ws.column_dimensions["A"].width = 52
    ws.column_dimensions["B"].width = 22

    wp = wb.create_sheet("Projets")
    cols = ["Titre", "Cohorte", "Domaine", "Statut", "Réception", "Début", "Date limite", "Progression (%)", "Prototype", "Retard (jours)"]
    if can_see_personal:
        cols[1:1] = ["Porteur", "Genre"]
    wp.append(cols)
    for c in wp[1]:
        c.font, c.fill = head, fill
        c.alignment = Alignment(wrap_text=True)
    today = timezone.localdate()
    from apps.projects.rules import days_late

    qs = projects.select_related("cohort", "domain", "porteur").order_by("-received_date", "id")[: settings.EXPORT_MAX_ROWS]
    for p in qs:
        row = [
            _safe_cell(p.title),
            p.cohort.name,
            p.domain.label,
            STATUS_LABELS[p.status],
            p.received_date,
            p.start_date,
            p.deadline,
            p.progress,
            p.get_prototype_stage_display(),
            days_late(p, today),
        ]
        if can_see_personal:
            row[1:1] = [_safe_cell(p.porteur.full_name), GENDER[p.porteur.gender]]
        wp.append(row)
    if wp.max_row == 1:
        wp.append(["Aucun projet pour ces filtres."])
    widths = [38, 20, 12, 34, 18, 14, 12, 12, 14, 14, 14, 12]
    for i, w in enumerate(widths[: len(cols)], start=1):
        wp.column_dimensions[chr(64 + i)].width = w
    for col in ("E", "F", "G") if not can_see_personal else ("G", "H", "I"):
        for cell in wp[col][1:]:
            if isinstance(cell.value, date):
                cell.number_format = "DD/MM/YYYY"
    wp.freeze_panes = "A2"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _fmt_xof(n: int) -> str:
    return f"{n:,}".replace(",", " ") + " XOF"


def build_pdf(projects, params, summary_data) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Synthèse CIAT",
        author="Tableau de bord CIAT",
    )
    ss = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=ss["Title"], fontSize=20, alignment=0, textColor=colors.HexColor("#1B2A6B"))
    h2 = ParagraphStyle("h2", parent=ss["Heading2"], textColor=colors.HexColor("#1F4FD8"), spaceBefore=14)
    body = ss["BodyText"]
    small = ParagraphStyle("small", parent=body, fontSize=8, textColor=colors.HexColor("#555555"))
    ind = summary_data["indicators"]

    def esc(s):
        return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    story = [
        Paragraph("Tableau de bord décisionnel du CIAT", h1),
        Paragraph(f"Fiche de synthèse — période : {esc(summary_data['period'])}", body),
        Paragraph("Filtres : " + esc(" ; ".join(filters_text(params))), small),
        Paragraph(f"Généré le {timezone.localtime():%d/%m/%Y à %H:%M}", small),
        Spacer(1, 10),
    ]
    if ind["ideas_received"] == 0:
        story.append(Paragraph("Aucune donnée ne correspond aux filtres sélectionnés.", body))
    nd = lambda v, suf="": "n/d" if v is None else f"{v}{suf}"  # noqa: E731
    table = [
        ["Indicateur", "Valeur"],
        ["Idées reçues", ind["ideas_received"]],
        ["Projets sélectionnés", f"{ind['projects_selected']} ({nd(ind['selection_rate_pct'], ' %')})"],
        ["Prototypes", ind["prototypes"]],
        ["Porteurs distincts", ind["porteurs"]],
        ["Progression moyenne (projets en cours)", nd(ind["average_progress_pct"], " %")],
        ["Projets en retard", ind["late_projects"]],
        ["Partenariats", ind["partnerships"]],
        ["Financements obtenus", _fmt_xof(ind["funding_obtained_xof"])],
        ["Financements promis", _fmt_xof(ind["funding_promised_xof"])],
    ]
    t = Table(table, colWidths=[9.5 * cm, 6.5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F4FD8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9D1E6")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F6FD")]),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
            ]
        )
    )
    story += [Paragraph("Indicateurs clés", h2), t]
    if summary_data["observations"]:
        story.append(Paragraph("Observations (règles automatiques, non générées par IA)", h2))
        story += [Paragraph("• " + esc(o), body) for o in summary_data["observations"]]
    if summary_data["cohorts"]:
        rows = [["Cohorte", "Idées", "Sél.", "Proto.", "Progression", "Retards"]] + [
            [c["cohort"], c["ideas"], c["selected"], c["prototypes"], nd(c["average_progress_pct"], " %"), c["late"]]
            for c in summary_data["cohorts"]
        ]
        ct = Table(rows, colWidths=[5.5 * cm, 2 * cm, 2 * cm, 2 * cm, 3 * cm, 2 * cm])
        ct.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#5856D6")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9D1E6")),
                ]
            )
        )
        story += [Paragraph("Comparaison des cohortes", h2), ct]
    if summary_data["late_projects"]:
        rows = [["Projet en retard", "Cohorte", "Échéance", "Retard", "Prog."]] + [
            [
                Paragraph(esc(p["title"]), small),
                p["cohort"],
                p["deadline"].strftime("%d/%m/%Y"),
                f"{p['days_late']} j",
                f"{p['progress']} %",
            ]
            for p in summary_data["late_projects"]
        ]
        lt = Table(rows, colWidths=[7 * cm, 3.5 * cm, 2.5 * cm, 1.5 * cm, 1.5 * cm])
        lt.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#A15C00")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9D1E6")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story += [Paragraph("Projets en retard (5 premiers)", h2), lt]
    story.append(Paragraph("Limites des données", h2))
    story += [Paragraph("• " + esc(x), body) for x in summary_data["limits"]]
    doc.build(story)
    return buf.getvalue()


def build_png(projects, params, summary_data) -> bytes:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ts = services.timeseries(projects)
    status = [s for s in services.breakdown(projects, "status") if s["count"]]
    domains = services.breakdown(projects, "domain")
    cohorts = summary_data["cohorts"]
    ind = summary_data["indicators"]
    blue, indigo, violet, cyan = "#0A6CFF", "#5856D6", "#AF52DE", "#32ADE6"

    fig, axes = plt.subplots(2, 2, figsize=(14, 8), dpi=130)
    fig.suptitle(f"CIAT — synthèse ({summary_data['period']})", fontsize=16, fontweight="bold", x=0.02, ha="left")
    fig.text(
        0.02,
        0.925,
        f"{ind['ideas_received']} idées · {ind['projects_selected']} sélectionnés · {ind['late_projects']} en retard · "
        f"{_fmt_xof(ind['funding_obtained_xof'])} obtenus",
        fontsize=10,
        color="#555",
    )
    empty = ind["ideas_received"] == 0

    def blank(ax, title):
        ax.set_title(title, loc="left", fontsize=11, fontweight="bold")
        ax.text(0.5, 0.5, "Aucune donnée", ha="center", va="center", color="#777", transform=ax.transAxes)
        ax.set_xticks([])
        ax.set_yticks([])  # noqa: E702

    ax = axes[0][0]
    if ts:
        ax.plot([t["month"] for t in ts], [t["ideas"] for t in ts], color=blue, marker="o", label="Idées reçues")
        ax.plot([t["month"] for t in ts], [t["selected"] for t in ts], color=violet, marker="s", label="Sélectionnés")
        ax.set_title("Évolution mensuelle", loc="left", fontsize=11, fontweight="bold")
        ax.tick_params(axis="x", rotation=60, labelsize=7)
        ax.legend(frameon=False, fontsize=8)  # noqa: E702
        step = max(1, len(ts) // 12)
        for i, lab in enumerate(ax.get_xticklabels()):
            lab.set_visible(i % step == 0)
    else:
        blank(ax, "Évolution mensuelle")
    ax = axes[0][1]
    if status:
        ax.barh([s["label"] for s in status][::-1], [s["count"] for s in status][::-1], color=indigo)
        ax.set_title("Répartition par statut", loc="left", fontsize=11, fontweight="bold")
    else:
        blank(ax, "Répartition par statut")
    ax = axes[1][0]
    if domains:
        ax.barh([d["label"][:34] for d in domains][::-1], [d["count"] for d in domains][::-1], color=cyan)
        ax.set_title("Répartition par domaine", loc="left", fontsize=11, fontweight="bold")
        ax.tick_params(axis="y", labelsize=8)
    else:
        blank(ax, "Répartition par domaine")
    ax = axes[1][1]
    if cohorts:
        import numpy as np

        x = np.arange(len(cohorts))
        w = 0.27
        ax.bar(x - w, [c["ideas"] for c in cohorts], w, label="Idées", color=blue)
        ax.bar(x, [c["selected"] for c in cohorts], w, label="Sélectionnés", color=indigo)
        ax.bar(x + w, [c["prototypes"] for c in cohorts], w, label="Prototypes", color=violet)
        ax.set_xticks(x, [c["cohort"] for c in cohorts], fontsize=8)
        ax.set_title("Comparaison des cohortes", loc="left", fontsize=11, fontweight="bold")
        ax.legend(frameon=False, fontsize=8)  # noqa: E702
    else:
        blank(ax, "Comparaison des cohortes")
    for a in axes.flat:
        for side in ("top", "right"):
            a.spines[side].set_visible(False)
        a.grid(axis="both", color="#E3E8F4", linewidth=0.6)
        a.set_axisbelow(True)  # noqa: E702
    if empty:
        fig.text(0.5, 0.5, "Aucune donnée pour ces filtres", ha="center", fontsize=18, color="#999")
    fig.tight_layout(rect=(0, 0, 1, 0.91))
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    return buf.getvalue()
