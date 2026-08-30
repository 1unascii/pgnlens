from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class CustomAccountAdapter(DefaultAccountAdapter):
    def get_email_confirmation_url(self, request, emailconfirmation):
        protocol = 'https' if request and request.is_secure() else 'https'
        domain = 'pgnlens.com'
        return f'{protocol}://{domain}/confirm-email/{emailconfirmation.key}/'
