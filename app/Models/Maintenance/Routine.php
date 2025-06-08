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
    protected $fillable = ['form_id', 'name', 'trigger_hours', 'status', 'description'];

    protected $casts = [
        'trigger_hours' => 'integer'
    ];

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