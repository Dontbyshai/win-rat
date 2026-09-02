<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Livestream extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'target_id',
        'terminated',
        'requested',
        'offer',
        'answer',
        'client_ice',
        'admin_ice',
        'started_at',
        'ended_at'
    ];

    protected $casts = [
        'client_ice' => 'array',
        'admin_ice' => 'array'
    ];

    public function target()
    {
        return $this->belongsTo(Target::class, 'target_id', 'machine_id');
    }
}
