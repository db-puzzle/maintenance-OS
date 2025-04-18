<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoutineExecution extends Model
{
    protected $fillable = ['routine_id', 'equipment_id', 'triggered_at', 'completed_at', 'status', 'accumulated_hours_at_execution', 'completed_by_user_id', 'signature'];

    public function routine()
    {
        return $this->belongsTo(Routine::class);
    }

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }

    public function taskExecutions()
    {
        return $this->hasMany(TaskExecution::class);
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by_user_id');
    }
} 