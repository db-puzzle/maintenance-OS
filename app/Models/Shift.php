<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    protected $fillable = ['plant_id', 'name'];

    public function plant()
    {
        return $this->belongsTo(Plant::class);
    }

    public function schedules()
    {
        return $this->hasMany(ShiftSchedule::class);
    }
} 