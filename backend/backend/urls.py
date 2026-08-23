"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from game_analyzer.views import (
    GameViewSet, ReportViewSet, verify_email,
    analyze_game,
)
from django.views.generic import TemplateView

# DefaultRouter auto-generates URL routes for all registered viewsets
# and provides a browsable API root at /api/
router = routers.DefaultRouter()
router.register(r'games', GameViewSet)  # /api/games/
router.register(r'reports', ReportViewSet)  # /api/reports/ (POST here uploads a PGN)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/verify-email/', verify_email),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/games/<int:game_id>/analyze/', analyze_game),
    # Catch-all: serve React app for any non-API
    # route. MUST be last or it intercepts API
    # requests.
    path('', TemplateView.as_view(template_name='index.html')),
    path('<path:path>', TemplateView.as_view(template_name='index.html')),
]
