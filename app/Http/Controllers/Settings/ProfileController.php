<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * Update only the user's timezone.
     */
    public function updateTimezone(Request $request)
    {
        $validated = $request->validate([
            'timezone' => ['required', 'string', 'timezone'],
        ]);

        $request->user()->update([
            'timezone' => $validated['timezone'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Timezone updated successfully',
            'timezone' => $validated['timezone'],
        ]);
    }

    /**
     * Show the user's permissions settings page.
     */
    public function permissions(Request $request): Response
    {
        $user = $request->user()->load(['roles.permissions']);
        
        // Get all effective permissions (direct + through roles)
        $allPermissions = $user->getAllEffectivePermissions()
            ->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'display_name' => $permission->display_name,
                    'description' => $permission->description,
                    'resource' => $permission->resource,
                    'action' => $permission->action,
                    'scope' => $permission->scope,
                ];
            })
            ->groupBy('resource')
            ->sortKeys();

        // Get permissions with pagination and filters (similar to PermissionController)
        $query = \App\Models\Permission::query();

        // Apply filters
        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('display_name', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('resource')) {
            $query->forResource($request->resource);
        }

        if ($request->filled('action')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%.{$request->action}.%")
                  ->orWhere('name', 'like', "%.{$request->action}");
            });
        }

        if ($request->filled('scope')) {
            if ($request->scope === 'global') {
                $query->where(function($q) {
                    $q->where('name', 'not like', '%.%.%.%')
                      ->whereRaw("name !~ '^(areas|plants|sectors|assets)\\.[^.]+\\.[0-9]+$'")
                      ->orWhere('name', 'like', 'system.%');
                });
            } else {
                $query->where(function($q) use ($request) {
                    $q->where('name', 'like', "%.{$request->scope}.%")
                      ->orWhere(function($subQ) use ($request) {
                          if ($request->scope === 'area') {
                              $subQ->whereRaw("name ~ '^areas\\.[^.]+\\.[0-9]+$'");
                          } elseif ($request->scope === 'plant') {
                              $subQ->whereRaw("name ~ '^plants\\.[^.]+\\.[0-9]+$'");
                          } elseif ($request->scope === 'sector') {
                              $subQ->whereRaw("name ~ '^sectors\\.[^.]+\\.[0-9]+$'");
                          } elseif ($request->scope === 'asset') {
                              $subQ->whereRaw("name ~ '^assets\\.[^.]+\\.[0-9]+$'");
                          }
                      });
                });
            }
        }

        $perPage = $request->input('per_page', 20);
        $permissions = $query
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        // Collect all entity IDs by type
        $entityIds = [
            'plant' => [],
            'area' => [],
            'sector' => [],
            'asset' => [],
        ];
        
        foreach ($permissions as $permission) {
            $parsed = $permission->parsePermission();
            $parts = explode('.', $permission->name);
            
            if ($parsed['scope'] && $parsed['scope_id'] && isset($entityIds[$parsed['scope']])) {
                $entityIds[$parsed['scope']][] = $parsed['scope_id'];
            }
            
            if (count($parts) === 3 && is_numeric($parts[2])) {
                $resource = $parsed['resource'];
                $entityType = match($resource) {
                    'plants' => 'plant',
                    'areas' => 'area',
                    'sectors' => 'sector',
                    'assets' => 'asset',
                    default => null
                };
                
                if ($entityType && isset($entityIds[$entityType])) {
                    $entityIds[$entityType][] = $parts[2];
                }
            }
        }
        
        // Preload all entities
        $entities = [
            'plant' => \App\Models\AssetHierarchy\Plant::whereIn('id', array_unique($entityIds['plant']))->pluck('name', 'id'),
            'area' => \App\Models\AssetHierarchy\Area::whereIn('id', array_unique($entityIds['area']))->pluck('name', 'id'),
            'sector' => \App\Models\AssetHierarchy\Sector::whereIn('id', array_unique($entityIds['sector']))->pluck('name', 'id'),
            'asset' => \App\Models\AssetHierarchy\Asset::whereIn('id', array_unique($entityIds['asset']))->pluck('tag', 'id'),
        ];
        
        // Add computed attributes
        $permissions->getCollection()->transform(function ($permission) use ($entities) {
            $permission->append(['resource', 'action', 'scope_type']);
            
            $parsed = $permission->parsePermission();
            $parts = explode('.', $permission->name);
            
            if (count($parts) === 3 && is_numeric($parts[2])) {
                $entityId = $parts[2];
                $resource = $parsed['resource'];
                
                $entityType = match($resource) {
                    'plants' => 'plant',
                    'areas' => 'area',
                    'sectors' => 'sector',
                    'assets' => 'asset',
                    default => null
                };
                
                if ($entityType && isset($entities[$entityType][$entityId])) {
                    $permission->scope_entity_name = $entities[$entityType][$entityId];
                    $permission->scope_type = $entityType;
                    $permission->scope = $entityType;
                }
            } elseif ($parsed['scope'] && $parsed['scope_id']) {
                $entityName = null;
                
                switch ($parsed['scope']) {
                    case 'plant':
                        $entityName = $entities['plant'][$parsed['scope_id']] ?? "Plant #{$parsed['scope_id']}";
                        break;
                    case 'area':
                        $entityName = $entities['area'][$parsed['scope_id']] ?? "Area #{$parsed['scope_id']}";
                        break;
                    case 'sector':
                        $entityName = $entities['sector'][$parsed['scope_id']] ?? "Sector #{$parsed['scope_id']}";
                        break;
                    case 'asset':
                        $entityName = $entities['asset'][$parsed['scope_id']] ?? "Asset #{$parsed['scope_id']}";
                        break;
                }
                
                $permission->scope_entity_name = $entityName;
            }
            
            return $permission;
        });

        // Get filter options
        $allPermissions = \App\Models\Permission::all();
        $resources = $allPermissions->map(fn($p) => $p->resource)->filter()->unique()->sort()->values();
        $actions = $allPermissions->map(fn($p) => $p->action)->filter()->unique()->sort()->values();
        $scopeTypes = ['global', 'plant', 'area', 'sector', 'asset'];

        return Inertia::render('settings/permissions', [
            'userRoles' => $user->roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'is_system' => $role->is_system,
                ];
            }),
            'userPermissions' => $allPermissions,
            'isAdministrator' => $user->isAdministrator(),
            'permissions' => $permissions,
            'filters' => $request->only(['search', 'resource', 'action', 'scope', 'per_page']),
            'resources' => $resources,
            'actions' => $actions,
            'scopes' => $scopeTypes,
        ]);
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        // Check if this is the last administrator
        $adminProtectionService = app(\App\Services\AdministratorProtectionService::class);
        $protectionCheck = $adminProtectionService->canPerformOperation($user, 'delete');
        
        if (!$protectionCheck['allowed']) {
            return back()->with('error', $protectionCheck['message']);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
