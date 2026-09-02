#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR/server/backend"
php artisan serve --host=0.0.0.0 &
BACKEND_PID=$!

cd "$SCRIPT_DIR/server/frontend"
npm run dev &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "Stopping server..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

echo "Press Ctrl+C to stop"
wait