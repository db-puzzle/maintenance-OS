<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskExecution extends Model
{
    protected $fillable = ['routine_execution_id', 'task_id', 'executed_at', 'text_response', 'selected_option', 'measurement_values', 'photo_urls'];

    protected $casts = [
        'measurement_values' => 'array',
        'photo_urls' => 'array'
    ];

    public function routineExecution()
    {
        return $this->belongsTo(RoutineExecution::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
} 