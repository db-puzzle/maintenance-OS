<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    protected $fillable = [
        'name',
        'guard_name',
        'parent_role_id',
        'is_system'
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    /**
     * Parent role relationship
     */
    public function parentRole()
    {
        return $this->belongsTo(Role::class, 'parent_role_id');
    }

    /**
     * Child roles relationship
     */
    public function childRoles()
    {
        return $this->hasMany(Role::class, 'parent_role_id');
    }

    /**
     * Get all descendant roles
     */
    public function descendants()
    {
        $descendants = collect();
        
        foreach ($this->childRoles as $child) {
            $descendants->push($child);
            $descendants = $descendants->merge($child->descendants());
        }
        
        return $descendants;
    }

    /**
     * Get all ancestor roles
     */
    public function ancestors()
    {
        $ancestors = collect();
        
        if ($this->parentRole) {
            $ancestors->push($this->parentRole);
            $ancestors = $ancestors->merge($this->parentRole->ancestors());
        }
        
        return $ancestors;
    }

    /**
     * Check if role is a system role that cannot be deleted
     */
    public function isSystem(): bool
    {
        return $this->is_system;
    }

    /**
     * Get permissions count
     */
    public function getPermissionsCountAttribute(): int
    {
        return $this->permissions()->count();
    }

    /**
     * Get users count
     */
    public function getUsersCountAttribute(): int
    {
        return $this->users()->count();
    }

    /**
     * Scope to get only system roles
     */
    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    /**
     * Scope to get only non-system roles
     */
    public function scopeCustom($query)
    {
        return $query->where('is_system', false);
    }

    /**
     * Check if role can be deleted
     */
    public function canBeDeleted(): bool
    {
        return !$this->is_system && $this->users()->count() === 0;
    }

    /**
     * Get all effective permissions (including inherited from parent roles)
     */
    public function getAllEffectivePermissions()
    {
        $permissions = $this->permissions;
        
        // Add permissions from parent roles
        if ($this->parentRole) {
            $permissions = $permissions->merge($this->parentRole->getAllEffectivePermissions());
        }
        
        return $permissions->unique('id');
    }
}