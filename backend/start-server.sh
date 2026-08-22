#!/bin/bash
cd "$(dirname "$0")"
pipenv run python manage.py runserver 8002
