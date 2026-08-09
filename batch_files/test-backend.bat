@echo off
start "" "C:\Program Files\Git\usr\bin\mintty.exe" --size 160,29 -e /bin/bash -l -c "cd /c/xampp/htdocs/pgnlens/backend && pipenv run pytest; exec bash -l"
