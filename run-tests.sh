#!/bin/bash
cd "$(dirname "$0")"

echo "=== Backend Tests ==="
cd backend
pipenv run pytest
BACKEND_EXIT=$?

echo ""
echo "=== Frontend Tests ==="
cd ../frontend
npm test
FRONTEND_EXIT=$?

echo ""
if [ $BACKEND_EXIT -eq 0 ] && [ $FRONTEND_EXIT -eq 0 ]; then
    echo "=== All tests passed ==="
else
    echo "=== Some tests failed ==="
fi
