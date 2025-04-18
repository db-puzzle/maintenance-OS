<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Routine extends Model
{
    protected $fillable = ['maintenance_plan_id', 'name', 'trigger_hours'];

    public function maintenancePlan()
    {
        return $this->belongsTo(MaintenancePlan::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function routineExecutions()
    {
        return $this->hasMany(RoutineExecution::class);
    }
} 