<?php

namespace App\Services;

use App\Models\User;
use App\Models\Permission;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Asset;
use Illuminate\Support\Facades\DB;

class PermissionValidationService
{
    protected PermissionHierarchyService $permissionHierarchyService;
    
    public function __construct(PermissionHierarchyService $permissionHierarchyService)
    {
        $this->permissionHierarchyService = $permissionHierarchyService;
    }

    /**
     * Validate permission name format
     */
    public function validatePermissionName(string $name): array
    {
        $errors = [];
        
        // Check format against regex
        if (!preg_match(Permission::PERMISSION_REGEX, $name)) {
            $errors[] = "Permission name '{$name}' does not match required format";
        }
        
        // Check length
        if (strlen($name) > 255) {
            $errors[] = "Permission name exceeds maximum length of 255 characters";
        }
        
        // Parse permission
        $parts = explode('.', $name);
        
        // Validate action
        if (isset($parts[1]) && !in_array($parts[1], Permission::VALID_ACTIONS)) {
            $errors[] = "Invalid action '{$parts[1]}'. Must be one of: " . implode(', ', Permission::VALID_ACTIONS);
        }
        
        // Validate entity scope if present
        if (count($parts) >= 4) {
            $scope = $parts[2];
            $entityId = $parts[3];
            
            if (!in_array($scope, ['plant', 'area', 'sector', 'asset'])) {
                $errors[] = "Invalid scope '{$scope}'. Must be one of: plant, area, sector, asset";
            }
            
            if (!is_numeric($entityId)) {
                $errors[] = "Entity ID must be numeric, got '{$entityId}'";
            }
        }
        
        return $errors;
    }
    
    /**
     * Validate entity exists and matches type
     */
    public function validateEntityExists(string $entityType, int $entityId): bool
    {
        return match($entityType) {
            'plant' => Plant::where('id', $entityId)->exists(),
            'area' => Area::where('id', $entityId)->exists(),
            'sector' => Sector::where('id', $entityId)->exists(),
            'asset' => Asset::where('id', $entityId)->exists(),
            default => false
        };
    }
    
    /**
     * Validate permission entity mapping
     */
    public function validatePermissionEntity(string $permissionName, ?string $entityType, ?int $entityId): array
    {
        $errors = [];
        $parts = explode('.', $permissionName);
        
        // System permissions don't need entity validation
        if (str_starts_with($permissionName, 'system.')) {
            if ($entityType !== 'system' && $entityType !== null) {
                $errors[] = "System permissions should have entity_type 'system' or null";
            }
            return $errors;
        }
        
        // Parse scope from permission name
        if (count($parts) >= 4) {
            $permScope = $parts[2];
            $permEntityId = (int) $parts[3];
            
            // Validate entity type matches permission scope
            if ($entityType && $entityType !== $permScope) {
                $errors[] = "Entity type '{$entityType}' does not match permission scope '{$permScope}'";
            }
            
            // Validate entity ID matches permission
            if ($entityId && $entityId !== $permEntityId) {
                $errors[] = "Entity ID '{$entityId}' does not match permission entity ID '{$permEntityId}'";
            }
            
            // Validate entity exists
            if (!$this->validateEntityExists($permScope, $permEntityId)) {
                $errors[] = "Entity {$permScope} with ID {$permEntityId} does not exist";
            }
        } elseif (count($parts) === 3 && is_numeric($parts[2])) {
            // Direct entity permissions (e.g., plants.view.123)
            $resource = $parts[0];
            $entityIdFromPerm = (int) $parts[2];
            
            // Determine expected entity type from resource
            $expectedType = match($resource) {
                'plants' => 'plant',
                'areas' => 'area',
                'sectors' => 'sector',
                'assets' => 'asset',
                default => null
            };
            
            if ($expectedType) {
                if ($entityType && $entityType !== $expectedType) {
                    $errors[] = "Entity type '{$entityType}' does not match expected type '{$expectedType}' for resource '{$resource}'";
                }
                
                if ($entityId && $entityId !== $entityIdFromPerm) {
                    $errors[] = "Entity ID '{$entityId}' does not match permission entity ID '{$entityIdFromPerm}'";
                }
                
                if (!$this->validateEntityExists($expectedType, $entityIdFromPerm)) {
                    $errors[] = "Entity {$expectedType} with ID {$entityIdFromPerm} does not exist";
                }
            }
        }
        
        return $errors;
    }
    
    /**
     * Validate all permissions in database
     */
    public function validateAllPermissions(): array
    {
        $results = [
            'total' => 0,
            'valid' => 0,
            'invalid' => 0,
            'errors' => []
        ];
        
        $permissions = Permission::all();
        $results['total'] = $permissions->count();
        
        foreach ($permissions as $permission) {
            $errors = [];
            
            // Validate name format
            $nameErrors = $this->validatePermissionName($permission->name);
            if (!empty($nameErrors)) {
                $errors = array_merge($errors, $nameErrors);
            }
            
            // Validate entity mapping
            $entityErrors = $this->validatePermissionEntity(
                $permission->name,
                $permission->entity_type,
                $permission->entity_id
            );
            if (!empty($entityErrors)) {
                $errors = array_merge($errors, $entityErrors);
            }
            
            if (empty($errors)) {
                $results['valid']++;
            } else {
                $results['invalid']++;
                $results['errors'][$permission->id] = [
                    'permission' => $permission->name,
                    'errors' => $errors
                ];
            }
        }
        
        return $results;
    }
    
    /**
     * Clean up orphaned permissions (permissions for non-existent entities)
     */
    public function cleanupOrphanedPermissions(): int
    {
        $deleted = 0;
        
        // Get all dynamic permissions
        $permissions = Permission::dynamic()->get();
        
        foreach ($permissions as $permission) {
            if ($permission->entity_type && $permission->entity_id) {
                if (!$this->validateEntityExists($permission->entity_type, $permission->entity_id)) {
                    $permission->delete();
                    $deleted++;
                }
            }
        }
        
        return $deleted;
    }
    
    /**
     * Validate permission hierarchy consistency
     */
    public function validateHierarchyConsistency(): array
    {
        $issues = [];
        
        // Check area permissions have corresponding plant permissions
        $areaPermissions = Permission::where('entity_type', 'area')->get();
        foreach ($areaPermissions as $perm) {
            $area = Area::find($perm->entity_id);
            if ($area) {
                $plantPerms = Permission::where('entity_type', 'plant')
                                      ->where('entity_id', $area->plant_id)
                                      ->exists();
                if (!$plantPerms) {
                    $issues[] = "Area {$area->id} has permissions but plant {$area->plant_id} does not";
                }
            }
        }
        
        // Check sector permissions have corresponding area permissions
        $sectorPermissions = Permission::where('entity_type', 'sector')->get();
        foreach ($sectorPermissions as $perm) {
            $sector = Sector::find($perm->entity_id);
            if ($sector) {
                $areaPerms = Permission::where('entity_type', 'area')
                                     ->where('entity_id', $sector->area_id)
                                     ->exists();
                if (!$areaPerms) {
                    $issues[] = "Sector {$sector->id} has permissions but area {$sector->area_id} does not";
                }
            }
        }
        
        return $issues;
    }
    
    /**
     * Check for duplicate permissions
     */
    public function findDuplicatePermissions(): array
    {
        $duplicates = DB::table('permissions')
            ->select('name', 'guard_name', DB::raw('COUNT(*) as count'))
            ->groupBy('name', 'guard_name')
            ->having('count', '>', 1)
            ->get();
            
        return $duplicates->toArray();
    }
    
    /**
     * Sanitize permission name
     */
    public function sanitizePermissionName(string $name): string
    {
        // Convert to lowercase
        $name = strtolower($name);
        
        // Replace invalid characters
        $name = preg_replace('/[^a-z0-9\-\.]/', '', $name);
        
        // Remove consecutive dots
        $name = preg_replace('/\.+/', '.', $name);
        
        // Trim dots from start and end
        $name = trim($name, '.');
        
        return $name;
    }

    /**
     * Validate permission grant request
     */
    public function validateGrant(User $granter, User $target, array $permissions): array
    {
        $errors = [];
        $valid = [];

        foreach ($permissions as $permission) {
            if ($this->canGrantPermission($granter, $permission)) {
                $valid[] = $permission;
            } else {
                $errors[] = "Cannot grant {$permission}: Outside your scope";
            }
        }

        return [
            'valid' => $valid,
            'errors' => $errors
        ];
    }

    /**
     * Validate permission revoke request
     */
    public function validateRevoke(User $revoker, User $target, array $permissions): array
    {
        $errors = [];
        $valid = [];

        foreach ($permissions as $permission) {
            if ($this->canRevokePermission($revoker, $permission)) {
                $valid[] = $permission;
            } else {
                $errors[] = "Cannot revoke {$permission}: Outside your scope";
            }
        }

        return [
            'valid' => $valid,
            'errors' => $errors
        ];
    }

    /**
     * Check if user can grant specific permission
     */
    private function canGrantPermission(User $granter, string $permission): bool
    {
        if ($granter->isAdministrator()) {
            return true;
        }

        // Parse permission and check against granter's scope
        return $this->isPermissionWithinScope($granter, $permission);
    }

    /**
     * Check if user can revoke specific permission
     */
    private function canRevokePermission(User $revoker, string $permission): bool
    {
        if ($revoker->isAdministrator()) {
            return true;
        }

        // Parse permission and check against revoker's scope
        return $this->isPermissionWithinScope($revoker, $permission);
    }

    /**
     * Check if permission is within user's scope
     */
    private function isPermissionWithinScope(User $user, string $permissionName): bool
    {
        // Extract entity type and ID from permission name
        if (preg_match('/\.plant\.(\d+)/', $permissionName, $matches)) {
            $plantId = (int) $matches[1];
            $accessiblePlants = $this->permissionHierarchyService->getAccessiblePlants($user);
            return $accessiblePlants->pluck('id')->contains($plantId);
        }
        
        if (preg_match('/\.area\.(\d+)/', $permissionName, $matches)) {
            $areaId = (int) $matches[1];
            $accessibleAreas = $this->permissionHierarchyService->getAccessibleAreas($user);
            return $accessibleAreas->pluck('id')->contains($areaId);
        }
        
        if (preg_match('/\.sector\.(\d+)/', $permissionName, $matches)) {
            $sectorId = (int) $matches[1];
            $accessibleSectors = $this->permissionHierarchyService->getAccessibleSectors($user);
            return $accessibleSectors->pluck('id')->contains($sectorId);
        }
        
        // For asset-specific permissions
        if (preg_match('/assets\..*\.(\d+)$/', $permissionName, $matches)) {
            $assetId = (int) $matches[1];
            $asset = \App\Models\AssetHierarchy\Asset::find($assetId);
            
            if (!$asset) {
                return false;
            }
            
            // Check if user has access to asset's sector
            if ($asset->sector) {
                $accessibleSectors = $this->permissionHierarchyService->getAccessibleSectors($user);
                return $accessibleSectors->pluck('id')->contains($asset->sector_id);
            }
        }
        
        // System-level permissions can only be granted by administrators
        if (!preg_match('/\.(plant|area|sector|asset)\./', $permissionName)) {
            return false;
        }
        
        return false;
    }

    /**
     * Validate bulk permission operations
     */
    public function validateBulkOperation(User $operator, array $grants, array $revokes): array
    {
        $grantValidation = $this->validateGrant($operator, $operator, $grants);
        $revokeValidation = $this->validateRevoke($operator, $operator, $revokes);
        
        return [
            'grants' => $grantValidation,
            'revokes' => $revokeValidation,
            'hasErrors' => !empty($grantValidation['errors']) || !empty($revokeValidation['errors'])
        ];
    }

    /**
     * Check if permission exists and is valid
     */
    public function permissionExists(string $permissionName): bool
    {
        return Permission::where('name', $permissionName)->exists();
    }

    /**
     * Validate permission format
     */
    public function isValidPermissionFormat(string $permissionName): bool
    {
        // Pattern: resource.action or resource.action.scope.id
        $pattern = '/^[a-z\-]+\.[a-z\-]+(\.(plant|area|sector|asset)\.\d+)?$/';
        return preg_match($pattern, $permissionName);
    }
}