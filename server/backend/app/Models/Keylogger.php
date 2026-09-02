<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Keylogger extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'target_id',
        'command_id',
        'log',
        //'started_at',
        //'duration'
    ];

    public function target()
    {
        return $this->belongsTo(Target::class, 'target_id', 'machine_id');
    }
}
