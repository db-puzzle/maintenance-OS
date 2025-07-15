<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Skill extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'category',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Scope a query to only include active skills.
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Get users with this skill
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_skills')
            ->withTimestamps()
            ->withPivot('proficiency_level', 'certified_at');
    }
} 