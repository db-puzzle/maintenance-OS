<?php

namespace App\Models\Maintenance;

use App\Models\Forms\Form;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Routine extends Model
{
    protected $fillable = ['maintenance_plan_id', 'form_id', 'name', 'trigger_hours', 'type'];

    protected $casts = [
        'trigger_hours' => 'integer',
        'type' => 'integer'
    ];
    
    const TYPE_INSPECTION = 1;
    const TYPE_MAINTENANCE_ROUTINE = 2;
    const TYPE_MAINTENANCE_REPORT = 3;

    public function maintenancePlan(): BelongsTo
    {
        return $this->belongsTo(MaintenancePlan::class);
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