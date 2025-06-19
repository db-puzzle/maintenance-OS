<?php

namespace App\Models\AssetHierarchy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShiftTime extends Model
{
    protected $fillable = [
        'shift_schedule_id',
        'start_time',
        'end_time',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ShiftSchedule::class, 'shift_schedule_id');
    }

    public function breaks(): HasMany
    {
        return $this->hasMany(ShiftBreak::class);
    }
}
