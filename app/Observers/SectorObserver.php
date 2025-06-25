<?php

namespace App\Observers;

use App\Models\AssetHierarchy\Sector;
use App\Models\Permission;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;

class SectorObserver
{
    /**
     * Handle the Sector "created" event.
     */
    public function created(Sector $sector): void
    {
        DB::transaction(function () use ($sector) {
            // Generate permissions for this sector
            $permissions = Permission::generateEntityPermissions('sector', $sector->id, $sector->area_id);
            
            // Grant permissions to the creating user (if not administrator)
            if (auth()->check() && !auth()->user()->isAdministrator()) {
                $user = auth()->user();
                
                // Only grant permissions if user has area-level permissions
                if ($user->can("sectors.create.area.{$sector->area_id}")) {
                    // Grant all sector management permissions
                    $managementPermissions = collect($permissions)->filter(function ($permission) {
                        return in_array($permission->action, ['view', 'update', 'delete']);
                    });
                    
                    foreach ($managementPermissions as $permission) {
                        $user->givePermissionTo($permission);
                    }
                    
                    // Also grant invitation permission
                    $invitePermission = collect($permissions)->firstWhere('name', "users.invite.sector.{$sector->id}");
                    if ($invitePermission) {
                        $user->givePermissionTo($invitePermission);
                    }
                }
            }
            
            // Log permission generation
            AuditLogService::log(
                'permissions.generated',
                'created',
                $sector,
                [],
                ['permissions_count' => count($permissions)],
                [
                    'entity_type' => 'sector',
                    'entity_id' => $sector->id,
                    'entity_name' => $sector->name,
                    'parent_area_id' => $sector->area_id,
                    'permissions_created' => collect($permissions)->pluck('name')->toArray()
                ]
            );
        });
    }

    /**
     * Handle the Sector "deleting" event.
     */
    public function deleting(Sector $sector): void
    {
        DB::transaction(function () use ($sector) {
            // Get count of permissions to be deleted
            $permissionCount = Permission::forEntity('sector', $sector->id)->count();
            
            // Delete all permissions for this sector
            Permission::deleteEntityPermissions('sector', $sector->id);
            
            // Also delete permissions for child assets
            foreach ($sector->assets as $asset) {
                Permission::deleteEntityPermissions('asset', $asset->id);
            }
            
            // Log permission deletion
            AuditLogService::log(
                'permissions.deleted',
                'deleted',
                $sector,
                ['permissions_count' => $permissionCount],
                [],
                [
                    'entity_type' => 'sector',
                    'entity_id' => $sector->id,
                    'entity_name' => $sector->name,
                    'parent_area_id' => $sector->area_id,
                    'permissions_deleted' => $permissionCount
                ]
            );
        });
    }

    /**
     * Handle the Sector "updated" event.
     */
    public function updated(Sector $sector): void
    {
        // Log significant updates
        if ($sector->isDirty('name')) {
            AuditLogService::log(
                'sector.updated',
                'updated',
                $sector,
                ['name' => $sector->getOriginal('name')],
                ['name' => $sector->name],
                ['changed_fields' => ['name']]
            );
        }
    }
}