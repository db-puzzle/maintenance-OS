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
    protected $fillable = ['form_id', 'name', 'trigger_hours', 'type', 'status', 'description'];

    protected $casts = [
        'trigger_hours' => 'integer',
        'type' => 'integer'
    ];
    
    const TYPE_INSPECTION = 1;
    const TYPE_MAINTENANCE_ROUTINE = 2;
    const TYPE_MAINTENANCE_REPORT = 3;

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
    
    /**
     * Get form type as string
     */
    public function getTypeTextAttribute(): string
    {
        return match($this->type) {
            self::TYPE_INSPECTION => 'Inspeção',
            self::TYPE_MAINTENANCE_ROUTINE => 'Rotina de Manutenção',
            self::TYPE_MAINTENANCE_REPORT => 'Relatório de Manutenção',
            default => 'Desconhecido'
        };
    }
} 