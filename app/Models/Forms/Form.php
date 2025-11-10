<?php

namespace App\Models\Forms;

use App\Models\Maintenance\Routine;
use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Form extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the routine that uses this form.
     */
    public function routine(): HasOne
    {
        return $this->hasOne(Routine::class);
    }

    /**
     * Get the work orders that use this form.
     */
    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    /**
     * Get the user who created this form.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    /**
     * Get all tasks for this form.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(FormTask::class)->orderBy('position');
    }

    /**
     * Check if form is used in active routines.
     */
    public function isUsedInActiveRoutines(): bool
    {
        return $this->routine()
            ->where('status', 'Active')
            ->exists();
    }
}
