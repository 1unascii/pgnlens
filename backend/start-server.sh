#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
daphne --http-timeout 300 -p 8002 backend.asgi:application
