from django.urls import path

from . import views

urlpatterns = [
    path("ask/", views.AskView.as_view()),
    path("status/", views.StatusView.as_view()),
    path("history/", views.HistoryView.as_view()),
]
