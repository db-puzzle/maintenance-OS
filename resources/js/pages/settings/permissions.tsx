import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, Users, Key, ArrowUpDown } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import HeadingSmall from '@/components/heading-small';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { ColumnConfig } from '@/types/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Permissions',
        href: '/settings/permissions',
    },
];

interface Role {
    id: number;
    name: string;
    is_system: boolean;
}

interface Permission {
    id: number;
    name: string;
    display_name?: string;
    description?: string;
    resource: string;
    action: string;
    scope: string | null;
    scope_entity_name?: string;
    guard_name: string;
    roles_count: number;
    users_count: number;
    created_at: string;
    updated_at: string;
}

interface Props {
    userRoles: Role[];
    userPermissions: Record<string, Permission[]>;
    isAdministrator: boolean;
    permissions: {
        data: Permission[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    resources: string[];
    actions: string[];
    scopes: string[];
    filters: {
        search?: string;
        resource?: string;
        action?: string;
        scope?: string;
    };
}

export default function Permissions({ userRoles, isAdministrator, permissions, resources, actions, scopes, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedResource, setSelectedResource] = useState(filters.resource || 'all');
    const [selectedAction, setSelectedAction] = useState(filters.action || 'all');
    const [selectedScope, setSelectedScope] = useState(filters.scope || 'all');

    // Parse permission name to extract resource, action, and scope
    const parsePermission = (permission: Permission) => {
        const parts = permission.name.split('.');
        return {
            resource: parts[0] || 'unknown',
            action: parts[1] || 'unknown',
            scope: parts.slice(2).join('.') || 'global'
        };
    };

    // Define columns for EntityDataTable
    const columns: ColumnConfig[] = [
        {
            key: 'scope',
            label: 'Scope',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => {
                const permission = row as unknown as Permission;
                const parsed = parsePermission(permission);

                // Check if we have a scope_entity_name (for both direct and scoped permissions)
                if (permission.scope_entity_name) {
                    // Determine the scope type to display
                    let scopeType = '';

                    if (permission.scope && permission.scope !== 'global' && !(/^\d+$/.test(permission.scope))) {
                        // Use the scope from the permission object (set by backend)
                        scopeType = permission.scope.charAt(0).toUpperCase() + permission.scope.slice(1);
                    } else if (parsed.scope && !(/^\d+$/.test(parsed.scope))) {
                        // Use the parsed scope for scoped permissions (but not if it's just a number)
                        // Remove any numeric suffix (e.g., "plant.1" becomes "plant")
                        const cleanScope = parsed.scope.split('.')[0];
                        scopeType = cleanScope.charAt(0).toUpperCase() + cleanScope.slice(1);
                    } else {
                        // Fallback - try to determine from resource name
                        const resource = permission.resource;
                        scopeType = resource ? resource.slice(0, -1).charAt(0).toUpperCase() + resource.slice(0, -1).slice(1) : 'Entity';
                    }

                    // Extract just the name part from scope_entity_name (remove ID if present)
                    // Format is typically "ID: Name" so we split by ": " and take the last part
                    const entityNameParts = permission.scope_entity_name.split(': ');
                    const entityName = entityNameParts.length > 1 ? entityNameParts.slice(1).join(': ') : permission.scope_entity_name;

                    return <Badge variant="default">{`${scopeType}: ${entityName}`}</Badge>;
                }

                // Check for global permissions
                if (!parsed.scope || parsed.scope === 'global') {
                    return <Badge variant="default">Global</Badge>;
                }

                // Fallback for permissions without entity names
                return <Badge variant="default">{parsed.scope}</Badge>;
            },
        },
        {
            key: 'resource',
            label: 'Resource',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => {
                const permission = row as unknown as Permission;
                const parsed = parsePermission(permission);
                return <div className="flex justify-center"><Badge variant="outline">{parsed.resource}</Badge></div>;
            },
        },
        {
            key: 'action',
            label: 'Action',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => {
                const permission = row as unknown as Permission;
                const parsed = parsePermission(permission);
                return <div className="flex justify-center"><Badge variant="secondary">{parsed.action}</Badge></div>;
            },
        },
        {
            key: 'name',
            label: 'Permission Name',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => {
                const permission = row as unknown as Permission;
                return (
                    <div>
                        <p className="font-mono text-sm">{permission.name}</p>
                        {permission.display_name && (
                            <p className="text-sm font-medium text-muted-foreground">{permission.display_name}</p>
                        )}
                    </div>
                );
            },
        },
    ];

    // Custom table component with centered headers for specific columns
    const PermissionsTable = ({ data }: { data: Permission[]; loading?: boolean }) => {
        const visibleColumns = columns;

        return (
            <div className="w-full overflow-hidden rounded-md border">
                <Table>
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            {visibleColumns.map((column, index) => (
                                <TableHead
                                    key={column.key}
                                    className={`${index === 0 ? 'pl-4' : ''} ${column.width || ''} ${(column.key === 'resource' || column.key === 'action') ? 'text-center' : ''
                                        }`}
                                >
                                    {column.sortable ? (
                                        <div
                                            className={`flex cursor-pointer items-center gap-2 ${(column.key === 'resource' || column.key === 'action') ? 'justify-center' : ''
                                                }`}
                                        >
                                            {column.label}
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        column.label
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length ? (
                            data.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                                >
                                    {visibleColumns.map((column, index) => (
                                        <TableCell
                                            key={column.key}
                                            className={`${index === 0 ? 'pl-4' : ''} ${column.width || ''}`}
                                        >
                                            {column.render ?
                                                column.render(row[column.key as keyof Permission], row as unknown as Record<string, unknown>) :
                                                row[column.key as keyof Permission]
                                            }
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length} className="h-24 pl-4 text-center">
                                    No permissions found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    };

    // Handle search with server-side filtering
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        router.get(
            route('settings.permissions'),
            { search: value, resource: selectedResource === 'all' ? undefined : selectedResource, action: selectedAction === 'all' ? undefined : selectedAction, scope: selectedScope === 'all' ? undefined : selectedScope },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Handle filter changes
    const handleFilterChange = (filterType: string, value: string) => {
        const newFilters: any = {
            search: searchTerm,
            resource: selectedResource === 'all' ? undefined : selectedResource,
            action: selectedAction === 'all' ? undefined : selectedAction,
            scope: selectedScope === 'all' ? undefined : selectedScope,
        };

        if (filterType === 'resource') {
            setSelectedResource(value);
            newFilters.resource = value === 'all' ? undefined : value;
        } else if (filterType === 'action') {
            setSelectedAction(value);
            newFilters.action = value === 'all' ? undefined : value;
        } else if (filterType === 'scope') {
            setSelectedScope(value);
            newFilters.scope = value === 'all' ? undefined : value;
        }

        router.get(route('settings.permissions'), newFilters, { preserveState: true, preserveScroll: true });
    };

    // Handle pagination
    const handlePageChange = (page: number) => {
        router.get(
            route('settings.permissions'),
            {
                ...filters,
                page,
                search: searchTerm,
                resource: selectedResource === 'all' ? undefined : selectedResource,
                action: selectedAction === 'all' ? undefined : selectedAction,
                scope: selectedScope === 'all' ? undefined : selectedScope,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('settings.permissions'),
            {
                ...filters,
                per_page: perPage,
                page: 1,
                search: searchTerm,
                resource: selectedResource === 'all' ? undefined : selectedResource,
                action: selectedAction === 'all' ? undefined : selectedAction,
                scope: selectedScope === 'all' ? undefined : selectedScope,
            },
            { preserveState: true, preserveScroll: true }
        );
    };



    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Permissions" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Permissions"
                        description="View your assigned roles and permissions in the system"
                    />

                    {/* Administrator Badge */}
                    {isAdministrator && (
                        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertDescription className="text-blue-800 dark:text-blue-200">
                                <span className="font-semibold">Administrator</span> You have privileges for full system access.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Roles Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Assigned Roles
                            </CardTitle>
                            <CardDescription>
                                Roles group permissions together for easier management
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {userRoles.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {userRoles.map((role) => (
                                        <Badge
                                            key={role.id}
                                            variant={role.is_system ? 'default' : 'secondary'}
                                            className="px-3 py-1"
                                        >
                                            <Shield className="mr-1.5 h-3 w-3" />
                                            {role.name}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No roles assigned</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Permissions Section with Table */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-semibold">
                                <Key className="h-5 w-5" />
                                All System Permissions
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Browse and filter all permissions available in the system
                            </p>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Select value={selectedScope} onValueChange={(value) => handleFilterChange('scope', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Scopes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Scopes</SelectItem>
                                    {scopes.map(scope => (
                                        <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedResource} onValueChange={(value) => handleFilterChange('resource', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Resources" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Resources</SelectItem>
                                    {resources.map(resource => (
                                        <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedAction} onValueChange={(value) => handleFilterChange('action', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    {actions.map(action => (
                                        <SelectItem key={action} value={action}>{action}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Search permissions..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Permissions Table */}
                        <PermissionsTable data={permissions.data} loading={false} />

                        <EntityPagination
                            pagination={{
                                current_page: permissions.current_page,
                                last_page: permissions.last_page,
                                per_page: permissions.per_page,
                                total: permissions.total,
                                from: permissions.from,
                                to: permissions.to,
                            }}
                            onPageChange={handlePageChange}
                            onPerPageChange={handlePerPageChange}
                            compact={true}
                        />
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
} 