<?php

namespace App\Observers;

use App\Models\AssetHierarchy\Area;
use App\Models\Permission;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;

class AreaObserver
{
    /**
     * Handle the Area "created" event.
     */
    public function created(Area $area): void
    {
        DB::transaction(function () use ($area) {
            // Generate permissions for this area
            $permissions = Permission::generateEntityPermissions('area', $area->id, $area->plant_id);
            
            // Grant permissions to the creating user (if not administrator)
            if (auth()->check() && !auth()->user()->isAdministrator()) {
                $user = auth()->user();
                
                // Only grant permissions if user has plant-level permissions
                if ($user->can("areas.create.plant.{$area->plant_id}")) {
                    // Grant all area management permissions
                    $managementPermissions = collect($permissions)->filter(function ($permission) {
                        return in_array($permission->action, ['view', 'update', 'delete']);
                    });
                    
                    foreach ($managementPermissions as $permission) {
                        $user->givePermissionTo($permission);
                    }
                    
                    // Also grant invitation permission
                    $invitePermission = collect($permissions)->firstWhere('name', "users.invite.area.{$area->id}");
                    if ($invitePermission) {
                        $user->givePermissionTo($invitePermission);
                    }
                }
            }
            
            // Log permission generation
            AuditLogService::log(
                'permissions.generated',
                'created',
                $area,
                [],
                ['permissions_count' => count($permissions)],
                [
                    'entity_type' => 'area',
                    'entity_id' => $area->id,
                    'entity_name' => $area->name,
                    'parent_plant_id' => $area->plant_id,
                    'permissions_created' => collect($permissions)->pluck('name')->toArray()
                ]
            );
        });
    }

    /**
     * Handle the Area "deleting" event.
     */
    public function deleting(Area $area): void
    {
        DB::transaction(function () use ($area) {
            // Get count of permissions to be deleted
            $permissionCount = Permission::forEntity('area', $area->id)->count();
            
            // Delete all permissions for this area
            Permission::deleteEntityPermissions('area', $area->id);
            
            // Also delete permissions for child entities
            foreach ($area->sectors as $sector) {
                Permission::deleteEntityPermissions('sector', $sector->id);
                
                foreach ($sector->assets as $asset) {
                    Permission::deleteEntityPermissions('asset', $asset->id);
                }
            }
            
            // Log permission deletion
            AuditLogService::log(
                'permissions.deleted',
                'deleted',
                $area,
                ['permissions_count' => $permissionCount],
                [],
                [
                    'entity_type' => 'area',
                    'entity_id' => $area->id,
                    'entity_name' => $area->name,
                    'parent_plant_id' => $area->plant_id,
                    'permissions_deleted' => $permissionCount
                ]
            );
        });
    }

    /**
     * Handle the Area "updated" event.
     */
    public function updated(Area $area): void
    {
        // Log significant updates
        if ($area->isDirty('name')) {
            AuditLogService::log(
                'area.updated',
                'updated',
                $area,
                ['name' => $area->getOriginal('name')],
                ['name' => $area->name],
                ['changed_fields' => ['name']]
            );
        }
    }
}