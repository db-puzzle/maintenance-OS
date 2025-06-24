<?php

namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'description',
        'sort_order'
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    /**
     * Parse the permission name to extract components
     * Example: 'assets.create.plant.123' => ['resource' => 'assets', 'action' => 'create', 'scope' => 'plant', 'scope_id' => '123']
     */
    public function parsePermission(): array
    {
        $parts = explode('.', $this->name);
        
        return [
            'resource' => $parts[0] ?? null,
            'action' => $parts[1] ?? null,
            'scope' => $parts[2] ?? null,
            'scope_id' => $parts[3] ?? null,
        ];
    }

    public function scopeForResource($query, string $resource)
    {
        return $query->where('name', 'like', $resource . '.%');
    }

    public function scopeForAction($query, string $resource, string $action)
    {
        return $query->where('name', 'like', $resource . '.' . $action . '%');
    }

    public function scopeGlobal($query)
    {
        return $query->where('name', 'not like', '%.%.%');
    }

    public function scopeScoped($query)
    {
        return $query->where('name', 'like', '%.%.%');
    }

    public function getResourceAttribute(): ?string
    {
        return $this->parsePermission()['resource'];
    }

    public function getActionAttribute(): ?string
    {
        return $this->parsePermission()['action'];
    }

    public function getScopeTypeAttribute(): ?string
    {
        return $this->parsePermission()['scope'];
    }

    public function getScopeIdAttribute(): ?string
    {
        return $this->parsePermission()['scope_id'];
    }

    public function isGlobal(): bool
    {
        return !str_contains($this->name, '.owned') && count(explode('.', $this->name)) === 2;
    }

    public function isScoped(): bool
    {
        return str_contains($this->name, '.plant.') || 
               str_contains($this->name, '.area.') || 
               str_contains($this->name, '.sector.') ||
               str_contains($this->name, '.asset.');
    }

    public function isOwnershipBased(): bool
    {
        return str_contains($this->name, '.owned');
    }

    /**
     * Get roles count for this permission
     */
    public function getRolesCountAttribute(): int
    {
        return $this->roles()->count();
    }

    /**
     * Get users count for this permission (direct assignments + through roles)
     */
    public function getUsersCountAttribute(): int
    {
        return $this->users()->count() + 
               $this->roles()->with('users')->get()->sum(fn($role) => $role->users->count());
    }
}