#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
daphne --http-timeout 600 -p 8002 backend.asgi:application
