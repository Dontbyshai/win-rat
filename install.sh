#!/usr/bin/env bash

check_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Error: $1 is not installed"
        exit 1
    fi
}

echo "Starting installation..."

check_command php
check_command composer
check_command npm

cd ./server/frontend
mv ./.env.example ./.env
npm install

cd ./../backend
mv ./.env.example ./.env
composer install
php artisan migrate
php artisan db:seed

echo "Default Username:root Password:admin"
echo "Installation complete"