# PGNLens

A chess game analysis tool. Upload PGN files, generate
reports on your opening performance, and review
individual games with board replay.

Built with Django REST Framework (backend) and
React + TypeScript (frontend).

## Prerequisites

- Python 3.14+
- Node.js 18+
- PostgreSQL 17+
- pipenv (`pip install pipenv`)

## Setup

### 1. Clone the repo

```bash
git clone <repo-url>
cd pgnlens
```

### 2. Create the .env file

Create a `.env` file in the project root:

```
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/pgnlens
RESEND_API_KEY=re_your_api_key_here
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
EMAIL_HOST_USER=resend
```

The Resend settings are for email verification. If you
don't have a Resend account, switch to the console
backend in `backend/backend/settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

and comment out the SMTP settings below it.
Verification links will print to the terminal instead
of being emailed.

Generate a secret key with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Create the database

```bash
psql -U postgres -c "CREATE DATABASE pgnlens;"
```

### 4. Install backend dependencies

```bash
cd backend
pipenv install --dev
```

### 5. Run migrations

```bash
pipenv run python manage.py migrate
```

### 6. Create a superuser

```bash
pipenv run python manage.py createsuperuser
```

### 7. Install frontend dependencies

```bash
cd ../frontend
npm install
```

## Running the dev servers

Start both servers in separate terminals:

**Backend** (port 8002):

```bash
cd backend
pipenv run python manage.py runserver 8002
```

**Frontend** (port 5173):

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in the browser. The Vite
dev server proxies `/api/*` requests to Django on
port 8002.

## Running tests

**Backend:**

```bash
cd backend
pipenv run pytest
```

**Frontend:**

```bash
cd frontend
npm test
```

## Project structure

```
pgnlens/
    .env
    backend/
        backend/
            settings.py
            urls.py
        game_analyzer/
            models.py
            views.py
            serializers.py
            pgn_parser.py
            adapter.py
            tests/
        eco/
    frontend/
        public/
            data/
                eco.json
            piece/
            sound/
        src/
            components/
            pages/
            utils/
            types.ts
            App.tsx
        vite.config.ts
        package.json
```

## API endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/games/ | List all games |
| GET | /api/games/?report=ID | List games for a report |
| GET | /api/games/ID/ | Game detail with moves |
| GET | /api/reports/ | List user's reports |
| POST | /api/reports/ | Upload PGN + create report |
| DELETE | /api/reports/ID/ | Delete a report |
| POST | /api/auth/login/ | Login |
| POST | /api/auth/logout/ | Logout |
| POST | /api/auth/registration/ | Register |
| POST | /api/auth/verify-email/ | Verify email |
| GET | /api/auth/user/ | Current user info |

## Authentication

Uses dj-rest-auth with django-allauth. Token-based
authentication. Login accepts username or email.
Email verification is mandatory.

Reports are scoped to the authenticated user.
Games are public.

## Stack

- Django + Django REST Framework
- React + TypeScript (Vite)
- Tailwind CSS
- PostgreSQL
- Token authentication (dj-rest-auth + django-allauth)
- Resend (email verification)
- Vitest (frontend tests)
- pytest (backend tests)
