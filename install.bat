@echo off

echo Starting installation

call :check php
call :check composer
call :check npm

cd .\server\frontend
move .\.env.example .\.env
npm install

cd .\..\backend
move .\.env.example .\.env
composer install
php artisan migrate
php artisan db:seed

echo Default Username:root Password:admin
echo Installation complete

exit /b 0

:check
where %1 >nul 2>nul
if errorlevel 1 (
    echo Error: %1 is not installed
    exit /b 1
)