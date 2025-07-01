import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RotateCcw, Trash2, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';

import { ColumnConfig } from '@/types/shared';

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
    {
        title: 'Deleted Users',
        href: route('users.deleted'),
    },
];

interface DeletedUser {
    id: number;
    name: string;
    email: string;
    deleted_at: string;
    roles: Array<{ id: number; name: string }>;
    permissions: Array<{ id: number; name: string }>;
}

interface Props {
    deletedUsers: {
        data: DeletedUser[];
        links?: Record<string, unknown>;
        meta?: Record<string, unknown>;
    };
    filters: {
        search?: string;
    };
}

export default function DeletedUsers({ deletedUsers, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(route('users.deleted'), { search: value }, { preserveState: true });
    };

    const handleRestore = (user: DeletedUser) => {
        router.post(route('users.restore', { user: user.id }), {}, {
            onSuccess: () => {
                toast.success(`${user.name} foi restaurado com sucesso.`);
            },
            onError: () => {
                toast.error('Não foi possível restaurar o usuário.');
            },
        });
    };

    const handleForceDelete = (user: DeletedUser) => {
        router.delete(route('users.force-delete', { user: user.id }), {
            onSuccess: () => {
                toast.success(`${user.name} foi excluído permanentemente.`);
            },
            onError: () => {
                toast.error('Não foi possível excluir o usuário permanentemente.');
            },
        });
    };

    const handlePageChange = (page: number) => {
        router.get(route('users.deleted'), { ...filters, search, page }, { preserveState: true, preserveScroll: true });
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(route('users.deleted'), { ...filters, search, per_page: perPage, page: 1 }, { preserveState: true, preserveScroll: true });
    };

    // Define columns for EntityDataTable
    const columns: ColumnConfig[] = [
        {
            key: 'user',
            label: 'User',
            sortable: false,
            width: 'w-[300px]',
            render: (_, row) => {
                const user = row as unknown as DeletedUser;
                return (
                    <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                );
            },
        },
        {
            key: 'roles',
            label: 'Funções',
            sortable: false,
            width: 'w-[200px]',
            render: (_, row) => {
                const user = row as unknown as DeletedUser;
                return (
                    <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                            <Badge key={role.id} variant="secondary">
                                {role.name}
                            </Badge>
                        ))}
                    </div>
                );
            },
        },
        {
            key: 'deleted_at',
            label: 'Excluído há',
            sortable: false,
            width: 'w-[150px]',
            render: (value) => {
                return (
                    <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(value as string), {
                            addSuffix: true,
                            locale: ptBR,
                        })}
                    </div>
                );
            },
        },
    ];

    // Prepare pagination data
    const meta = deletedUsers.meta as Record<string, number> | undefined;
    const pagination = meta ? {
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        per_page: meta.per_page || 10,
        total: meta.total || 0,
        from: meta.from || null,
        to: meta.to || null,
    } : {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: deletedUsers.data.length,
        from: 1,
        to: deletedUsers.data.length,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuários Excluídos" />

            <ListLayout
                title="Usuários Excluídos"
                description="Gerencie usuários que foram excluídos do sistema"
                searchPlaceholder="Buscar por nome ou email..."
                searchValue={search}
                onSearchChange={handleSearch}
                createButtonText="Voltar para Usuários"
                onCreateClick={() => router.visit(route('users.index'))}
                actions={
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('users.index')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar para Usuários
                            </Link>
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Deleted Users Table */}
                    <EntityDataTable
                        data={deletedUsers.data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={false}
                        emptyMessage="Nenhum usuário excluído encontrado"
                        actions={(user: unknown) => {
                            const deletedUser = user as DeletedUser;
                            return (
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRestore(deletedUser)}
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Restaurar
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir Permanentemente
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    Excluir permanentemente?
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta ação não pode ser desfeita. O usuário{' '}
                                                    <strong>{deletedUser.name}</strong> será permanentemente
                                                    removido do sistema, incluindo todos os seus dados.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleForceDelete(deletedUser)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Excluir Permanentemente
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            );
                        }}
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
        </AppLayout>
    );
} 