import os
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token


FIXTURE_DIR = os.path.join(
    os.path.dirname(__file__), 'fixtures'
)


@pytest.fixture
def user_a():
    user = User.objects.create_user(
        username='user_a',
        email='a@test.com',
        password='testpass123',
    )
    token = Token.objects.create(user=user)
    return user, token.key


@pytest.fixture
def user_b():
    user = User.objects.create_user(
        username='user_b',
        email='b@test.com',
        password='testpass123',
    )
    token = Token.objects.create(user=user)
    return user, token.key


@pytest.fixture
def client_a(user_a):
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f'Token {user_a[1]}'
    )
    return client


@pytest.fixture
def client_b(user_b):
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f'Token {user_b[1]}'
    )
    return client


def create_report(client, player_name='Alice'):
    """Helper: upload a PGN and create a report."""
    pgn_path = os.path.join(FIXTURE_DIR, 'test.pgn')
    with open(pgn_path, 'rb') as pgn_file:
        response = client.post(
            '/api/reports/',
            {
                'file': pgn_file,
                'player_name': player_name,
            },
            format='multipart',
        )
    return response


@pytest.mark.django_db
def test_user_can_create_report(client_a):
    response = create_report(client_a)
    assert response.status_code == 200
    assert 'report_id' in response.data


@pytest.mark.django_db
def test_user_can_list_own_reports(client_a):
    create_report(client_a)
    response = client_a.get('/api/reports/')
    assert response.status_code == 200
    assert len(response.data) == 1


@pytest.mark.django_db
def test_user_cannot_see_other_users_reports(
    client_a, client_b
):
    create_report(client_a)
    response = client_b.get('/api/reports/')
    assert response.status_code == 200
    assert len(response.data) == 0


@pytest.mark.django_db
def test_user_can_view_own_report(client_a):
    create_response = create_report(client_a)
    report_id = create_response.data['report_id']
    response = client_a.get(
        f'/api/reports/{report_id}/'
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_user_cannot_view_other_users_report(
    client_a, client_b
):
    create_response = create_report(client_a)
    report_id = create_response.data['report_id']
    response = client_b.get(
        f'/api/reports/{report_id}/'
    )
    assert response.status_code == 404


@pytest.mark.django_db
def test_user_can_delete_own_report(client_a):
    create_response = create_report(client_a)
    report_id = create_response.data['report_id']
    response = client_a.delete(
        f'/api/reports/{report_id}/'
    )
    assert response.status_code == 204


@pytest.mark.django_db
def test_user_cannot_delete_other_users_report(
    client_a, client_b
):
    create_response = create_report(client_a)
    report_id = create_response.data['report_id']
    response = client_b.delete(
        f'/api/reports/{report_id}/'
    )
    assert response.status_code == 404


@pytest.mark.django_db
def test_each_user_sees_only_own_reports(
    client_a, client_b
):
    create_report(client_a)
    create_report(client_a)
    create_report(client_b)

    response_a = client_a.get('/api/reports/')
    response_b = client_b.get('/api/reports/')

    assert len(response_a.data) == 2
    assert len(response_b.data) == 1