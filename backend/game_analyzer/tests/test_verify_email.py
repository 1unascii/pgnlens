import pytest
from rest_framework.test import APIClient


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