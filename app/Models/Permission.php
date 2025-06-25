<?php

namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;
use Illuminate\Database\Eloquent\Builder;

class Permission extends SpatiePermission
{
    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'description',
        'sort_order',
        'entity_type',
        'entity_id',
        'is_dynamic',
        'metadata'
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'entity_id' => 'integer',
        'is_dynamic' => 'boolean',
        'metadata' => 'array'
    ];

    /**
     * Valid entity types for permissions
     */
    const ENTITY_TYPES = ['plant', 'area', 'sector', 'asset', 'system'];

    /**
     * Valid permission actions
     */
    const VALID_ACTIONS = ['view', 'create', 'update', 'delete', 'manage', 'execute', 'export', 'import', 'invite', 'execute-routines'];

    /**
     * Permission naming regex pattern
     */
    const PERMISSION_REGEX = '/^[a-z-]+\.(view|create|update|delete|manage|execute|export|import|invite|execute-routines)(\.[a-z]+\.[0-9]+)?$/';

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

    /**
     * Validate permission name format
     */
    public function validateName(): bool
    {
        return preg_match(self::PERMISSION_REGEX, $this->name) === 1;
    }

    /**
     * Check if this is a system-level permission
     */
    public function isSystemPermission(): bool
    {
        return str_starts_with($this->name, 'system.');
    }

    /**
     * Get permissions for a specific entity
     */
    public function scopeForEntity(Builder $query, string $entityType, int $entityId): Builder
    {
        return $query->where('entity_type', $entityType)
                    ->where('entity_id', $entityId);
    }

    /**
     * Get dynamic permissions only
     */
    public function scopeDynamic(Builder $query): Builder
    {
        return $query->where('is_dynamic', true);
    }

    /**
     * Get static permissions only
     */
    public function scopeStatic(Builder $query): Builder
    {
        return $query->where('is_dynamic', false);
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
        // Only system.create-plants is truly global in V2
        return $query->where('name', 'system.create-plants');
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
        // In V2, only system.create-plants is global
        return $this->name === 'system.create-plants' || 
               $this->name === 'system.bulk-import-assets' || 
               $this->name === 'system.bulk-export-assets';
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
     * Generate permissions for a newly created entity
     */
    public static function generateEntityPermissions(string $entityType, int $entityId, ?int $parentId = null): array
    {
        $permissions = [];
        
        switch ($entityType) {
            case 'plant':
                $permissions = [
                    "plants.view.{$entityId}",
                    "plants.update.{$entityId}",
                    "plants.delete.{$entityId}",
                    "plants.manage-shifts.{$entityId}",
                    "users.invite.plant.{$entityId}",
                    "areas.create.plant.{$entityId}",
                    "areas.viewAny.plant.{$entityId}",
                    "sectors.viewAny.plant.{$entityId}",
                    "sectors.create.plant.{$entityId}",
                    "assets.viewAny.plant.{$entityId}",
                    "assets.create.plant.{$entityId}",
                    "assets.manage.plant.{$entityId}",
                    "assets.execute-routines.plant.{$entityId}",
                    "assets.import.plant.{$entityId}",
                    "assets.export.plant.{$entityId}",
                    "shifts.viewAny.plant.{$entityId}",
                    "shifts.create.plant.{$entityId}",
                    "shifts.manage.plant.{$entityId}",
                    "asset-types.viewAny.plant.{$entityId}",
                    "asset-types.create.plant.{$entityId}",
                    "manufacturers.viewAny.plant.{$entityId}",
                    "manufacturers.create.plant.{$entityId}"
                ];
                break;
                
            case 'area':
                $permissions = [
                    "areas.view.{$entityId}",
                    "areas.update.{$entityId}",
                    "areas.delete.{$entityId}",
                    "users.invite.area.{$entityId}",
                    "sectors.create.area.{$entityId}",
                    "sectors.viewAny.area.{$entityId}",
                    "assets.viewAny.area.{$entityId}",
                    "assets.create.area.{$entityId}",
                    "assets.manage.area.{$entityId}",
                    "assets.execute-routines.area.{$entityId}",
                    "assets.export.area.{$entityId}"
                ];
                break;
                
            case 'sector':
                $permissions = [
                    "sectors.view.{$entityId}",
                    "sectors.update.{$entityId}",
                    "sectors.delete.{$entityId}",
                    "users.invite.sector.{$entityId}",
                    "assets.viewAny.sector.{$entityId}",
                    "assets.create.sector.{$entityId}",
                    "assets.manage.sector.{$entityId}",
                    "assets.execute-routines.sector.{$entityId}",
                    "assets.export.sector.{$entityId}"
                ];
                break;
                
            case 'asset':
                $permissions = [
                    "assets.view.{$entityId}",
                    "assets.update.{$entityId}",
                    "assets.manage.{$entityId}",
                    "assets.execute-routines.{$entityId}"
                ];
                break;
        }
        
        $created = [];
        foreach ($permissions as $permissionName) {
            $created[] = self::create([
                'name' => $permissionName,
                'guard_name' => 'web',
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'is_dynamic' => true,
                'metadata' => [
                    'parent_type' => $parentId ? self::getParentType($entityType) : null,
                    'parent_id' => $parentId,
                    'created_at' => now()->toIso8601String()
                ]
            ]);
        }
        
        return $created;
    }

    /**
     * Get parent entity type
     */
    private static function getParentType(string $entityType): ?string
    {
        return match($entityType) {
            'area' => 'plant',
            'sector' => 'area',
            'asset' => 'sector',
            default => null
        };
    }

    /**
     * Delete all permissions for an entity
     */
    public static function deleteEntityPermissions(string $entityType, int $entityId): int
    {
        return self::where('entity_type', $entityType)
                   ->where('entity_id', $entityId)
                   ->where('is_dynamic', true)
                   ->delete();
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