import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, Key, Trash2 } from 'lucide-react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { CreateUserModal } from './CreateUserModal';
import { toast } from 'sonner';
import { ColumnConfig } from '@/types/shared';
import { type BreadcrumbItem } from '@/types';
// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'User Management',
        href: '/users',
    },
];
interface User {
    id: number;
    name: string;
    email: string;
    roles: Array<{ id: number; name: string }>;
    permissions: Array<{ id: number; name: string }>;
    created_at: string;
    updated_at: string;
}
interface Role {
    id: number;
    name: string;
}
interface Plant {
    id: number;
    name: string;
}
interface Props {
    users: {
        data: User[];
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
        role?: string;
        plant_id?: string;
        per_page?: number;
    };
    roles?: Role[];
    filterRoles?: Role[];
    plants?: Plant[];
    canCreateUsers: boolean;
    assignableEntities?: {
        plants: Array<{ id: number; name: string }>;
        areas: Array<{ id: number; name: string }>;
        sectors: Array<{ id: number; name: string }>;
    };
}
export default function UserIndex({ users, filters, roles, filterRoles, plants, canCreateUsers, assignableEntities }: Props) {
    const { props } = usePage<{
        flash: {
            success?: string;
            error?: string;
            warning?: string;
            info?: string;
        };
        auth: {
            user: {
                id: number;
                name: string;
                roles: Array<{ name: string }>;
            };
        };
    }>();
    const [search, setSearch] = useState(filters.search || '');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const handleSearch = (value: string) => {
        setSearch(value);
        router.get('/users', { ...filters, search: value }, { preserveState: true });
    };
    const handleFilter = (key: keyof typeof filters, value: string | null) => {
        const newFilters: Record<string, string | number | undefined> = { ...filters };
        if (value) {
            newFilters[key] = value;
        } else {
            delete newFilters[key];
        }
        router.get('/users', newFilters, { preserveState: true });
    };
    const handleDelete = (user: User) => {
        setDeletingUser(user);
        setIsDeleteDialogOpen(true);
    };
    const confirmDelete = async () => {
        if (!deletingUser) return;
        return new Promise<void>((resolve, reject) => {
            router.delete(route('users.destroy', { user: deletingUser.id }), {
                onSuccess: (page) => {
                    // Check for flash messages from the backend
                    const pageProps = page.props as typeof props;
                    if (pageProps.flash?.error) {
                        toast.error(pageProps.flash.error);
                        // Reject the promise to keep the dialog open
                        reject(new Error(pageProps.flash.error));
                    } else {
                        toast.success(pageProps.flash?.success || 'User deleted successfully');
                        resolve();
                    }
                },
                onError: (errors) => {
                    // Handle validation errors or other errors
                    if (typeof errors === 'object' && errors.error) {
                        toast.error(errors.error);
                    } else {
                        toast.error('Failed to delete user');
                    }
                    reject(errors);
                },
                preserveScroll: true,
                preserveState: true,
            });
        });
    };
    const handleDeleteDialogChange = (open: boolean) => {
        setIsDeleteDialogOpen(open);
        if (!open) {
            // Clear the deleting user when dialog closes
            setDeletingUser(null);
        }
    };
    const handlePageChange = (page: number) => {
        router.get('/users', { ...filters, page }, { preserveState: true, preserveScroll: true });
    };
    const handlePerPageChange = (perPage: number) => {
        router.get('/users', { ...filters, per_page: perPage, page: 1 }, { preserveState: true, preserveScroll: true });
    };
    // Define columns for EntityDataTable
    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Name',
            sortable: false,
            width: 'w-[200px]',
            render: (_, row) => {
                const user = row as unknown as User;
                return (
                    <div className="font-medium">{user.name}</div>
                );
            },
        },
        {
            key: 'email',
            label: 'Email',
            sortable: false,
            width: 'w-[250px]',
            render: (_, row) => {
                const user = row as unknown as User;
                return (
                    <div>{user.email}</div>
                );
            },
        },
        {
            key: 'roles',
            label: 'Roles',
            sortable: false,
            width: 'w-[250px]',
            render: (_, row) => {
                const user = row as unknown as User;
                return (
                    <div className="flex flex-wrap gap-1">
                        {user.roles?.map((role) => (
                            <Badge
                                key={role.id}
                                variant="secondary"
                                className="text-xs"
                            >
                                {role.name}
                            </Badge>
                        ))}
                    </div>
                );
            },
        },
        {
            key: 'permissions',
            label: 'Permissions',
            sortable: false,
            width: 'w-[150px]',
            render: (_, row) => {
                const user = row as unknown as User;
                return (
                    <Badge variant="secondary">
                        {user.permissions?.length || 0} permissions
                    </Badge>
                );
            },
        },
        {
            key: 'created_at',
            label: 'Created',
            sortable: false,
            width: 'w-[150px]',
            render: (value) => {
                return (
                    <div className="text-sm text-muted-foreground">
                        {new Date(value as string).toLocaleDateString()}
                    </div>
                );
            },
        },
    ];
    // Prepare pagination data
    const pagination = users.meta ? {
        current_page: users.meta.current_page,
        last_page: users.meta.last_page,
        per_page: users.meta.per_page,
        total: users.meta.total,
        from: users.meta.from,
        to: users.meta.to,
    } : {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: users.data.length,
        from: 1,
        to: users.data.length,
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />
            <ListLayout
                title="User Management"
                description="Manage users, roles, and permissions"
                searchPlaceholder="Search by name or email..."
                searchValue={search}
                onSearchChange={handleSearch}
                onCreateClick={canCreateUsers ? () => setIsCreateModalOpen(true) : undefined}
                createButtonText="Add User"
                actions={
                    <div className="flex items-center gap-2">
                        {props.auth?.user?.roles?.some(role => role.name === 'Administrator') && (
                            <Button asChild variant="outline" size="sm">
                                <Link href={route('users.deleted')}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Deleted Users
                                </Link>
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="-mt-4 space-y-4">
                    {/* Additional Filters */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            value={filters.role || 'all'}
                            onValueChange={(value) => handleFilter('role', value === 'all' ? null : value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                {(filterRoles || roles)?.map((role) => (
                                    <SelectItem key={role.id} value={role.name}>
                                        {role.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {plants && plants.length > 0 && (
                            <Select
                                value={filters.plant_id || 'all'}
                                onValueChange={(value) => handleFilter('plant_id', value === 'all' ? null : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Plants" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Plants</SelectItem>
                                    {plants?.map((plant) => (
                                        <SelectItem key={plant.id} value={plant.id.toString()}>
                                            {plant.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    {/* Users Table */}
                    <EntityDataTable
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data={users.data as any}
                        columns={columns}
                        loading={false}
                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                        onRowClick={(user: any) => router.visit(`/users/${user.id}`)}
                        emptyMessage="No users found"
                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                        actions={(user: any) => (
                            <EntityActionDropdown
                                onEdit={() => router.visit(`/users/${user.id}/edit`)}
                                onDelete={() => handleDelete(user as User)}
                                additionalActions={[
                                    {
                                        label: 'View Details',
                                        icon: <Eye className="h-4 w-4" />,
                                        onClick: () => router.visit(`/users/${user.id}`),
                                    },
                                    {
                                        label: 'Manage Permissions',
                                        icon: <Key className="h-4 w-4" />,
                                        onClick: () => router.visit(`/users/${user.id}/permissions`),
                                    },
                                ]}
                            />
                        )}
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
                open={isDeleteDialogOpen}
                onOpenChange={handleDeleteDialogChange}
                entityLabel={deletingUser?.name || ''}
                onConfirm={confirmDelete}
            />
            {canCreateUsers && roles && assignableEntities && (
                <CreateUserModal
                    open={isCreateModalOpen}
                    onOpenChange={setIsCreateModalOpen}
                    roles={roles}
                    assignableEntities={assignableEntities}
                />
            )}
        </AppLayout>
    );
} 