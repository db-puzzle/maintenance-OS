import React, { useState } from 'react';
import { Link, router, usePage, Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PermissionGuard from '@/components/PermissionGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Search, Plus, Edit, Trash2, Shield, Users } from 'lucide-react';
import RoleManagement from '@/components/permissions/RoleManagement';
import PermissionMatrix from '@/components/permissions/PermissionMatrix';
import { toast } from 'sonner';

interface Permission {
    id: number;
    name: string;
    display_name?: string;
    description?: string;
    resource: string;
    action: string;
    scope: string;
    guard_name: string;
    roles_count: number;
    users_count: number;
    created_at: string;
    updated_at: string;
}

interface Role {
    id: number;
    name: string;
    is_system: boolean;
    permissions_count: number;
    users_count: number;
}

interface Props {
    permissions: {
        data: Permission[];
        links: any;
    };
    roles: Role[];
    resources: string[];
    actions: string[];
    scopes: string[];
}

export default function PermissionsIndex({ permissions, roles, resources, actions, scopes }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedResource, setSelectedResource] = useState('all');
    const [selectedAction, setSelectedAction] = useState('all');
    const [selectedScope, setSelectedScope] = useState('all');

    const handleDelete = (permission: Permission) => {
        if (confirm(`Are you sure you want to delete the permission "${permission.name}"?`)) {
            router.delete(route('permissions.destroy', permission.id), {
                onSuccess: () => {
                    toast.success(`The permission "${permission.name}" has been deleted.`);
                },
                onError: () => {
                    toast.error("Failed to delete the permission.");
                }
            });
        }
    };

    const filteredPermissions = permissions.data.filter(permission => {
        const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (permission.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesResource = selectedResource === 'all' || permission.resource === selectedResource;
        const matchesAction = selectedAction === 'all' || permission.action === selectedAction;
        const matchesScope = selectedScope === 'all' || permission.scope === selectedScope;

        return matchesSearch && matchesResource && matchesAction && matchesScope;
    });

    // Parse permission name to extract resource, action, and scope
    const parsePermission = (permission: Permission) => {
        const parts = permission.name.split('.');
        return {
            resource: parts[0] || 'unknown',
            action: parts[1] || 'unknown',
            scope: parts.slice(2).join('.') || 'global'
        };
    };

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Settings', href: '#' },
        { title: 'Permissions', href: '/permissions' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Permission Management" />

            <div className="bg-background flex-shrink-0 border-b">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-semibold">Permission Management</h2>
                            <p className="text-sm text-muted-foreground">Manage system permissions, roles, and access control</p>
                        </div>
                        <PermissionGuard permission="permissions.create">
                            <Link href={route('permissions.create')}>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Permission
                                </Button>
                            </Link>
                        </PermissionGuard>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-6 px-6">
                <Tabs defaultValue="permissions" className="w-full">
                    <TabsList>
                        <TabsTrigger value="permissions">Permissions</TabsTrigger>
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                        <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
                    </TabsList>

                    <TabsContent value="permissions" className="space-y-4">
                        {/* Filters */}
                        <div className="bg-white p-4 rounded-lg shadow space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        type="text"
                                        placeholder="Search permissions..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <select
                                    value={selectedResource}
                                    onChange={(e) => setSelectedResource(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="all">All Resources</option>
                                    {resources.map(resource => (
                                        <option key={resource} value={resource}>{resource}</option>
                                    ))}
                                </select>

                                <select
                                    value={selectedAction}
                                    onChange={(e) => setSelectedAction(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="all">All Actions</option>
                                    {actions.map(action => (
                                        <option key={action} value={action}>{action}</option>
                                    ))}
                                </select>

                                <select
                                    value={selectedScope}
                                    onChange={(e) => setSelectedScope(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="all">All Scopes</option>
                                    {scopes.map(scope => (
                                        <option key={scope} value={scope}>{scope}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Permissions Table */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Permission Name</TableHead>
                                        <TableHead>Resource</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Scope</TableHead>
                                        <TableHead>Usage</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPermissions.map((permission) => {
                                        const parsed = parsePermission(permission);
                                        return (
                                            <TableRow key={permission.id}>
                                                <TableCell className="font-medium">
                                                    <div>
                                                        <p>{permission.name}</p>
                                                        {permission.display_name && (
                                                            <p className="text-sm text-gray-500">{permission.display_name}</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{parsed.resource}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{parsed.action}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="default">{parsed.scope}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <span className="flex items-center text-xs">
                                                            <Shield className="w-3 h-3 mr-1" />
                                                            {permission.roles_count}
                                                        </span>
                                                        <span className="flex items-center text-xs">
                                                            <Users className="w-3 h-3 mr-1" />
                                                            {permission.users_count}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <PermissionGuard permission="permissions.update">
                                                            <Link
                                                                href={route('permissions.edit', permission.id)}
                                                                className="inline-flex"
                                                            >
                                                                <Button variant="ghost" size="sm">
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                            </Link>
                                                        </PermissionGuard>
                                                        <PermissionGuard permission="permissions.delete">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(permission)}
                                                                disabled={permission.roles_count > 0 || permission.users_count > 0}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </PermissionGuard>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="roles">
                        <RoleManagement roles={roles} />
                    </TabsContent>

                    <TabsContent value="matrix">
                        <PermissionMatrix permissions={permissions.data} roles={roles} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
} 