<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftBreak extends Model
{
    use HasFactory;

    protected $fillable = [
        'shift_time_id',
        'start_time',
        'end_time',
    ];

    public function shiftTime(): BelongsTo
    {
        return $this->belongsTo(ShiftTime::class);
    }
}
