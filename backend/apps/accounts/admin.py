from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CiatUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_active", "last_login")
    list_filter = ("role", "is_active")
    fieldsets = UserAdmin.fieldsets + (("Rôle CIAT", {"fields": ("role",)}),)
