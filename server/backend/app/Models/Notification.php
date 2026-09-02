<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'host',
        'action',
        'read',
        'target_id',
    ];
    
    public function target()
    {
        return $this->belongsTo(Target::class, 'target_id', 'machine_id');
    }
}
