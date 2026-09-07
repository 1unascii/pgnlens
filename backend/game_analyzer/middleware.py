from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware


@database_sync_to_async
def get_user_from_token(token_key):
    from rest_framework.authtoken.models import Token
    from django.contrib.auth.models import AnonymousUser
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware(BaseMiddleware):
    """Reads ?token=<authToken> from the WebSocket URL and sets scope['user']."""

    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser
        query_string = parse_qs(scope.get('query_string', b'').decode())
        token_key = query_string.get('token', [None])[0]
        if token_key:
            scope['user'] = await get_user_from_token(token_key)
        else:
            scope['user'] = AnonymousUser()
        return await super().__call__(scope, receive, send)
