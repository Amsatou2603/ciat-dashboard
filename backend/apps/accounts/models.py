from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "Administrateur"
    COORDINATOR = "coordinator", "Coordonnateur du CIAT"
    ANALYST = "analyst", "Analyste"
    READER = "reader", "Lecteur"


class CiatUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        # Un superutilisateur créé en ligne de commande est un administrateur de l'application (sinon il serait « Lecteur »).
        extra_fields.setdefault("role", Role.ADMIN)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    # Le rôle n'est modifiable que via l'API d'administration des utilisateurs.
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.READER)
    email = models.EmailField(unique=True, blank=True, null=True)

    objects = CiatUserManager()

    class Meta:
        ordering = ["username"]

    def save(self, *args, **kwargs):
        if self.email == "":
            self.email = None  # unicité compatible avec plusieurs comptes sans e-mail
        super().save(*args, **kwargs)
