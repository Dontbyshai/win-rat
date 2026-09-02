@echo off

cd .\backend
start "Win-RAT Backend" cmd /k php artisan serve --host=0.0.0.0

cd .\..\frontend
start "Win-RAT Frontend" cmd /k npm run dev

echo Close Win-RAT Frontend and Backend windows to stop the server
pause