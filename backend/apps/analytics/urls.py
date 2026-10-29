from django.urls import path

from . import views

urlpatterns = [
    path("filter-options/", views.FilterOptionsView.as_view()),
    path("indicators/", views.IndicatorsView.as_view()),
    path("timeseries/", views.TimeseriesView.as_view()),
    path("breakdown/", views.BreakdownView.as_view()),
    path("cohorts/", views.CohortsView.as_view()),
    path("progress/", views.ProgressView.as_view()),
    path("late/", views.LateView.as_view()),
    path("partnerships/", views.PartnershipsView.as_view()),
    path("funding/", views.FundingView.as_view()),
    path("summary/", views.SummaryView.as_view()),
    path("annual-budgets/", views.AnnualBudgetsView.as_view()),
    path("export/<str:fmt>/", views.ExportView.as_view()),
]
