import pytest
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock
from django.test import override_settings


@pytest.mark.django_db
def test_verify_email_no_key():
    client = APIClient()
    response = client.post(
        '/api/auth/verify-email/',
        {},
        format='json',
    )
    assert response.status_code == 400
    assert response.data['detail'] == 'Key is required.'


@pytest.mark.django_db
def test_verify_email_invalid_key():
    client = APIClient()
    response = client.post(
        '/api/auth/verify-email/',
        {'key': 'invalid-key-12345'},
        format='json',
    )
    assert response.status_code == 404
    assert response.data['detail'] == (
        'Invalid or expired key.'
    )

# These tests force Django to use our custom Resend email handler
# (override_settings), then mock the actual Resend API call (patch)
# so no real emails are sent.

@pytest.mark.django_db
@override_settings(EMAIL_BACKEND='game_analyzer.email_handler.ResendHTTPBackend')
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_registration_sends_verification_email(mock_send):
    """Registration should trigger a verification email via Resend."""
    mock_send.return_value = MagicMock()
    client = APIClient()

    response = client.post('/api/auth/registration/', {
        'username': 'emailtest',
        'email': 'emailtest@example.com',
        'password1': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }, format='json')

    assert response.status_code in [200, 201, 204], \
        f"Registration failed: {response.data}"

    # Verify Resend was called
    mock_send.assert_called_once()

    # Check the email was sent to the right address
    call_args = mock_send.call_args[0][0]
    assert 'emailtest@example.com' in call_args['to']

    # Check the email contains a confirmation link
    assert 'confirm' in call_args['html'].lower()


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND='game_analyzer.email_handler.ResendHTTPBackend')
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_email_sent_from_correct_address(mock_send):
    """Email should be sent from the DEFAULT_FROM_EMAIL address."""
    mock_send.return_value = MagicMock()
    client = APIClient()

    client.post('/api/auth/registration/', {
        'username': 'fromtest',
        'email': 'fromtest@example.com',
        'password1': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }, format='json')

    mock_send.assert_called_once()
    call_args = mock_send.call_args[0][0]
    assert 'noreply' in call_args['from'] or 'pgnlens' in call_args['from']


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND='game_analyzer.email_handler.ResendHTTPBackend')
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_email_contains_confirmation_url(mock_send):
    """The verification email should contain a pgnlens.com confirmation URL."""
    mock_send.return_value = MagicMock()
    client = APIClient()

    client.post('/api/auth/registration/', {
        'username': 'urltest',
        'email': 'urltest@example.com',
        'password1': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }, format='json')

    mock_send.assert_called_once()
    call_args = mock_send.call_args[0][0]
    html_body = call_args['html']

    # Should contain the confirmation URL with a key
    assert 'confirm-email' in html_body


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND='game_analyzer.email_handler.ResendHTTPBackend')
@patch('game_analyzer.email_handler.resend.Emails.send', side_effect=Exception('API error'))
def test_email_failure_does_not_crash_registration(mock_send):
    """If Resend API fails, registration should still succeed (fail_silently)."""
    client = APIClient()

    response = client.post('/api/auth/registration/', {
        'username': 'failtest',
        'email': 'failtest@example.com',
        'password1': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }, format='json')

    # Registration should still work even if email fails
    assert response.status_code in [200, 201, 204], \
        f"Registration crashed when email failed: {response.status_code}"