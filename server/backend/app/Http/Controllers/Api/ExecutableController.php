<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Executable;
use App\Models\Notification;
use App\Models\Target;
use Illuminate\Http\Request;

class ExecutableController extends Controller
{
    public function get(Request $request)
    {
        if ($request->filled('id') || auth('sanctum')->check())
        {
            $exe = Executable::first();
            $exe->path = asset($exe->path);

            if ($request->filled('id'))
            {
                if (!Target::where('machine_id', $data['id'])->first())
                {
                    return response()->json([]);
                }

                Notification::create([
                    'host' => $target->hostname . '\\' . $target->username,
                    'action' => 'Downloaded updated ' . $exe->name,
                    'read' => false,
                    'target_id' => $data['id']
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'success',
                'data' => $exe
            ]);
        }

        return response()->json([]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'exe' => 'required|file|mimes:exe',
        ]);

        $exe = $request->file('exe');

        // Sanitize filename
        $cleanedName = preg_replace('/[^A-Za-z0-9._-]/', '_', $exe->getClientOriginalName());
        
        $exe->move(public_path('uploads/executable'), $cleanedName);
        $path = 'uploads/executable/' . $exe->getClientOriginalName();

        // Generate hash (real path)
        $hash = hash_file('sha256', public_path($path));

        // Create or update record
        Executable::updateOrCreate(
            ['id' => 1],
            [
                'name' => $cleanedName,
                'path' => $path,
                'hash' => $hash,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => null,
        ]);
    }
}
