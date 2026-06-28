# PGNLens

A chess opening analysis tool. Upload PGN files to analyze your games, identify weak openings, and practice specific lines.

## Setup

### Prerequisites
- Python 3.14+
- Node.js 18+
- pipenv (`pip install pipenv`)

### Backend (Django)

```bash
cd pgnlens
pipenv install
pipenv shell
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8002
```

Django runs at http://localhost:8002

### Frontend (React + TypeScript)

```bash
cd frontend
npm install
npm run dev
```

React runs at http://localhost:5173

### Vite Proxy

API requests from the frontend are proxied to Django.
Configure in `frontend/vite.config.ts`:

```ts
server: {
    proxy: {
        '/api': 'http://localhost:8002',
    },
},
```

## Tech Stack
- Django + Django REST Framework
- React + TypeScript (Vite)
- SQLite (development) / PostgreSQL (production)
- JWT authentication (djangorestframework-simplejwt)
