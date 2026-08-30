#!/bin/bash
# Deploy PGNLens on the production server.
# Run from the project root: ./deploy.sh

set -e

echo "=== Pulling latest code ==="
cd /var/www/pgnlens
git pull

echo "=== Building frontend ==="
cd frontend
npm run build

echo "=== Collecting static files ==="
cd ../backend
pipenv run python manage.py collectstatic --noinput --clear

echo "=== Running migrations ==="
pipenv run python manage.py migrate --run-syncdb

echo "=== Restarting server ==="
sudo systemctl restart pgnlens

echo "=== Done! ==="
