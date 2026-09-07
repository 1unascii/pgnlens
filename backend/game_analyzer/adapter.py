from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class CustomAccountAdapter(DefaultAccountAdapter):
    def get_email_confirmation_url(self, request, emailconfirmation):
        if settings.DEBUG:
            domain = 'localhost:5173'
            protocol = 'http'
        else:
            domain = 'pgnlens.com'
            protocol = 'https'
        return f'{protocol}://{domain}/confirm-email/{emailconfirmation.key}/'
