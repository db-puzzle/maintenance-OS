<?php

namespace App\Models\Maintenance;

use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\AssetHierarchy\Asset;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Routine extends Model
{
    protected $fillable = [
        'name', 
        'trigger_hours', 
        'status', 
        'description',
        'form_id',
        'active_form_version_id'
    ];

    protected $casts = [
        'trigger_hours' => 'integer'
    ];

    protected static function booted()
    {
        // Automatically create a form when a routine is created
        static::creating(function ($routine) {
            if (!$routine->form_id) {
                $form = Form::create([
                    'name' => $routine->name . ' - Form',
                    'description' => 'Form for routine: ' . $routine->name,
                    'is_active' => true,
                    'created_by' => auth()->id() ?? null
                ]);
                $routine->form_id = $form->id;
            }
        });

        // Delete the associated form when the routine is deleted
        static::deleting(function ($routine) {
            if ($routine->form) {
                // Delete all form versions and their tasks
                foreach ($routine->form->versions as $version) {
                    $version->tasks()->delete();
                }
                $routine->form->versions()->delete();
                
                // Delete draft tasks
                $routine->form->draftTasks()->delete();
                
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

    public function activeFormVersion(): BelongsTo
    {
        return $this->belongsTo(FormVersion::class, 'active_form_version_id');
    }

    public function routineExecutions(): HasMany
    {
        return $this->hasMany(RoutineExecution::class);
    }

    /**
     * Get the form version to use for new executions
     */
    public function getFormVersionForExecution(): ?FormVersion
    {
        // Use the routine's active version if set
        if ($this->active_form_version_id) {
            return $this->activeFormVersion;
        }

        // Otherwise use the form's current version
        return $this->form->currentVersion;
    }

    /**
     * Check if the routine has a published form version
     */
    public function hasPublishedForm(): bool
    {
        return $this->getFormVersionForExecution() !== null;
    }
} 