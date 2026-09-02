<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Livestream;
use Illuminate\Http\Request;

class LivestreamController extends Controller
{
    public function answer(Request $request)
    {
        $data = $request->validate([
            'id' => 'required',
            'sdp' => 'required|string'
        ]);

        $stream = Livestream::where('id', $data['id'])->first();
        if (!$stream)
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'failed',
                'data' => null
            ]);
        }

        $stream->answer = $data['sdp'];
        $stream->save();

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => null
        ]);
    }

    public function offer(Request $request)
    {
        $data = $request->validate([
            'id' => 'required',
            'machine_id' => 'required|string',
            'sdp' => 'required|string'
        ]);

        $stream = Livestream::where('id', $data['id'])
                            ->where('target_id', $data['machine_id'])
                            ->first();
        if (!$stream)
        {
            return response()->json([]);
        }

        $stream->offer = $data['sdp'];
        $stream->save();

        return response()->json([]);
    }

    public function clientIce(Request $request)
    {
        $data = $request->validate([
            'id' => 'required',
            'machine_id' => 'required|string',
            'candidate' => 'required|array'
        ]);

        $stream = Livestream::where('id', $data['id'])
                            ->where('target_id', $data['machine_id'])
                            ->first();
        if (!$stream)
        {
            return response()->json([]);
        }

        // client_ice is ALWAYS an array because of $casts
        $existingCandidates = $stream->client_ice ?? [];

        // Append new candidates
        $stream->client_ice = array_merge(
            $existingCandidates,
            $data['candidate']
        );

        return response()->json([]);
    }

    public function serverIce(Request $request)
    {
        $data = $request->validate([
            'id' => 'required',
            'candidate' => 'required|array'
        ]);

        $stream = Livestream::where('id', $data['id'])->first();
        if (!$stream)
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'failed',
                'data' => null
            ]);
        }

        $existingCandidates = $stream->admin_ice ?? [];

        $stream->admin_ice = array_merge(
            $existingCandidates,
            $data['candidate']
        );

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => null
        ]);
    }

    public function session(Request $request)
    {
        $data = $request->validate([
            'id' => 'required',
            'target_id' => 'required|string'
        ]);

        $stream = Livestream::where('id', $data['id'])
                            ->where('target_id', $data['target_id'])
                            ->whereNull('ended_at')
                            ->orderBy('id', 'desc')
                            ->first(['offer', 'answer', 'client_ice', 'admin_ice']);
        if (!$stream)
        {
            return response()->json([]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $stream
        ]);
    }
}
