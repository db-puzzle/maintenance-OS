import React, { useState } from 'react';
import { Link, router, Head } from '@inertiajs/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, XCircle, RefreshCw, Copy, Eye, Trash2, Users } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ColumnConfig } from '@/types/shared';
import CreateInvitationDialog from '@/components/users/CreateInvitationDialog';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface Invitation extends Record<string, unknown> {
    id: number;
    email: string;
    token: string;
    url: string;
    inviter: {
        id: number;
        name: string;
    } | null;
    accepted_at: string | null;
    revoked_at: string | null;
    expires_at: string;
    status: 'pending' | 'accepted' | 'revoked' | 'expired';
    initial_role?: string;
    message?: string;
    can: {
        revoke: boolean;
        resend: boolean;
        delete: boolean;
    };
}
interface Role {
    id: number;
    name: string;
    display_name?: string;
    description?: string;
    permissions_count?: number;
    is_system: boolean;
}

interface Entity {
    id: number;
    name: string;
    type: 'plant' | 'area' | 'sector';
}

interface Props {
    invitations: {
        data: Invitation[];
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
        meta: Record<string, unknown>;
    };
    filters: {
        status?: string;
        search?: string;
    };
    stats: {
        total: number;
        pending: number;
        accepted: number;
        expired: number;
    };
    roles?: Role[];
    plants?: Entity[];
    areas?: Entity[];
    sectors?: Entity[];
}
function InvitationStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'accepted':
            return (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Aceito
                </Badge>
            );
        case 'pending':
            return (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Pendente
                </Badge>
            );
        case 'expired':
            return (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Expirado
                </Badge>
            );
        case 'revoked':
            return (
                <Badge variant="destructive">
                    Revogado
                </Badge>
            );
        default:
            return null;
    }
}
export default function InvitationsIndex({ invitations, filters, stats, roles = [], plants = [], areas = [], sectors = [] }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; invitation: Invitation | null }>({
        open: false,
        invitation: null,
    });
    const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; invitation: Invitation | null }>({
        open: false,
        invitation: null,
    });
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);

    const handleStatusChange = (value: string) => {
        setStatus(value);
        router.get(route('invitations.index'), { search, status: value }, { preserveState: true });
    };
    const handleRevoke = () => {
        if (!revokeDialog.invitation) return;
        router.post(
            route('invitations.revoke', revokeDialog.invitation.id),
            { reason: '' },
            {
                onSuccess: () => {
                    setRevokeDialog({ open: false, invitation: null });
                },
                onError: () => {
                    // Error message will be shown by the backend session flash
                },
            }
        );
    };
    const handleResend = (invitation: Invitation) => {
        router.post(
            route('invitations.resend', invitation.id),
            {},
            {
                onSuccess: () => {
                    // Success message will be shown by the backend session flash
                },
                onError: () => {
                    // Error message will be shown by the backend session flash
                },
            }
        );
    };
    const copyInvitationLink = (invitation: Invitation) => {
        // Use the URL provided by the backend
        const invitationUrl = invitation.url || route('invitations.accept', { token: invitation.token });
        navigator.clipboard.writeText(invitationUrl);
        toast.success('O link do convite foi copiado para a área de transferência.');
    };
    const columns: ColumnConfig<Invitation>[] = [
        {
            key: 'email',
            label: 'Email',
            sortable: true,
        },
        {
            key: 'inviter',
            label: 'Convidado por',
            render: (value: unknown) => {
                const inviter = value as { name: string } | null;
                return inviter?.name || '-';
            },
        },
        {
            key: 'status',
            label: 'Status',
            render: (value: unknown) => <InvitationStatusBadge status={value as string} />,
        },
        {
            key: 'expires_at',
            label: 'Expira em',
            render: (value: unknown, row: Invitation) => {
                const invitation = row;
                if (invitation.status === 'accepted' || invitation.status === 'revoked') {
                    return '-';
                }
                const expiresAt = new Date(value as string);
                const now = new Date();
                if (expiresAt < now) {
                    return 'Expirado';
                }
                return format(expiresAt, "d 'de' MMM 'às' HH:mm", { locale: ptBR });
            },
        },
    ];
    const renderActions = (row: Invitation) => {
        const invitation = row;
        return (
            <DropdownMenu
                open={dropdownOpen === invitation.id}
                onOpenChange={(open) => setDropdownOpen(open ? invitation.id : null)}
            >
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => {
                        setDropdownOpen(null); // Close dropdown first
                        setSelectedInvitation(invitation);
                    }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                    </DropdownMenuItem>
                    {invitation.status === 'pending' && (
                        <>
                            <DropdownMenuSeparator />
                            {invitation.can.resend && (
                                <DropdownMenuItem onClick={() => {
                                    setDropdownOpen(null); // Close dropdown first
                                    handleResend(invitation);
                                }}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reenviar email
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                                setDropdownOpen(null); // Close dropdown first
                                copyInvitationLink(invitation);
                            }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar link
                            </DropdownMenuItem>
                            {invitation.can.revoke && (
                                <DropdownMenuItem
                                    onClick={() => {
                                        setDropdownOpen(null); // Close dropdown first
                                        // Use setTimeout to ensure dropdown is fully closed before opening dialog
                                        setTimeout(() => {
                                            setRevokeDialog({ open: true, invitation });
                                        }, 0);
                                    }}
                                    className="text-destructive"
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Revogar convite
                                </DropdownMenuItem>
                            )}
                        </>
                    )}
                    {invitation.can.delete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setDropdownOpen(null); // Close dropdown first
                                    // Use setTimeout to ensure dropdown is fully closed before opening dialog
                                    setTimeout(() => {
                                        setDeleteDialog({ open: true, invitation });
                                    }, 0);
                                }}
                                className="text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir convite
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };
    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Usuários', href: '/users' },
        { title: 'Convites', href: '/invitations' },
    ];

    // Prepare pagination data
    const pagination = invitations.meta ? {
        current_page: invitations.meta.current_page as number,
        last_page: invitations.meta.last_page as number,
        per_page: invitations.meta.per_page as number,
        total: invitations.meta.total as number,
        from: invitations.meta.from as number | null,
        to: invitations.meta.to as number | null,
    } : {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: invitations.data.length,
        from: 1,
        to: invitations.data.length,
    };

    const handlePageChange = (page: number) => {
        router.get(route('invitations.index'), { search, status, page }, { preserveState: true, preserveScroll: true });
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(route('invitations.index'), { search, status, per_page: perPage, page: 1 }, { preserveState: true, preserveScroll: true });
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        router.get(route('invitations.index'), { search: value, status }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Convites de Usuário" />

            <ListLayout
                title="Convites de Usuário"
                description="Gerencie convites para novos usuários do sistema"
                searchPlaceholder="Buscar por email..."
                searchValue={search}
                onSearchChange={handleSearchChange}
                onCreateClick={() => setShowCreateDialog(true)}
                createButtonText="Convidar Novo Usuário"
                actions={
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('users.index')}>
                                <Users className="mr-2 h-4 w-4" />
                                Gerenciar Usuários
                            </Link>
                        </Button>
                    </div>
                }
            >
                <div className="-mt-4 space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <div className="rounded-lg bg-white p-4 shadow">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-sm text-gray-500">Total de convites</div>
                        </div>
                        <div className="rounded-lg bg-white p-4 shadow">
                            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
                            <div className="text-sm text-gray-500">Pendentes</div>
                        </div>
                        <div className="rounded-lg bg-white p-4 shadow">
                            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                            <div className="text-sm text-gray-500">Aceitos</div>
                        </div>
                        <div className="rounded-lg bg-white p-4 shadow">
                            <div className="text-2xl font-bold text-yellow-600">{stats.expired}</div>
                            <div className="text-sm text-gray-500">Expirados</div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Select value={status} onValueChange={handleStatusChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="pending">Pendentes</SelectItem>
                                <SelectItem value="accepted">Aceitos</SelectItem>
                                <SelectItem value="expired">Expirados</SelectItem>
                                <SelectItem value="revoked">Revogados</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <EntityDataTable
                        data={invitations.data}
                        columns={columns}
                        actions={renderActions}
                        emptyMessage="Nenhum convite encontrado."
                        maxHeight="calc(100vh - 400px)"
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
            {/* Revoke Dialog */}
            <AlertDialog open={revokeDialog.open} onOpenChange={(open) => setRevokeDialog({ open, invitation: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revogar convite</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja revogar este convite? Esta ação não pode ser desfeita.
                            {revokeDialog.invitation && (
                                <div className="mt-2 font-medium">
                                    Email: {revokeDialog.invitation.email}
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground">
                            Revogar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Invitation Details Modal */}
            {selectedInvitation && (
                <InvitationDetailsModal
                    invitation={selectedInvitation}
                    open={!!selectedInvitation}
                    onClose={() => setSelectedInvitation(null)}
                    onRevoke={(invitation) => setRevokeDialog({ open: true, invitation })}
                    onResend={handleResend}
                />
            )}
            {/* Create Invitation Dialog */}
            <CreateInvitationDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                roles={roles}
                plants={plants}
                areas={areas}
                sectors={sectors}
            />
            {/* Delete Dialog */}
            <EntityDeleteDialog
                open={deleteDialog.open}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteDialog({ open: false, invitation: null });
                    }
                }}
                entityLabel={deleteDialog.invitation ? `o convite para ${deleteDialog.invitation.email}` : 'o convite'}
                onConfirm={async () => {
                    if (!deleteDialog.invitation) return;

                    return new Promise((resolve, reject) => {
                        router.delete(
                            route('invitations.destroy', deleteDialog.invitation!.id),
                            {
                                onSuccess: () => {
                                    setDeleteDialog({ open: false, invitation: null });
                                    resolve();
                                },
                                onError: () => {
                                    reject();
                                },
                            }
                        );
                    });
                }}
                requireConfirmation={false}
            />
        </AppLayout>
    );
}
// Invitation Details Modal Component
function InvitationDetailsModal({
    invitation,
    open,
    onClose,
    onRevoke,
    onResend,
}: {
    invitation: Invitation;
    open: boolean;
    onClose: () => void;
    onRevoke: (invitation: Invitation) => void;
    onResend: (invitation: Invitation) => void;
}) {
    const copyInvitationLink = () => {
        const invitationUrl = invitation.url || route('invitations.accept', { token: invitation.token });
        navigator.clipboard.writeText(invitationUrl);
        toast.success('O link do convite foi copiado para a área de transferência.');
    };
    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>Detalhes do Convite</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="space-y-4">
                    <div>
                        <div className="text-sm font-medium text-gray-500">Destinatário</div>
                        <div className="mt-1">{invitation.email}</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-500">Convidado por</div>
                        <div className="mt-1">{invitation.inviter?.name || 'Sistema'}</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-500">Status</div>
                        <div className="mt-1">
                            <InvitationStatusBadge status={invitation.status} />
                        </div>
                    </div>
                    {invitation.initial_role && (
                        <div>
                            <div className="text-sm font-medium text-gray-500">Função inicial</div>
                            <div className="mt-1">{invitation.initial_role}</div>
                        </div>
                    )}
                    {invitation.message && (
                        <div>
                            <div className="text-sm font-medium text-gray-500">Mensagem pessoal</div>
                            <div className="mt-1 text-sm">{invitation.message}</div>
                        </div>
                    )}
                    <div>
                        <div className="text-sm font-medium text-gray-500">Expira em</div>
                        <div className="mt-1">
                            {format(new Date(invitation.expires_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                                locale: ptBR,
                            })}
                        </div>
                    </div>
                    {invitation.status === 'pending' && (
                        <div>
                            <div className="text-sm font-medium text-gray-500 mb-2">Link do convite</div>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={invitation.url || route('invitations.accept', { token: invitation.token })}
                                    className="text-xs"
                                />
                                <Button size="icon" variant="outline" onClick={copyInvitationLink}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <AlertDialogFooter>
                    {invitation.status === 'pending' && (
                        <>
                            {invitation.can.resend && (
                                <Button variant="outline" onClick={() => onResend(invitation)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reenviar
                                </Button>
                            )}
                            {invitation.can.revoke && (
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        onClose();
                                        onRevoke(invitation);
                                    }}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Revogar
                                </Button>
                            )}
                        </>
                    )}
                    <AlertDialogCancel>Fechar</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
} 