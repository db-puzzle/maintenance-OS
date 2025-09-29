import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { Shield, Plus, ChevronRight, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

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
];

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
    created_at: string;
    updated_at: string;
}

interface Props {
    roles: {
        data: Role[];
        links?: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
        meta?: {
            current_page: number;
            from: number;
            last_page: number;
            per_page: number;
            to: number;
            total: number;
        };
    };
    filters: {
        search?: string;
        type?: string;
    };
    can: {
        create: boolean;
        viewAny: boolean;
    };
}

export default function RoleIndex({ roles, filters, can }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [deleteRole, setDeleteRole] = useState<Role | null>(null);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        router.get(
            route('roles.index'),
            { search: value, type: selectedType },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleTypeFilter = (value: string) => {
        setSelectedType(value);
        router.get(
            route('roles.index'),
            { search: searchTerm, type: value },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleDelete = async () => {
        if (!deleteRole) return;

        router.delete(route('roles.destroy', { role: deleteRole.id }), {
            onSuccess: () => {
                toast.success('Role deleted successfully');
                setDeleteRole(null);
            },
            onError: (errors) => {
                toast.error(Object.values(errors).join(', '));
            },
        });
    };

    const handleDuplicate = (role: Role) => {
        router.post(route('roles.duplicate', { role: role.id }), {}, {
            onSuccess: () => {
                toast.success('Role duplicated successfully');
            },
            onError: (errors) => {
                toast.error(Object.values(errors).join(', '));
            },
        });
    };

    const systemRoles = roles.data.filter(role => role.is_system);
    const customRoles = roles.data.filter(role => !role.is_system);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Role Management" />

            <div className="px-4 sm:px-6 lg:px-8">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold">Roles</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Manage system and custom roles with their permissions
                                </p>
                            </div>
                            {can.create && (
                                <Button asChild>
                                    <Link href={route('roles.create')}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Role
                                    </Link>
                                </Button>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search roles..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="max-w-sm"
                                />
                            </div>
                            <Select value={selectedType} onValueChange={handleTypeFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="system">System Roles</SelectItem>
                                    <SelectItem value="custom">Custom Roles</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <ScrollArea className="h-[calc(100vh-250px)]">
                        <div className="space-y-6 pr-4">
                            {/* System Roles */}
                            {systemRoles.length > 0 && (
                                <div className="space-y-4">
                                    <h2 className="text-lg font-semibold">System Roles</h2>
                                    <div className="grid gap-4">
                                        {systemRoles.map((role) => (
                                            <RoleCard
                                                key={role.id}
                                                role={role}
                                                onDelete={() => setDeleteRole(role)}
                                                onDuplicate={() => handleDuplicate(role)}
                                                canUpdate={can.create}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom Roles */}
                            {customRoles.length > 0 && (
                                <div className="space-y-4">
                                    <h2 className="text-lg font-semibold">Custom Roles</h2>
                                    <div className="grid gap-4">
                                        {customRoles.map((role) => (
                                            <RoleCard
                                                key={role.id}
                                                role={role}
                                                onDelete={() => setDeleteRole(role)}
                                                onDuplicate={() => handleDuplicate(role)}
                                                canUpdate={can.create}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {roles.data.length === 0 && (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-lg font-medium">No roles found</p>
                                        <p className="text-sm text-muted-foreground">
                                            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new role'}
                                        </p>
                                        {can.create && !searchTerm && (
                                            <Button asChild className="mt-4">
                                                <Link href={route('roles.create')}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Create Role
                                                </Link>
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            <EntityDeleteDialog
                open={!!deleteRole}
                onOpenChange={(open) => !open && setDeleteRole(null)}
                onConfirm={handleDelete}
                entityLabel={deleteRole?.display_name || deleteRole?.name || ''}
            />
        </AppLayout>
    );
}

interface RoleCardProps {
    role: Role;
    onDelete: () => void;
    onDuplicate: () => void;
    canUpdate: boolean;
}

function RoleCard({ role, onDelete, onDuplicate, canUpdate }: RoleCardProps) {
    const additionalActions = [];

    if (canUpdate) {
        additionalActions.push({
            label: 'Duplicate',
            onClick: onDuplicate,
        });
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{role.icon || '👤'}</span>
                            <CardTitle className="text-lg">
                                {role.display_name || role.name}
                            </CardTitle>
                            {role.is_administrator && (
                                <Badge variant="secondary">Administrator</Badge>
                            )}
                            {role.is_system && (
                                <Badge variant="outline">System Role</Badge>
                            )}
                        </div>
                        <CardDescription>
                            {role.description || `${role.permissions_count} permissions • ${role.users_count} users`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            asChild
                        >
                            <Link
                                href={route('roles.show', { role: role.id })}
                                onClick={() => console.log('Navigating to role:', role.id, role)}
                            >
                                View Details
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                        {(canUpdate || role.can_be_deleted) && (
                            <EntityActionDropdown
                                onEdit={canUpdate && role.can_be_modified ? () => router.visit(route('roles.edit', { role: role.id })) : undefined}
                                onDelete={role.can_be_deleted ? onDelete : undefined}
                                additionalActions={additionalActions}
                            />
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Users</p>
                        <p className="font-medium">{role.users_count}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Assignments</p>
                        <p className="font-medium">{role.assignments_count}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Permissions</p>
                        <p className="font-medium">{role.permissions_count}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">
                            {role.requires_entity ? 'Entity-based' : 'Global'}
                        </p>
                    </div>
                </div>

                {role.entity_coverage && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Entity Coverage</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Plants</p>
                                <p className="font-medium">
                                    {role.entity_coverage.plants.covered} of {role.entity_coverage.plants.total}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Areas</p>
                                <p className="font-medium">
                                    {role.entity_coverage.areas.covered} of {role.entity_coverage.areas.total}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Sectors</p>
                                <p className="font-medium">
                                    {role.entity_coverage.sectors.covered} of {role.entity_coverage.sectors.total}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {role.requires_entity && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Settings className="h-4 w-4" />
                        <span>Entity-based role - requires assignment to specific entities</span>
                    </div>
                )}

                {role.is_administrator && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                        <Shield className="h-4 w-4" />
                        <span>Full system access - no entity assignment required</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
