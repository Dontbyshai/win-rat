<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Audio extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'path',
        'target_id',
    ];
    
    public function target()
    {
        return $this->belongsTo(Target::class, 'target_id', 'machine_id');
    }
}
