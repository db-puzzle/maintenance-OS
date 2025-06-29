<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    protected $fillable = [
        'name',
        'guard_name',
        'parent_role_id',
        'is_system',
        'is_administrator',
        'display_name',
        'description'
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'is_administrator' => 'boolean',
    ];

    /**
     * Administrator role ID constant for consistency
     */
    const ADMINISTRATOR_ROLE_ID = 1;

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
     * Check if this is the Administrator role
     */
    public function isAdministrator(): bool
    {
        return $this->is_administrator;
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
     * Scope to get the Administrator role
     */
    public function scopeAdministrator($query)
    {
        return $query->where('is_administrator', true);
    }

    /**
     * Check if role can be deleted
     */
    public function canBeDeleted(): bool
    {
        // Administrator role can never be deleted
        if ($this->is_administrator) {
            return false;
        }
        
        return !$this->is_system && $this->users()->count() === 0;
    }

    /**
     * Check if role can be modified
     */
    public function canBeModified(): bool
    {
        // Administrator role permissions cannot be modified
        return !$this->is_administrator;
    }

    /**
     * Get all effective permissions (including inherited from parent roles)
     */
    public function getAllEffectivePermissions()
    {
        // Administrator role has all permissions implicitly
        if ($this->is_administrator) {
            return Permission::all();
        }
        
        $permissions = $this->permissions;
        
        // Add permissions from parent roles
        if ($this->parentRole) {
            $permissions = $permissions->merge($this->parentRole->getAllEffectivePermissions());
        }
        
        return $permissions->unique('id');
    }

    /**
     * Get the Administrator role
     */
    public static function getAdministratorRole(): ?self
    {
        return self::where('is_administrator', true)->first();
    }

    /**
     * Ensure at least one Administrator exists
     */
    public static function ensureAdministratorExists(): bool
    {
        $adminRole = self::getAdministratorRole();
        
        if (!$adminRole) {
            return false;
        }
        
        return $adminRole->users()->exists();
    }
}