@echo off
start "" "C:\Program Files\Git\git-bash.exe" -c "cd /c/xampp/htdocs/pgnlens && pipenv run python backend/manage.py runserver 8002; exec bash"
