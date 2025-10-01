import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import { Copy, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
import { type ColumnConfig, type PaginationMeta } from '@/types/shared';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Roles',
        href: '#',
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
        current_page?: number;
        last_page?: number;
        per_page?: number;
        total?: number;
        from?: number | null;
        to?: number | null;
    };
    filters: {
        search?: string;
        type?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
        per_page?: number;
    };
    can: {
        create: boolean;
        viewAny: boolean;
    };
}

export default function RoleIndex({ roles, filters = {}, can }: Props) {
    // Ensure filters has default values
    const safeFilters = {
        search: filters?.search || '',
        type: filters?.type || 'all',
        sort: filters?.sort || 'name',
        direction: filters?.direction || 'asc',
        per_page: filters?.per_page || 10,
    };

    const [searchTerm, setSearchTerm] = useState(safeFilters.search);
    const [selectedType, setSelectedType] = useState(safeFilters.type);

    // Prepare pagination meta first (needed for other hooks)
    const pagination: PaginationMeta = {
        current_page: roles.current_page || roles.meta?.current_page || 1,
        last_page: roles.last_page || roles.meta?.last_page || 1,
        per_page: roles.per_page || roles.meta?.per_page || safeFilters.per_page,
        total: roles.total || roles.meta?.total || 0,
        from: roles.from || roles.meta?.from || null,
        to: roles.to || roles.meta?.to || null,
    };

    // Use entity operations hook
    const entityOps = useEntityOperations<Role>({
        entityName: 'role',
        entityLabel: 'Role',
        routes: {
            index: 'roles.index',
            show: 'roles.show',
            destroy: 'roles.destroy',
            checkDependencies: 'roles.check-dependencies',
        },
        routeParameterName: 'role',
    });

    // Use sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'roles.index',
        initialSort: safeFilters.sort,
        initialDirection: safeFilters.direction as 'asc' | 'desc',
        additionalParams: {
            search: searchTerm,
            type: selectedType,
            per_page: pagination.per_page,
        },
    });

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        router.get(
            route('roles.index'),
            { search: value, type: selectedType, sort, direction, per_page: pagination.per_page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleTypeFilter = (value: string) => {
        setSelectedType(value);
        router.get(
            route('roles.index'),
            { search: searchTerm, type: value, sort, direction, per_page: pagination.per_page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('roles.index'),
            { ...filters, search: searchTerm, type: selectedType, sort, direction, page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('roles.index'),
            { ...filters, search: searchTerm, type: selectedType, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
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

    // Filter roles based on selected type
    const filteredRoles = selectedType === 'system'
        ? roles.data.filter(role => role.is_system)
        : selectedType === 'custom'
            ? roles.data.filter(role => !role.is_system)
            : roles.data;

    // Define columns for EntityDataTable
    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Role',
            sortable: true,
            width: 'w-[300px]',
            render: (_, row) => {
                const role = row as unknown as Role;
                return (
                    <div className="font-medium">
                        {role.display_name || role.name}
                    </div>
                );
            },
        },
        {
            key: 'type',
            label: 'Type',
            sortable: true,
            width: 'w-[250px]',
            render: (_, row) => {
                const role = row as unknown as Role;
                return (
                    <div className="flex items-center gap-2">
                        {role.is_administrator && (
                            <Badge variant="secondary">Administrator</Badge>
                        )}
                        {role.is_system && (
                            <Badge variant="outline">System Role</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                            {role.requires_entity ? 'Entity-based' : 'Global'}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'users_count',
            label: 'Users',
            sortable: true,
            width: 'w-[80px]',
            render: (_, row) => {
                const role = row as unknown as Role;
                return <div className="text-center">{role.users_count || 0}</div>;
            },
        },
        {
            key: 'assignments_count',
            label: 'Assignments',
            sortable: true,
            width: 'w-[120px]',
            render: (_, row) => {
                const role = row as unknown as Role;
                return <div className="text-center">{role.assignments_count || 0}</div>;
            },
        },
        {
            key: 'permissions_count',
            label: 'Permissions',
            sortable: true,
            width: 'w-[120px]',
            render: (_, row) => {
                const role = row as unknown as Role;
                return <div className="text-center">{role.permissions_count || 0}</div>;
            },
        },
        {
            key: 'entity_coverage',
            label: 'Entity Coverage',
            sortable: false,
            width: 'w-[300px]',
            render: (_, row) => {
                const role = row as unknown as Role;
                if (!role.entity_coverage || !role.requires_entity) return '-';
                return (
                    <div className="flex gap-4 text-sm">
                        <span>Plants: {role.entity_coverage.plants.covered}/{role.entity_coverage.plants.total}</span>
                        <span>Areas: {role.entity_coverage.areas.covered}/{role.entity_coverage.areas.total}</span>
                        <span>Sectors: {role.entity_coverage.sectors.covered}/{role.entity_coverage.sectors.total}</span>
                    </div>
                );
            },
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gerenciamento de Funções" />

            <ListLayout
                title="Gerenciamento de Funções"
                description="Gerencie funções do sistema e funções personalizadas com suas permissões"
                searchPlaceholder="Search roles..."
                searchValue={searchTerm}
                onSearchChange={handleSearch}
                onCreateClick={can.create ? () => router.visit(route('roles.create')) : undefined}
                createButtonText="Create Role"
                actions={
                    <div className="flex items-center gap-2">
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
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('users.index')}>
                                <Shield className="mr-2 h-4 w-4" />
                                Manage Users
                            </Link>
                        </Button>
                    </div>
                }
            >
                <div className="-mt-4 space-y-4">
                    {/* Data Table */}
                    <EntityDataTable
                        data={filteredRoles as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={false}
                        onRowClick={(row) => {
                            router.visit(route('roles.show', { role: (row as unknown as Role).id }));
                        }}
                        onSort={handleSort}
                        maxHeight="calc(100vh - 300px)"
                        actions={(row) => {
                            const role = row as unknown as Role;
                            const additionalActions = [];

                            if (can.create) {
                                additionalActions.push({
                                    label: 'Duplicate',
                                    icon: <Copy className="h-4 w-4" />,
                                    onClick: () => handleDuplicate(role),
                                });
                            }

                            return (
                                <EntityActionDropdown
                                    onEdit={can.create && role.can_be_modified ? () => router.visit(route('roles.edit', { role: role.id })) : undefined}
                                    onDelete={role.can_be_deleted ? () => entityOps.handleDelete(role) : undefined}
                                    additionalActions={additionalActions}
                                />
                            );
                        }}
                        emptyMessage={searchTerm ? 'No roles found matching your criteria' : 'No roles found'}
                    />

                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <EntityPagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onPerPageChange={handlePerPageChange}
                            perPageOptions={[10, 20, 30, 50, 100]}
                        />
                    )}
                </div>
            </ListLayout>

            <EntityDeleteDialog
                open={entityOps.isDeleteDialogOpen}
                onOpenChange={entityOps.setDeleteDialogOpen}
                entityLabel={`the role ${entityOps.deletingItem?.display_name || entityOps.deletingItem?.name || ''}`}
                onConfirm={entityOps.confirmDelete}
            />

            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="role"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}

