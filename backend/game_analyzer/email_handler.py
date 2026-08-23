import resend
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend


class ResendHTTPBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        resend.api_key = settings.RESEND_API_KEY
        count = 0
        for message in email_messages:
            try:
                resend.Emails.send({
                    "from": message.from_email,
                    "to": message.to,
                    "subject": message.subject,
                    "html": message.body,
                })
                count += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return count