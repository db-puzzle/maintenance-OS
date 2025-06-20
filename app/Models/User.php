<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'timezone',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Convert a datetime from user's timezone to UTC
     */
    public function convertToUTC($datetime): Carbon
    {
        return Carbon::parse($datetime, $this->timezone ?? 'UTC')->setTimezone('UTC');
    }

    /**
     * Convert a datetime from UTC to user's timezone
     */
    public function convertFromUTC($datetime): Carbon
    {
        return Carbon::parse($datetime, 'UTC')->setTimezone($this->timezone ?? 'UTC');
    }

    /**
     * Get the routine executions performed by this user
     */
    public function executedRoutines(): HasMany
    {
        return $this->hasMany(\App\Models\Maintenance\RoutineExecution::class, 'executed_by');
    }

    /**
     * Get the execution exports created by this user
     */
    public function executionExports(): HasMany
    {
        return $this->hasMany(\App\Models\Maintenance\ExecutionExport::class);
    }
}
