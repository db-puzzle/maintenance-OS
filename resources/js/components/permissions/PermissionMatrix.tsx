import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
interface Permission {
    id: number;
    name: string;
    display_name?: string;
    resource: string;
    action: string;
}
interface Role {
    id: number;
    name: string;
    permissions?: number[];  // Array of permission IDs
}
interface Props {
    permissions: Permission[];  // Only global permissions are passed here
    roles: Role[];
}
/**
 * Permission Matrix Component
 * 
 * This component displays a matrix for managing role permissions.
 * It only shows global permissions (not entity-scoped permissions).
 * Entity-specific permissions should be managed through the entity's detail page.
 */
export default function PermissionMatrix({ permissions, roles }: Props) {
    const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [initialMatrix, setInitialMatrix] = useState<Record<string, Record<string, boolean>>>({});
    // Parse permission name to extract resource and action
    const parsePermission = (permission: Permission) => {
        const parts = permission.name.split('.');
        return {
            resource: parts[0] || 'unknown',
            action: parts[1] || 'unknown'
        };
    };
    // Group permissions by resource
    const groupedPermissions = permissions.reduce((acc, perm) => {
        const parsed = parsePermission(perm);
        if (!acc[parsed.resource]) acc[parsed.resource] = [];
        acc[parsed.resource].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);
    useEffect(() => {
        // Initialize matrix from current role permissions
        const newMatrix: Record<string, Record<string, boolean>> = {};
        roles.forEach(role => {
            newMatrix[role.id] = {};
            permissions.forEach(perm => {
                const hasPermission = role.permissions?.includes(perm.id) || false;
                newMatrix[role.id][perm.id] = hasPermission;
            });
        });
        setMatrix(newMatrix);
        setInitialMatrix(JSON.parse(JSON.stringify(newMatrix)));
    }, [roles, permissions]);
    const handleToggle = (roleId: number, permissionId: number) => {
        const newMatrix = {
            ...matrix,
            [roleId]: {
                ...matrix[roleId],
                [permissionId]: !matrix[roleId][permissionId]
            }
        };
        setMatrix(newMatrix);
        // Check if there are any changes
        const hasAnyChanges = JSON.stringify(newMatrix) !== JSON.stringify(initialMatrix);
        setHasChanges(hasAnyChanges);
    };
    const handleSave = async () => {
        setLoading(true);
        // Prepare changes
        const changes = roles.map(role => ({
            role_id: role.id,
            permissions: permissions
                .filter(perm => matrix[role.id]?.[perm.id])
                .map(perm => perm.id)
        }));
        router.post(route('permissions.sync-matrix'), { changes }, {
            onSuccess: () => {
                toast.success('Permissions updated successfully');
                setHasChanges(false);
                setInitialMatrix(JSON.parse(JSON.stringify(matrix)));
                setLoading(false);
            },
            onError: () => {
                toast.error('Failed to update permissions');
                setLoading(false);
            }
        });
    };
    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Permission Matrix</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage global permissions for each role. Entity-specific permissions are managed on individual entity pages.
                    </p>
                </div>
                {hasChanges && (
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        size="sm"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="text-left p-2 border-b sticky left-0 bg-white z-10">
                                Resource / Action
                            </th>
                            {roles.map(role => (
                                <th key={role.id} className="text-center p-2 border-b min-w-[120px]">
                                    <div className="font-medium">{role.name}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(groupedPermissions).map(([resource, perms]) => (
                            <React.Fragment key={resource}>
                                <tr>
                                    <td colSpan={roles.length + 1} className="bg-gray-50 p-2 font-medium">
                                        <Badge variant="outline" className="capitalize">
                                            {resource.replace(/-/g, ' ')}
                                        </Badge>
                                    </td>
                                </tr>
                                {perms.map(permission => {
                                    const parsed = parsePermission(permission);
                                    return (
                                        <tr key={permission.id} className="hover:bg-gray-50">
                                            <td className="p-2 border-b sticky left-0 bg-white z-10">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{parsed.action}</span>
                                                    {permission.display_name && (
                                                        <span className="text-xs text-gray-500">
                                                            {permission.display_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {roles.map(role => {
                                                const isChecked = matrix[role.id]?.[permission.id] || false;
                                                return (
                                                    <td key={role.id} className="text-center p-2 border-b">
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onCheckedChange={() => handleToggle(role.id, permission.id)}
                                                            disabled={loading}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
} 