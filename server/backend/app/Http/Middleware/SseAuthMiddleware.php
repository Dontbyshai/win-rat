<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class SseAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->query('token');

        if (! $token) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $accessToken = PersonalAccessToken::findToken($token);

        if (! $accessToken) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        // Set the authenticated user
        $request->setUserResolver(fn () => $accessToken->tokenable);

        return $next($request);
    }
}
