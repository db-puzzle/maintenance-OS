import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Check, X, Lock, Globe } from 'lucide-react';

interface Permission {
    id: number;
    name: string;
    display_name: string | null;
    description: string | null;
    resource: string;
    action: string;
    scope: string | null;
    is_global: boolean;
    is_scoped: boolean;
}

interface Role {
    id: number;
    name: string;
    display_name: string | null;
    description: string | null;
    is_system: boolean;
    is_administrator: boolean;
    permissions_count: number;
    users_count: number;
    permissions?: Permission[];
}

interface PermissionCategory {
    name: string;
    displayName: string;
    permissions: Permission[];
}

interface Props {
    roles: Role[];
    permissions: Permission[];
    searchTerm?: string;
    selectedCategory?: string;
}

export function RolePermissionsMatrix({ roles, permissions, searchTerm = '', selectedCategory = 'all' }: Props) {

    // Group permissions by resource (category)
    const permissionCategories = useMemo(() => {
        const grouped = permissions.reduce((acc, permission) => {
            const resource = permission.resource;
            if (!acc[resource]) {
                acc[resource] = {
                    name: resource,
                    displayName: getResourceDisplayName(resource),
                    permissions: []
                };
            }
            acc[resource].permissions.push(permission);
            return acc;
        }, {} as Record<string, PermissionCategory>);

        // Sort permissions within each category
        Object.values(grouped).forEach(category => {
            category.permissions.sort((a, b) => {
                const actionOrder = ['view', 'create', 'update', 'delete', 'manage', 'execute', 'export', 'import', 'invite'];
                const aIndex = actionOrder.indexOf(a.action);
                const bIndex = actionOrder.indexOf(b.action);
                return aIndex - bIndex;
            });
        });

        return Object.values(grouped).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [permissions]);

    // Create permission matrix mapping
    const permissionMatrix = useMemo(() => {
        const matrix: Record<number, Record<number, { hasPermission: boolean; isGlobal: boolean }>> = {};

        roles.forEach(role => {
            matrix[role.id] = {};
            if (role.permissions) {
                role.permissions.forEach(permission => {
                    matrix[role.id][permission.id] = {
                        hasPermission: true,
                        isGlobal: permission.is_global
                    };
                });
            }
        });

        return matrix;
    }, [roles]);

    // Helper function to get resource display name
    function getResourceDisplayName(resource: string): string {
        const resourceNames: Record<string, string> = {
            'users': 'User Management',
            'roles': 'Role Management',
            'plants': 'Plant Management',
            'areas': 'Area Management',
            'sectors': 'Sector Management',
            'assets': 'Asset Management',
            'work-orders': 'Work Orders',
            'routines': 'Routine Maintenance',
            'items': 'Items & Inventory',
            'manufacturing-orders': 'Manufacturing',
            'production-routings': 'Production Routing',
            'work-cells': 'Work Cells',
            'shifts': 'Shift Management',
            'reports': 'Reports & Analytics',
            'system': 'System Settings',
            'audit-logs': 'Audit Logs',
            'media': 'Media Management',
        };
        return resourceNames[resource] || resource.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Get permission icon based on status
    const getPermissionIcon = (roleId: number, permissionId: number) => {
        const status = permissionMatrix[roleId]?.[permissionId];

        if (!status || !status.hasPermission) {
            return (
                <div className="flex items-center justify-center">
                    <X className="h-4 w-4 text-gray-300" />
                </div>
            );
        }

        return (
            <div className="flex items-center justify-center gap-1">
                <Check className="h-4 w-4 text-green-600" />
                {status.isGlobal ? (
                    <span title="System-wide"><Globe className="h-3 w-3 text-blue-500" /></span>
                ) : (
                    <span title="Entity-scoped"><Lock className="h-3 w-3 text-amber-500" /></span>
                )}
            </div>
        );
    };

    // Get cell styling based on permission status
    const getPermissionCell = (roleId: number, permissionId: number) => {
        const status = permissionMatrix[roleId]?.[permissionId];

        if (!status || !status.hasPermission) {
            return 'bg-gray-50';
        }

        if (status.isGlobal) {
            return 'bg-blue-50 border-l-2 border-blue-400';
        }

        return 'bg-amber-50 border-l-2 border-amber-400';
    };

    // Filter categories and permissions based on search
    const filteredCategories = permissionCategories.map(category => ({
        ...category,
        permissions: category.permissions.filter(p => {
            const matchesCategory = selectedCategory === 'all' || category.name === selectedCategory;
            const matchesSearch = !searchTerm ||
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.display_name && p.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesCategory && matchesSearch;
        })
    })).filter(category => category.permissions.length > 0);

    // Get role color based on type
    const getRoleColor = (role: Role) => {
        if (role.is_administrator) return 'bg-purple-500';
        if (role.is_system) {
            const systemRoleColors: Record<string, string> = {
                'plant-manager': 'bg-blue-500',
                'area-manager': 'bg-green-500',
                'sector-manager': 'bg-teal-500',
                'technician': 'bg-orange-500',
                'operator': 'bg-yellow-500',
                'viewer': 'bg-gray-500',
            };
            return systemRoleColors[role.name] || 'bg-gray-500';
        }
        return 'bg-indigo-500';
    };

    return (
        <div className="space-y-4">
            {/* Permissions Matrix */}
            <div className="rounded-lg border border-gray-200 bg-white">
                <ScrollArea className="w-full">
                    <div className="min-w-max">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-gray-50 border-b-2 border-gray-200">
                                    <th className="sticky left-0 z-30 bg-gray-50 text-left p-4 font-semibold text-sm text-gray-700 border-r border-gray-200 min-w-[300px]">
                                        Permission
                                    </th>
                                    {roles.map(role => (
                                        <th key={role.id} className="bg-gray-50 text-center p-4 min-w-[140px]">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${getRoleColor(role)}`} />
                                                    <span className="font-semibold text-sm text-gray-700">
                                                        {role.display_name || role.name}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">{role.users_count} users</div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.map((category) => (
                                    <React.Fragment key={category.name}>
                                        {/* Category Header Row */}
                                        <tr>
                                            <td
                                                colSpan={roles.length + 1}
                                                className="bg-gray-100 px-4 py-2 font-semibold text-sm text-gray-700 border-y border-gray-200"
                                            >
                                                {category.displayName}
                                            </td>
                                        </tr>

                                        {/* Permission Rows */}
                                        {category.permissions.map((permission) => (
                                            <tr
                                                key={permission.id}
                                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="sticky left-0 z-10 bg-white p-4 border-r border-gray-200">
                                                    <div className="font-medium text-sm text-gray-900 mb-1">
                                                        {permission.display_name || permission.name}
                                                    </div>
                                                    {permission.description && (
                                                        <div className="text-xs text-gray-500">{permission.description}</div>
                                                    )}
                                                    {permission.is_scoped && (
                                                        <Badge variant="outline" className="mt-2 text-xs">
                                                            Entity-scoped
                                                        </Badge>
                                                    )}
                                                </td>
                                                {roles.map(role => (
                                                    <td
                                                        key={role.id}
                                                        className={`p-4 text-center ${getPermissionCell(role.id, permission.id)}`}
                                                    >
                                                        {getPermissionIcon(role.id, permission.id)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {/* Legend Card */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <Globe className="h-3 w-3 text-blue-500" />
                            <span className="text-sm font-medium">System-wide Permission</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <Lock className="h-3 w-3 text-amber-500" />
                            <span className="text-sm font-medium">Entity-scoped Permission</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <X className="h-4 w-4 text-gray-300" />
                            <span className="text-sm font-medium">Not Granted</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Role Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {roles.map(role => (
                    <Card key={role.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${getRoleColor(role)}`} />
                                <CardTitle className="text-lg">{role.display_name || role.name}</CardTitle>
                            </div>
                            {role.description && (
                                <CardDescription className="text-xs">{role.description}</CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{role.users_count}</div>
                            <div className="text-xs text-gray-500">users assigned</div>
                            <div className="mt-2 text-xs text-gray-600">
                                {role.permissions_count} permissions
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
