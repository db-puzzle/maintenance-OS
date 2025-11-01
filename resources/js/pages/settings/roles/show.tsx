import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import {
    Edit,
    Copy,
    Shield,
    Users,
    Key,
    Building,
    MapPin,
    Grid3X3,
    Package,
    History
} from 'lucide-react';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
import EmptyCard from '@/components/ui/empty-card';

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
    const [_isCompressed, _setIsCompressed] = useState(false);

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
            title: 'Roles',
            href: '/settings/roles',
        },
        {
            title: role.display_name || role.name,
            href: '',
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

    const globalPermissions = role.permissions?.filter(p => p.is_global) || [];
    const scopedPermissions = role.permissions?.filter(p => p.is_scoped) || [];

    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            content: <RoleOverview role={role} />,
        },
        {
            id: 'permissions',
            label: `Permissions (${role.permissions_count})`,
            content: (
                <RolePermissions
                    role={role}
                    globalPermissions={globalPermissions}
                    scopedPermissions={scopedPermissions}
                    canUpdate={can.update && role.can_be_modified}
                />
            ),
        },
        {
            id: 'users',
            label: `Users (${role.users_count})`,
            content: (
                <RoleUsers
                    role={role}
                    users={role.users || []}
                    canAssign={can.assign}
                />
            ),
        },
        {
            id: 'history',
            label: 'History',
            content: <RoleHistory roleId={role.id} />,
        },
    ];

    const actions = (
        <>
            {can.update && role.can_be_modified && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.visit(route('roles.edit', { role: role.id }))}
                >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Role
                </Button>
            )}
            {can.duplicate && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDuplicate}
                >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                </Button>
            )}
            {can.delete && role.can_be_deleted && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                >
                    Delete
                </Button>
            )}
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Role: ${role.display_name || role.name}`} />

            <ShowLayout
                title={role.display_name || role.name}
                subtitle={`${role.is_system ? 'System Role' : 'Custom Role'} • ${role.is_administrator ? 'Administrator' : 'Regular Role'} • ${role.requires_entity ? 'Entity-based' : 'Global'}`}
                editRoute=""
                tabs={tabs}
                actions={actions}
            />

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
        <div className="py-8">
            <div className="space-y-6">
                {/* Role Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Role Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>

                {/* Permissions Summary */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">Permissions Summary</h3>
                        <p className="text-sm text-muted-foreground">
                            This role has {role.permissions_count} permissions in total
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 border rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-semibold">{role.global_permissions_count}</p>
                                    <p className="text-sm text-muted-foreground">Global Permissions</p>
                                </div>
                                <Key className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="p-6 border rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-semibold">{role.scoped_permissions_count}</p>
                                    <p className="text-sm text-muted-foreground">Entity-Scoped Permissions</p>
                                </div>
                                <MapPin className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Usage Statistics */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Usage Statistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Users</p>
                            <p className="text-2xl font-semibold">{role.users_count}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Assignments</p>
                            <p className="text-2xl font-semibold">{role.assignments_count}</p>
                        </div>
                    </div>

                    {role.entity_coverage && role.entity_coverage.plants && (
                        <div className="pt-4 space-y-3">
                            <p className="font-medium">Entity Coverage</p>
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
                    )}
                </div>
            </div>
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
        <div className="py-6">
            <div className="space-y-6">
                {canUpdate && (
                    <div className="flex justify-end">
                        <Button
                            onClick={() => router.visit(route('roles.edit', { role: role.id }))}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Permissions
                        </Button>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Global Permissions */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold">Global Permissions ({globalPermissions.length})</h3>
                            <p className="text-sm text-muted-foreground">
                                These permissions are granted regardless of entity assignment
                            </p>
                        </div>
                        {globalPermissions.length > 0 ? (
                            <EntityDataTable
                                data={globalPermissions as unknown as Array<Record<string, unknown>>}
                                columns={[
                                    {
                                        key: 'name',
                                        label: 'Permission',
                                        render: (value: unknown, row: unknown) => {
                                            const permission = row as Permission;
                                            return (
                                                <div>
                                                    <p className="font-medium">{permission.name}</p>
                                                    {permission.display_name && (
                                                        <p className="text-sm text-muted-foreground">{permission.display_name}</p>
                                                    )}
                                                </div>
                                            );
                                        },
                                    },
                                    {
                                        key: 'resource',
                                        label: 'Resource',
                                        render: (value: unknown, row: unknown) => {
                                            const permission = row as Permission;
                                            return <Badge variant="secondary">{permission.resource}</Badge>;
                                        },
                                        headerAlign: 'right' as const,
                                    },
                                ]}
                                emptyMessage="No global permissions assigned"
                            />
                        ) : (
                            <EmptyCard
                                icon={Key}
                                title="No global permissions"
                                description="This role has no global permissions assigned"
                            />
                        )}
                    </div>

                    {/* Entity-Scoped Permissions */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold">Entity-Scoped Permissions ({scopedPermissions.length})</h3>
                            <p className="text-sm text-muted-foreground">
                                These permissions are granted when role is assigned to specific entities
                            </p>
                        </div>
                        {scopedPermissions.length > 0 ? (
                            <EntityDataTable
                                data={scopedPermissions as unknown as Array<Record<string, unknown>>}
                                columns={[
                                    {
                                        key: 'name',
                                        label: 'Permission',
                                        render: (value: unknown, row: unknown) => {
                                            const permission = row as Permission;
                                            return (
                                                <div>
                                                    <p className="font-medium">{permission.name}</p>
                                                    {permission.display_name && (
                                                        <p className="text-sm text-muted-foreground">{permission.display_name}</p>
                                                    )}
                                                </div>
                                            );
                                        },
                                    },
                                    {
                                        key: 'scope',
                                        label: 'Scope / Entity Type',
                                        render: (value: unknown, row: unknown) => {
                                            const permission = row as Permission;
                                            // Check if this is an entity-scoped permission (plant, area, sector, asset)
                                            const entityScopes = ['plant', 'area', 'sector', 'asset'];
                                            const isEntityScoped = permission.scope && entityScopes.includes(permission.scope);

                                            if (isEntityScoped) {
                                                // For true entity-scoped permissions, show the entity type with icon
                                                const entityIcons: Record<string, React.ReactNode> = {
                                                    plant: <Building className="h-3 w-3" />,
                                                    area: <Grid3X3 className="h-3 w-3" />,
                                                    sector: <Package className="h-3 w-3" />,
                                                    asset: <Key className="h-3 w-3" />
                                                };

                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="default" className="flex items-center gap-1">
                                                            {permission.scope && entityIcons[permission.scope] || null}
                                                            {permission.scope}
                                                        </Badge>
                                                    </div>
                                                );
                                            } else {
                                                // For other scoped permissions, show the sub-resource and action
                                                const parts = permission.name.split('.');
                                                const subResource = parts[1] || '';
                                                const action = permission.scope || parts[2] || '';

                                                return (
                                                    <div className="flex flex-col gap-1 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline">{subResource}</Badge>
                                                            <span className="text-muted-foreground">→</span>
                                                            <Badge variant="secondary">{action}</Badge>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        },
                                        headerAlign: 'right' as const,
                                    },
                                ]}
                                emptyMessage="No entity-scoped permissions assigned"
                            />
                        ) : (
                            <EmptyCard
                                icon={MapPin}
                                title="No entity-scoped permissions"
                                description="This role has no entity-scoped permissions assigned"
                            />
                        )}
                    </div>
                </div>
            </div>
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
        <div className="py-6">
            <div className="space-y-6">
                {canAssign && (
                    <div className="flex justify-end">
                        <Button
                            onClick={() => router.visit(route('roles.users.index', { role: role.id }))}
                        >
                            <Users className="mr-2 h-4 w-4" />
                            Manage Users
                        </Button>
                    </div>
                )}

                {users.length > 0 ? (
                    <EntityDataTable
                        data={users as unknown as Array<Record<string, unknown>>}
                        columns={[
                            {
                                key: 'name',
                                label: 'User',
                                render: (value: unknown, row: unknown) => {
                                    const user = row as User;
                                    return (
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
                                    );
                                },
                            },
                            {
                                key: 'actions',
                                label: '',
                                render: (value: unknown, row: unknown) => {
                                    const user = row as User;
                                    return (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.visit(route('users.show', { user: user.id }))}
                                        >
                                            View User
                                        </Button>
                                    );
                                },
                                headerAlign: 'right' as const,
                            },
                        ]}
                        onRowClick={(row: unknown) => {
                            const user = row as User;
                            router.visit(route('users.show', { user: user.id }));
                        }}
                        emptyMessage="No users assigned to this role"
                    />
                ) : (
                    <EmptyCard
                        icon={Users}
                        title="No users assigned"
                        description="This role has not been assigned to any users yet"
                    />
                )}

                {role.requires_entity && (
                    <div className="p-4 bg-muted/50 rounded-lg">
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
                    </div>
                )}
            </div>
        </div>
    );
}

function RoleHistory({ roleId: _roleId }: { roleId: number }) {
    // This would typically fetch audit logs from an API endpoint
    return (
        <div className="py-6">
            <EmptyCard
                icon={History}
                title="Audit history coming soon"
                description="Recent changes and activities for this role will be displayed here"
            />
        </div>
    );
}
