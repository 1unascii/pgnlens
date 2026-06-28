# PGNLens

A chess opening analysis tool. Upload PGN files to analyze your games, identify weak openings, and practice specific lines.

## Prerequisites

- Python 3.14+ (python.org/downloads, check "Add to PATH" during install)
- Node.js 18+ (nodejs.org)
- PostgreSQL 17+ (postgresql.org/download/windows)
- pipenv (`pip install pipenv`)

## PostgreSQL Setup

1. Download and install from postgresql.org/download/windows
2. During install:
   - Keep the default port 5432
   - Set a password for the postgres user
   - Keep pgAdmin checked
   - Skip the Stack Builder at the end (uncheck or close it)
3. Open pgAdmin and create a database called `pgnlens`

## Environment Variables

This project uses `django-environ` to keep secrets out of the repo.

1. Install it:

```bash
pipenv install django-environ
```

2. Create a `.env` file in the project root:

```
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@127.0.0.1:5432/pgnlens
```

3. Add `.env` to `.gitignore` so it never gets committed:

```
.env
```

4. In `pgnlens/settings.py`, load the env file:

```python
import environ

env = environ.Env()
environ.Env.read_env()

DEBUG = env.bool('DEBUG', default=False)
SECRET_KEY = env('SECRET_KEY')

DATABASES = {
    'default': env.db(),
}
```

## Backend (Django)

```bash
cd pgnlens
pipenv install
pipenv shell
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8002
```

Django runs at http://localhost:8002

For production, use Waitress instead of the dev server:

```bash
python serve.py
```

## Frontend (React + TypeScript)

```bash
npm create vite@latest frontend -- --template react-ts
```

The dev server launches automatically after creation.
To relaunch in a new terminal:

```bash
cd frontend
npm run dev
```

React runs at http://localhost:5173

### Frontend Production Build

```bash
cd frontend
npm run build
```

## Vite Proxy

API requests from the frontend are proxied to Django.
Configure in `frontend/vite.config.ts`:

```ts
server: {
    proxy: {
        '/api': 'http://localhost:8002',
    },
},
```

## Running Both Servers

Terminal 1 — Django backend (development):

```bash
cd pgnlens
pipenv shell
python manage.py runserver 8002
```

Terminal 1 — Django backend (production):

```bash
cd pgnlens
pipenv shell
python serve.py
```

Terminal 2 — React frontend (development):

```bash
cd pgnlens/frontend
npm run dev
```

Terminal 2 — React frontend (production):

```bash
cd pgnlens/frontend
npm run build
```

## Stack

- Django + Django REST Framework
- React + TypeScript (Vite)
- PostgreSQL
- JWT authentication (djangorestframework-simplejwt)
