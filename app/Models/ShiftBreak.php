<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftBreak extends Model
{
    protected $fillable = [
        'shift_time_id',
        'start_time',
        'end_time'
    ];

    public function shiftTime(): BelongsTo
    {
        return $this->belongsTo(ShiftTime::class);
    }
} 