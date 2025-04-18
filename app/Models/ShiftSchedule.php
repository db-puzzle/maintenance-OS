<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShiftSchedule extends Model
{
    protected $fillable = ['shift_id', 'weekday', 'start_time', 'end_time'];

    public function shift()
    {
        return $this->belongsTo(Shift::class);
    }

    public function breaks()
    {
        return $this->hasMany(ShiftBreak::class);
    }
} 