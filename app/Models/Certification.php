<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Certification extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'issuing_organization',
        'validity_period_days',
        'active',
    ];

    protected $casts = [
        'validity_period_days' => 'integer',
        'active' => 'boolean',
    ];

    /**
     * Scope a query to only include active certifications.
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Get users with this certification
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_certifications')
            ->withTimestamps()
            ->withPivot('issued_at', 'expires_at', 'certificate_number');
    }
} 