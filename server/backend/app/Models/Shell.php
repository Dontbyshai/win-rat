<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shell extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'target_id',
        'command_id',
        'output',
    ];

    public function target()
    {
        return $this->belongsTo(Target::class, 'target_id', 'machine_id');
    }
}
