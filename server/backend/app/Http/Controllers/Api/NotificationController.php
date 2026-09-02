<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Target;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::where('read', false)
                ->select('action', 'host', 'read')
                ->get();

        $notifications->each(function ($notification) {
            $notification->update(['read' => true]);
        });

        $notifications->makeHidden('read');

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $notifications
        ]);
    }

    public function stream(Request $request): StreamedResponse
    {
        return response()->stream(function () {
            $lastCheck = now();
            $lastId = Notification::max('id') ?? 0;
            $heartbeatInterval = 15; // Send heartbeat every 15 seconds
            $lastHeartbeat = time();
            $maxRuntime = 55; // Close connection after 55 seconds (before typical 60s timeout)
            $startTime = time();

            // Disable output buffering for real-time streaming
            if (ob_get_level()) {
                ob_end_clean();
            }

            while (true) {
                $notifications = Notification::where('read', false)
                    ->select('action', 'host', 'read')
                    ->get();

                $notifications->each(function ($notification) {
                    $notification->update(['read' => true]);
                });

                $notifications->makeHidden('read');

                foreach ($notifications as $notification) {
                    echo 'data: '.json_encode($notification)."\n\n";
                    flush();
                    $lastId = $notification->id;
                }

                // Send heartbeat to keep connection alive
                if (time() - $lastHeartbeat >= $heartbeatInterval) {
                    echo ": heartbeat\n\n";
                    flush();
                    $lastHeartbeat = time();
                }

                // Close connection after max runtime (client will reconnect)
                if (time() - $startTime >= $maxRuntime) {
                    echo "event: reconnect\ndata: {}\n\n";
                    flush();
                    break;
                }

                if (connection_aborted()) {
                    break;
                }

                // Sleep for 2 seconds between checks (reduces CPU/DB load)
                sleep(2);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET',
            'Access-Control-Allow-Headers' => '*',
        ]);
    }
}
