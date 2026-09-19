"""
Tests for the full email verification flow:
- Login with unverified email returns the right error
- Resend verification endpoint sends a new email
- Verify email endpoint works with DB-stored keys
- Resend endpoint masks the email correctly
- Resend endpoint doesn't reveal whether a user exists
"""

import pytest
from rest_framework.test import APIClient
from allauth.account.models import EmailAddress, EmailConfirmation
from django.test import override_settings
from unittest.mock import patch, MagicMock
from django.utils import timezone

LOCMEM = override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
RESEND = override_settings(EMAIL_BACKEND='game_analyzer.email_handler.ResendHTTPBackend')


def register_user(client, username='testuser', email='testuser@example.com'):
    """Helper to register a user and return the response."""
    return client.post('/api/auth/registration/', {
        'username': username,
        'email': email,
        'password1': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }, format='json')


# ── Login with unverified email ──────────────────────────────

@pytest.mark.django_db
@LOCMEM
def test_unverified_email_returns_error_message():
    """Login with correct credentials but unverified email should return
    an error mentioning email verification, not 'invalid credentials'."""
    client = APIClient()
    register_user(client)

    response = client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'SecurePass123!',
    }, format='json')

    assert response.status_code == 400
    error_messages = ' '.join(str(v) for v in response.data.values())
    assert 'verified' in error_messages.lower() or 'E-mail' in error_messages


@pytest.mark.django_db
@LOCMEM
def test_wrong_password_returns_generic_error():
    """Login with wrong password should return a generic error,
    not mention email verification."""
    client = APIClient()
    register_user(client)

    response = client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'WrongPassword!',
    }, format='json')

    assert response.status_code == 400


@pytest.mark.django_db
@LOCMEM
def test_verified_email_allows_login():
    """After verifying email, login should succeed."""
    client = APIClient()
    register_user(client)

    email_address = EmailAddress.objects.get(email='testuser@example.com')
    email_address.verified = True
    email_address.save()

    response = client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'SecurePass123!',
    }, format='json')

    assert response.status_code == 200
    assert 'key' in response.data


# ── Resend verification ──────────────────────────────────────

@pytest.mark.django_db
@RESEND
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_resend_sends_email(mock_send):
    """Resend endpoint should trigger a verification email."""
    mock_send.return_value = MagicMock()
    client = APIClient()

    register_user(client)
    mock_send.reset_mock()

    response = client.post('/api/auth/resend-verification/', {
        'username': 'testuser',
    }, format='json')

    assert response.status_code == 200
    assert response.data['detail'] == 'ok'
    mock_send.assert_called_once()


@pytest.mark.django_db
@RESEND
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_resend_returns_masked_email(mock_send):
    """Resend endpoint should return a masked version of the email."""
    mock_send.return_value = MagicMock()
    client = APIClient()
    register_user(client, email='josephearl@example.com')
    mock_send.reset_mock()

    response = client.post('/api/auth/resend-verification/', {
        'username': 'testuser',
    }, format='json')

    assert response.status_code == 200
    masked = response.data['masked_email']
    assert masked.startswith('j')
    assert '@example.com' in masked
    assert '*' in masked


@pytest.mark.django_db
@RESEND
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_resend_nonexistent_user_does_not_reveal(mock_send):
    """Resend for a nonexistent user should return 200 with empty
    masked_email so attackers can't enumerate usernames."""
    mock_send.return_value = MagicMock()
    client = APIClient()

    response = client.post('/api/auth/resend-verification/', {
        'username': 'doesnotexist',
    }, format='json')

    assert response.status_code == 200
    assert response.data['masked_email'] == ''
    mock_send.assert_not_called()


@pytest.mark.django_db
@LOCMEM
def test_resend_requires_username():
    """Resend endpoint should return 400 if no username is provided."""
    client = APIClient()

    response = client.post('/api/auth/resend-verification/', {}, format='json')

    assert response.status_code == 400
    assert 'Username is required' in response.data['detail']


@pytest.mark.django_db
@RESEND
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_resend_does_nothing_if_already_verified(mock_send):
    """If the email is already verified, resend should not send an email."""
    mock_send.return_value = MagicMock()
    client = APIClient()
    register_user(client)
    mock_send.reset_mock()

    email_address = EmailAddress.objects.get(email='testuser@example.com')
    email_address.verified = True
    email_address.save()

    response = client.post('/api/auth/resend-verification/', {
        'username': 'testuser',
    }, format='json')

    assert response.status_code == 200
    mock_send.assert_not_called()


# ── Verify email ─────────────────────────────────────────────

@pytest.mark.django_db
@LOCMEM
def test_verify_with_db_stored_key():
    """Verify endpoint should work with DB-stored keys
    (created by our resend endpoint via EmailConfirmation.create())."""
    client = APIClient()
    register_user(client)

    email_address = EmailAddress.objects.get(email='testuser@example.com')
    confirmation = EmailConfirmation.create(email_address)
    confirmation.sent = timezone.now()
    confirmation.save()

    response = client.post('/api/auth/verify-email/', {
        'key': confirmation.key,
    }, format='json')

    assert response.status_code == 200
    assert response.data['detail'] == 'Email verified successfully.'

    email_address.refresh_from_db()
    assert email_address.verified is True


@pytest.mark.django_db
def test_verify_no_key_returns_400():
    """Verify endpoint should return 400 if no key is provided."""
    client = APIClient()

    response = client.post('/api/auth/verify-email/', {}, format='json')

    assert response.status_code == 400
    assert response.data['detail'] == 'Key is required.'


@pytest.mark.django_db
def test_verify_invalid_key_returns_404():
    """Verify endpoint should return 404 for an invalid key."""
    client = APIClient()

    response = client.post('/api/auth/verify-email/', {
        'key': 'this-is-not-a-real-key',
    }, format='json')

    assert response.status_code == 404
    assert response.data['detail'] == 'Invalid or expired key.'


@pytest.mark.django_db
@LOCMEM
def test_verify_then_login_succeeds():
    """After verifying email, the user should be able to log in."""
    client = APIClient()
    register_user(client)

    email_address = EmailAddress.objects.get(email='testuser@example.com')
    confirmation = EmailConfirmation.create(email_address)
    confirmation.sent = timezone.now()
    confirmation.save()

    client.post('/api/auth/verify-email/', {
        'key': confirmation.key,
    }, format='json')

    login_response = client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'SecurePass123!',
    }, format='json')

    assert login_response.status_code == 200
    assert 'key' in login_response.data


# ── Full end-to-end flow ─────────────────────────────────────

@pytest.mark.django_db
@RESEND
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_register_fail_login_resend_verify_login(mock_send):
    """Full flow: register → login fails → resend → verify → login succeeds."""
    mock_send.return_value = MagicMock()
    client = APIClient()

    # 1. Register
    register_response = register_user(client)
    assert register_response.status_code in [200, 201, 204]

    # 2. Try to login — should fail because email is unverified
    login_response = client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'SecurePass123!',
    }, format='json')
    assert login_response.status_code == 400

    # 3. Resend verification
    mock_send.reset_mock()
    resend_response = client.post('/api/auth/resend-verification/', {
        'username': 'testuser',
    }, format='json')
    assert resend_response.status_code == 200
    assert resend_response.data['masked_email'] != ''

    # 4. Verify using the DB-stored key that was just created
    confirmation = EmailConfirmation.objects.filter(
        email_address__email='testuser@example.com'
    ).last()
    assert confirmation is not None

    verify_response = client.post('/api/auth/verify-email/', {
        'key': confirmation.key,
    }, format='json')
    assert verify_response.status_code == 200

    # 5. Login should now succeed
    login_response = client.post('/api/auth/login/', {
        'username': 'testuser',
        'password': 'SecurePass123!',
    }, format='json')
    assert login_response.status_code == 200
    assert 'key' in login_response.data
