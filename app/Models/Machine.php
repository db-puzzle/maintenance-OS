<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Machine extends Model
{
    protected $fillable = [
        'name',
        'description',
        'machine_type_id',
    ];

    public function machineType()
    {
        return $this->belongsTo(MachineType::class);
    }
} 