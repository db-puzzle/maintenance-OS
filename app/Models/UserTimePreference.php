<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserTimePreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'entity_type',
        'entity_id',
        'display_mode',
        'time_scale',
    ];

    protected $casts = [
        'entity_id' => 'integer',
    ];

    /**
     * Get the user that owns the preference.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for global preferences.
     */
    public function scopeGlobal($query)
    {
        return $query->where('entity_type', 'global')->whereNull('entity_id');
    }

    /**
     * Scope for work cell preferences.
     */
    public function scopeWorkCell($query, ?int $workCellId = null)
    {
        $query->where('entity_type', 'work_cell');

        if ($workCellId !== null) {
            $query->where('entity_id', $workCellId);
        }

        return $query;
    }
}
