import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import {
    ArrowLeft,
    Edit,
    Copy,
    Shield,
    Users,
    Key,
    Building,
    MapPin,
    Grid3X3,
    Package
} from 'lucide-react';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface Permission {
    id: number;
    name: string;
    display_name: string | null;
    resource: string;
    action: string;
    scope: string | null;
    is_global: boolean;
    is_scoped: boolean;
}

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
}

interface Role {
    id: number;
    name: string;
    display_name: string | null;
    description: string | null;
    icon: string | null;
    is_system: boolean;
    is_administrator: boolean;
    requires_entity: boolean;
    can_be_modified: boolean;
    can_be_deleted: boolean;
    permissions_count: number;
    global_permissions_count: number;
    scoped_permissions_count: number;
    users_count: number;
    assignments_count: number;
    entity_coverage?: {
        plants: { total: number; covered: number };
        areas: { total: number; covered: number };
        sectors: { total: number; covered: number };
    };
    permissions?: Permission[];
    users?: User[];
    created_at: string;
    updated_at: string;
}

interface Props {
    role: Role;
    can: {
        update: boolean;
        delete: boolean;
        assign: boolean;
        duplicate: boolean;
    };
}

export default function RoleShow({ role, can }: Props) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    if (!role) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </AppLayout>
        );
    }

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Settings',
            href: '/settings',
        },
        {
            title: 'Roles',
            href: '/settings/roles',
        },
        {
            title: role.display_name || role.name,
            href: '#', // Current page, no need to link
        },
    ];

    const handleDelete = async () => {
        router.delete(route('roles.destroy', { role: role.id }), {
            onSuccess: () => {
                toast.success('Role deleted successfully');
            },
            onError: (errors) => {
                toast.error(Object.values(errors).join(', '));
            },
        });
    };

    const handleDuplicate = () => {
        router.post(route('roles.duplicate', { role: role.id }), {}, {
            onSuccess: () => {
                toast.success('Role duplicated successfully');
            },
            onError: (errors) => {
                toast.error(Object.values(errors).join(', '));
            },
        });
    };

    const additionalActions = [];
    if (can.duplicate) {
        additionalActions.push({
            label: 'Duplicate',
            icon: <Copy className="h-4 w-4" />,
            onClick: handleDuplicate,
        });
    }

    const globalPermissions = role.permissions?.filter(p => p.is_global) || [];
    const scopedPermissions = role.permissions?.filter(p => p.is_scoped) || [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Role: ${role.display_name || role.name}`} />

            <div className="px-4 sm:px-6 lg:px-8">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                asChild
                            >
                                <Link href={route('roles.index')}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                            </Button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{role.icon || '👤'}</span>
                                    <h1 className="text-2xl font-semibold">
                                        {role.display_name || role.name}
                                    </h1>
                                    {role.is_administrator && (
                                        <Badge variant="secondary">Administrator</Badge>
                                    )}
                                    {role.is_system && (
                                        <Badge variant="outline">System Role</Badge>
                                    )}
                                </div>
                                {role.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {role.description}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {can.update && role.can_be_modified && (
                                <Button asChild>
                                    <Link href={route('roles.edit', { role: role.id })}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Role
                                    </Link>
                                </Button>
                            )}
                            {(can.update || can.delete || can.duplicate) && (
                                <EntityActionDropdown
                                    onEdit={can.update && role.can_be_modified ? () => router.visit(route('roles.edit', { role: role.id })) : undefined}
                                    onDelete={can.delete && role.can_be_deleted ? () => setDeleteDialogOpen(true) : undefined}
                                    additionalActions={additionalActions}
                                />
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="permissions">
                                Permissions ({role.permissions_count})
                            </TabsTrigger>
                            <TabsTrigger value="users">
                                Users ({role.users_count})
                            </TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-6">
                            <RoleOverview role={role} />
                        </TabsContent>

                        <TabsContent value="permissions" className="mt-6">
                            <RolePermissions
                                role={role}
                                globalPermissions={globalPermissions}
                                scopedPermissions={scopedPermissions}
                                canUpdate={can.update && role.can_be_modified}
                            />
                        </TabsContent>

                        <TabsContent value="users" className="mt-6">
                            <RoleUsers
                                role={role}
                                users={role.users || []}
                                canAssign={can.assign}
                            />
                        </TabsContent>

                        <TabsContent value="history" className="mt-6">
                            <RoleHistory roleId={role.id} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <EntityDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDelete}
                entityLabel={role.display_name || role.name}
            />
        </AppLayout>
    );
}

function RoleOverview({ role }: { role: Role }) {
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Role Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Role Type</p>
                            <p className="font-medium">{role.is_system ? 'System Role' : 'Custom Role'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Entity-Based</p>
                            <p className="font-medium">
                                {role.requires_entity ? 'Yes (requires entity assignment)' : 'No (global role)'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="font-medium">
                                {new Date(role.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Last Modified</p>
                            <p className="font-medium">
                                {new Date(role.updated_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Permissions Summary</CardTitle>
                    <CardDescription>
                        This role has {role.permissions_count} permissions in total
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-2xl font-semibold">{role.global_permissions_count}</p>
                                        <p className="text-sm text-muted-foreground">Global Permissions</p>
                                    </div>
                                    <Key className="h-8 w-8 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-2xl font-semibold">{role.scoped_permissions_count}</p>
                                        <p className="text-sm text-muted-foreground">Entity-Scoped Permissions</p>
                                    </div>
                                    <MapPin className="h-8 w-8 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Users</p>
                            <p className="text-2xl font-semibold">{role.users_count}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Assignments</p>
                            <p className="text-2xl font-semibold">{role.assignments_count}</p>
                        </div>
                    </div>

                    {role.entity_coverage && (
                        <>
                            <div className="border-t pt-4">
                                <p className="font-medium mb-3">Entity Coverage</p>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">Plants</span>
                                        </div>
                                        <span className="text-sm font-medium">
                                            {role.entity_coverage.plants.covered} / {role.entity_coverage.plants.total}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">Areas</span>
                                        </div>
                                        <span className="text-sm font-medium">
                                            {role.entity_coverage.areas.covered} / {role.entity_coverage.areas.total}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">Sectors</span>
                                        </div>
                                        <span className="text-sm font-medium">
                                            {role.entity_coverage.sectors.covered} / {role.entity_coverage.sectors.total}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function RolePermissions({
    role,
    globalPermissions,
    scopedPermissions,
    canUpdate
}: {
    role: Role;
    globalPermissions: Permission[];
    scopedPermissions: Permission[];
    canUpdate: boolean;
}) {
    return (
        <div className="space-y-6">
            {canUpdate && (
                <div className="flex justify-end">
                    <Button asChild>
                        <Link href={route('roles.edit', { role: role.id })}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Permissions
                        </Link>
                    </Button>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Global Permissions ({globalPermissions.length})</CardTitle>
                    <CardDescription>
                        These permissions are granted regardless of entity assignment
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                            {globalPermissions.map((permission) => (
                                <div key={permission.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div>
                                        <p className="font-medium">{permission.name}</p>
                                        {permission.display_name && (
                                            <p className="text-sm text-muted-foreground">{permission.display_name}</p>
                                        )}
                                    </div>
                                    <Badge variant="secondary">{permission.resource}</Badge>
                                </div>
                            ))}
                            {globalPermissions.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No global permissions assigned
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Entity-Scoped Permissions ({scopedPermissions.length})</CardTitle>
                    <CardDescription>
                        These permissions are granted when role is assigned to specific entities
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                            {scopedPermissions.map((permission) => (
                                <div key={permission.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div>
                                        <p className="font-medium">{permission.name}</p>
                                        {permission.display_name && (
                                            <p className="text-sm text-muted-foreground">{permission.display_name}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{permission.scope || 'entity'}</Badge>
                                        <Badge variant="secondary">{permission.resource}</Badge>
                                    </div>
                                </div>
                            ))}
                            {scopedPermissions.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No entity-scoped permissions assigned
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

function RoleUsers({
    role,
    users,
    canAssign
}: {
    role: Role;
    users: User[];
    canAssign: boolean;
}) {
    return (
        <div className="space-y-6">
            {canAssign && (
                <div className="flex justify-end">
                    <Button asChild>
                        <Link href={route('roles.users.index', { role: role.id })}>
                            <Users className="mr-2 h-4 w-4" />
                            Manage Users
                        </Link>
                    </Button>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Users with this Role</CardTitle>
                    <CardDescription>
                        {users.length} users have been assigned this role
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                            {users.map((user) => (
                                <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="h-8 w-8 rounded-full"
                                            />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                    >
                                        <Link href={route('users.show', { user: user.id })}>
                                            View User
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                            {users.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No users assigned to this role
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {role.requires_entity && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                            <div>
                                <p className="font-medium">Entity-Based Role</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    This role requires entity assignment. Users can have multiple
                                    assignments to different entities with the same role.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function RoleHistory({ roleId: _roleId }: { roleId: number }) {
    // This would typically fetch audit logs from an API endpoint
    return (
        <Card>
            <CardHeader>
                <CardTitle>Audit History</CardTitle>
                <CardDescription>
                    Recent changes and activities for this role
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                    Audit history will be displayed here
                </p>
            </CardContent>
        </Card>
    );
}
