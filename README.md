# PGNLens

A chess opening analysis tool. Upload PGN files to analyze your games, identify weak openings, and practice specific lines.

## Setup

### Requirements

- Python 3.14+
- Node.js 18+
- PostgreSQL 17+
- pipenv (`pip install pipenv`)

### Install

```bash
cd pgnlens
pipenv install
cd frontend
npm install
```

### Development

Terminal 1 — Backend:

```bash
cd pgnlens
pipenv shell
cd backend
python manage.py migrate
python manage.py runserver 8002
```

Terminal 2 — Frontend:

```bash
cd pgnlens/frontend
npm run dev
```

### Production

```bash
cd pgnlens
pipenv shell
cd backend
python manage.py migrate
python manage.py createsuperuser
python serve.py
```

```bash
cd pgnlens/frontend
npm run build
```

### Environment

Create `backend/.env`:

```
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@127.0.0.1:5432/pgnlens
```

## Project Structure

```
pgnlens/
├── backend/
│   ├── manage.py
│   ├── backend/         ← settings
│   └── games/           ← app
├── frontend/
│   └── src/             ← React + TypeScript
└── wireframe/
```

## Stack

- Django + Django REST Framework
- React + TypeScript (Vite)
- PostgreSQL
- JWT authentication
