<?php

namespace App\Observers;

use App\Models\AssetHierarchy\Plant;
use App\Models\Permission;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;

class PlantObserver
{
    /**
     * Handle the Plant "created" event.
     */
    public function created(Plant $plant): void
    {
        DB::transaction(function () use ($plant) {
            // Generate permissions for this plant
            $permissions = Permission::generateEntityPermissions('plant', $plant->id);
            
            // Grant permissions to the creating user (if not administrator)
            if (auth()->check() && !auth()->user()->isAdministrator()) {
                $user = auth()->user();
                
                // Grant all plant management permissions
                $managementPermissions = collect($permissions)->filter(function ($permission) {
                    return in_array($permission->action, ['view', 'update', 'delete', 'manage', 'manage-shifts']);
                });
                
                foreach ($managementPermissions as $permission) {
                    $user->givePermissionTo($permission);
                }
                
                // Also grant invitation permission
                $invitePermission = collect($permissions)->firstWhere('name', "users.invite.plant.{$plant->id}");
                if ($invitePermission) {
                    $user->givePermissionTo($invitePermission);
                }
            }
            
            // Log permission generation
            AuditLogService::log(
                'permissions.generated',
                'created',
                $plant,
                [],
                ['permissions_count' => count($permissions)],
                [
                    'entity_type' => 'plant',
                    'entity_id' => $plant->id,
                    'entity_name' => $plant->name,
                    'permissions_created' => collect($permissions)->pluck('name')->toArray()
                ]
            );
        });
    }

    /**
     * Handle the Plant "deleting" event.
     */
    public function deleting(Plant $plant): void
    {
        DB::transaction(function () use ($plant) {
            // Get count of permissions to be deleted
            $permissionCount = Permission::forEntity('plant', $plant->id)->count();
            
            // Delete all permissions for this plant
            Permission::deleteEntityPermissions('plant', $plant->id);
            
            // Also delete permissions for child entities
            foreach ($plant->areas as $area) {
                Permission::deleteEntityPermissions('area', $area->id);
                
                foreach ($area->sectors as $sector) {
                    Permission::deleteEntityPermissions('sector', $sector->id);
                    
                    foreach ($sector->assets as $asset) {
                        Permission::deleteEntityPermissions('asset', $asset->id);
                    }
                }
            }
            
            // Log permission deletion
            AuditLogService::log(
                'permissions.deleted',
                'deleted',
                $plant,
                ['permissions_count' => $permissionCount],
                [],
                [
                    'entity_type' => 'plant',
                    'entity_id' => $plant->id,
                    'entity_name' => $plant->name,
                    'permissions_deleted' => $permissionCount
                ]
            );
        });
    }

    /**
     * Handle the Plant "updated" event.
     */
    public function updated(Plant $plant): void
    {
        // Log significant updates
        if ($plant->isDirty('name')) {
            AuditLogService::log(
                'plant.updated',
                'updated',
                $plant,
                ['name' => $plant->getOriginal('name')],
                ['name' => $plant->name],
                ['changed_fields' => ['name']]
            );
        }
    }
}