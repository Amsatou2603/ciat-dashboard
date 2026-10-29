from django.contrib import admin

from .models import Cohort, Domain, Porteur, Project

admin.site.register([Cohort, Domain, Porteur, Project])
