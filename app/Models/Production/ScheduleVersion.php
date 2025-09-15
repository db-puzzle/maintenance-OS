<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduleVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'version_number',
        'status',
        'published_by',
        'published_at',
        'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    /**
     * Get the user who created this schedule version.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who published this schedule version.
     */
    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    /**
     * Get the production schedules for this version.
     */
    public function productionSchedules(): HasMany
    {
        return $this->hasMany(ProductionSchedule::class);
    }

    /**
     * Get the alerts for this version.
     */
    public function alerts(): HasMany
    {
        return $this->hasMany(ScheduleAlert::class);
    }

    /**
     * Get the snapshots for this version.
     */
    public function snapshots(): HasMany
    {
        return $this->hasMany(ScheduleSnapshot::class);
    }

    /**
     * Check if this version is published.
     */
    public function isPublished(): bool
    {
        return $this->status === 'published';
    }

    /**
     * Check if this version is a draft.
     */
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    /**
     * Publish this schedule version.
     */
    public function publish(User $user): void
    {
        $this->status = 'published';
        $this->published_by = $user->id;
        $this->published_at = now();
        $this->save();
    }

    /**
     * Get the currently published schedule version.
     */
    public static function currentlyPublished(): ?self
    {
        return static::where('status', 'published')
            ->orderBy('published_at', 'desc')
            ->first();
    }

    /**
     * Generate the next version number.
     */
    public static function getNextVersionNumber(): int
    {
        return static::max('version_number') + 1 ?? 1;
    }
}