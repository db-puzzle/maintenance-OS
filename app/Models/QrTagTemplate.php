<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrTagTemplate extends Model
{
    protected $fillable = [
        'name',
        'type',
        'layout',
        'is_default',
        'is_active',
        'created_by'
    ];

    protected $casts = [
        'layout' => 'array',
        'is_default' => 'boolean',
        'is_active' => 'boolean'
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}