"""
Production server for pgnlens using Waitress.
Runs on port 8002 so Apache can reverse proxy to it.
Start with: pipenv run python serve.py
"""
from waitress import serve
from pgnlens.wsgi import application

if __name__ == '__main__':
    print('PGNLens running on http://127.0.0.1:8002')
    serve(application, host='127.0.0.1', port=8002)
