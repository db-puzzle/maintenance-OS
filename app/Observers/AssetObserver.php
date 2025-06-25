<?php

namespace App\Observers;

use App\Models\AssetHierarchy\Asset;
use App\Models\Permission;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;

class AssetObserver
{
    /**
     * Handle the Asset "created" event.
     */
    public function created(Asset $asset): void
    {
        DB::transaction(function () use ($asset) {
            // Generate permissions for this asset
            $permissions = Permission::generateEntityPermissions('asset', $asset->id, $asset->sector_id);
            
            // Grant permissions to the creating user (if not administrator)
            if (auth()->check() && !auth()->user()->isAdministrator()) {
                $user = auth()->user();
                
                // Only grant permissions if user has sector-level permissions
                if ($user->can("assets.create.sector.{$asset->sector_id}")) {
                    // Grant all asset management permissions
                    $managementPermissions = collect($permissions)->filter(function ($permission) {
                        return in_array($permission->action, ['view', 'update', 'manage']);
                    });
                    
                    foreach ($managementPermissions as $permission) {
                        $user->givePermissionTo($permission);
                    }
                }
            }
            
            // Log permission generation
            AuditLogService::log(
                'permissions.generated',
                'created',
                $asset,
                [],
                ['permissions_count' => count($permissions)],
                [
                    'entity_type' => 'asset',
                    'entity_id' => $asset->id,
                    'entity_name' => $asset->name,
                    'parent_sector_id' => $asset->sector_id,
                    'permissions_created' => collect($permissions)->pluck('name')->toArray()
                ]
            );
        });
    }

    /**
     * Handle the Asset "deleting" event.
     */
    public function deleting(Asset $asset): void
    {
        DB::transaction(function () use ($asset) {
            // Get count of permissions to be deleted
            $permissionCount = Permission::forEntity('asset', $asset->id)->count();
            
            // Delete all permissions for this asset
            Permission::deleteEntityPermissions('asset', $asset->id);
            
            // Log permission deletion
            AuditLogService::log(
                'permissions.deleted',
                'deleted',
                $asset,
                ['permissions_count' => $permissionCount],
                [],
                [
                    'entity_type' => 'asset',
                    'entity_id' => $asset->id,
                    'entity_name' => $asset->name,
                    'parent_sector_id' => $asset->sector_id,
                    'permissions_deleted' => $permissionCount
                ]
            );
        });
    }

    /**
     * Handle the Asset "updated" event.
     */
    public function updated(Asset $asset): void
    {
        // Log significant updates
        $changedFields = [];
        
        if ($asset->isDirty('name')) {
            $changedFields[] = 'name';
        }
        
        if ($asset->isDirty('code')) {
            $changedFields[] = 'code';
        }
        
        if (!empty($changedFields)) {
            AuditLogService::log(
                'asset.updated',
                'updated',
                $asset,
                $asset->getOriginal($changedFields),
                $asset->only($changedFields),
                ['changed_fields' => $changedFields]
            );
        }
    }
}