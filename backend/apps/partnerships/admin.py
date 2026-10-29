from django.contrib import admin

from .models import Funding, Partner, Partnership

admin.site.register([Partner, Partnership, Funding])
