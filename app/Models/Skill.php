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
    ];

    protected $casts = [
    ];

    /**
     * Get users with this skill
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_skills')
            ->withTimestamps()
            ->withPivot('proficiency_level');
    }

    /**
     * Get the dependencies for this skill
     */
    public function getDependencies(): array
    {
        return [
            'users' => [
                'count' => $this->users()->count(),
                'label' => 'Usuários',
                'items' => $this->users()->limit(10)->get(['users.id', 'users.name'])->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                    ];
                })->toArray(),
            ],
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($skill) {
            if ($skill->users()->exists()) {
                throw new \Exception('Não é possível excluir uma habilidade que possui usuários vinculados.');
            }
        });
    }
} 