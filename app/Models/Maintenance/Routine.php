<?php

namespace App\Models\Maintenance;

use App\Models\Forms\Form;
use App\Models\AssetHierarchy\Asset;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Routine extends Model
{
    protected $fillable = ['name', 'trigger_hours', 'status', 'description'];

    protected $casts = [
        'trigger_hours' => 'integer'
    ];

    protected static function booted()
    {
        // Automatically create a form when a routine is created
        static::creating(function ($routine) {
            if (!$routine->form_id) {
                $form = Form::create([
                    'is_active' => true,
                    'created_by' => auth()->id() ?? null
                ]);
                $routine->form_id = $form->id;
            }
        });

        // Delete the associated form when the routine is deleted
        static::deleting(function ($routine) {
            if ($routine->form) {
                // Delete all form tasks first
                $routine->form->tasks()->delete();
                // Then delete the form
                $routine->form->delete();
            }
        });
    }

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(Asset::class, 'asset_routine')
            ->withTimestamps();
    }

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    public function routineExecutions(): HasMany
    {
        return $this->hasMany(RoutineExecution::class);
    }
} 