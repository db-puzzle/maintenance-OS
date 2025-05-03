<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = [
        'routine_id',
        'description',
        'type',
        'options',
        'measurement_unit',
        'instruction_images',
        'code_reader_type',
        'code_reader_instructions',
        'file_upload_instructions'
    ];

    protected $casts = [
        'options' => 'array',
        'instruction_images' => 'array'
    ];

    public function routine()
    {
        return $this->belongsTo(Routine::class);
    }

    public function taskExecutions()
    {
        return $this->hasMany(TaskExecution::class);
    }
} 