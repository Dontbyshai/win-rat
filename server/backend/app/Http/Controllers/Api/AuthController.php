<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string'
        ]);

        $user = User::where('username', $data['username'])->first();
        if (!$user || !Hash::check($data['password'], $user->password))
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'Invalid username/password',
                'data' => null
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;
        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => [
                'username' => $user->username,
                'token' => $token,
                'createdAt' => $user->created_at,
                'updatedAt' => $user->updated_at
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();
        if (!$token)
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'failed',
                'data' => null
            ]);
        }

        $token->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => null
        ]);
    }

    public function updateUser(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'username' => 'sometimes|string',
            'password' => 'sometimes|string|min:8|confirmed'
        ]);

        if (isset($data['username'])) $user->username = $data['username'];
        if (isset($data['password'])) $user->password = bcrypt($data['password']);

        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => [
                'username' =>  $data['username'],
                'updatedAt' => $user->updated_at
            ]
        ]);
    }

    public function refresh(Request $request)
    {
        $bearerToken = $request->bearerToken();

        if (!$bearerToken) {
            return response()->json([
                'message' => 'No token provided',
            ], 401);
        }

        $accessToken = PersonalAccessToken::findToken($bearerToken);

        if (!$accessToken) {
            return response()->json([
                'message' => 'failed',
                'status' => 'unauthorized',
                'data' => null
            ], 401);
        }

        $refreshWindowDays = config('sanctum.refresh_window_days', 7);
        $expiration = config('sanctum.expiration');
        $tokenCreatedAt = $accessToken->created_at;
        $expiresAt = $tokenCreatedAt->addMinutes($expiration);
        $refreshDeadline = $expiresAt->addDays($refreshWindowDays);

        if (now()->gt($refreshDeadline)) {
            return response()->json([
                'message' => 'failed',
                'status' => 'unauthorized',
                'data' => null
            ], 401);
        }

        $user = $accessToken->tokenable;
        $accessToken->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'success',
            'status' => 'success',
            'data' => [
                'token' => $token
            ]
        ]);
    }
}
