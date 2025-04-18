<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShiftBreak extends Model
{
    protected $fillable = [
        'shift_schedule_id',
        'start_time',
        'end_time',
    ];

    public function shiftSchedule()
    {
        return $this->belongsTo(ShiftSchedule::class);
    }
} 