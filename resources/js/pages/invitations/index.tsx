import React, { useState } from 'react';
import { Link, router, Head } from '@inertiajs/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, MoreHorizontal, XCircle, RefreshCw, Copy, Eye } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import PermissionGuard from '@/components/PermissionGuard';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
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

interface Invitation extends Record<string, unknown> {
    id: number;
    email: string;
    token: string;
    url: string;
    invited_by: {
        id: number;
        name: string;
    };
    accepted_at: string | null;
    revoked_at: string | null;
    expires_at: string;
    status: 'pending' | 'accepted' | 'revoked' | 'expired';
    initial_role?: string;
    message?: string;
    can: {
        revoke: boolean;
        resend: boolean;
    };
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

export default function InvitationsIndex({ invitations, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; invitation: Invitation | null }>({
        open: false,
        invitation: null,
    });
    const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('invitations.index'), { search, status }, { preserveState: true });
    };

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
                    toast.success('O convite foi revogado com sucesso.');
                    setRevokeDialog({ open: false, invitation: null });
                },
                onError: () => {
                    toast.error('Não foi possível revogar o convite.');
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
                    toast.success(`Convite reenviado para ${invitation.email}`);
                },
                onError: () => {
                    toast.error('Não foi possível reenviar o convite.');
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

    const columns: ColumnConfig[] = [
        {
            key: 'email',
            label: 'Email',
            sortable: true,
        },
        {
            key: 'invited_by',
            label: 'Convidado por',
            render: (value: unknown) => {
                const invitedBy = value as { name: string } | null;
                return invitedBy?.name || '-';
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
            render: (value: unknown, row: Record<string, unknown>) => {
                const invitation = row as Invitation;
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

    const renderActions = (row: Record<string, unknown>) => {
        const invitation = row as Invitation;
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setSelectedInvitation(invitation)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                    </DropdownMenuItem>
                    {invitation.status === 'pending' && (
                        <>
                            <DropdownMenuSeparator />
                            {invitation.can.resend && (
                                <DropdownMenuItem onClick={() => handleResend(invitation)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reenviar email
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => copyInvitationLink(invitation)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar link
                            </DropdownMenuItem>
                            {invitation.can.revoke && (
                                <DropdownMenuItem
                                    onClick={() => setRevokeDialog({ open: true, invitation })}
                                    className="text-destructive"
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Revogar convite
                                </DropdownMenuItem>
                            )}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Usuários', href: '#' },
        { title: 'Convites', href: '/invitations' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Convites de Usuário" />

            <div className="bg-background flex-shrink-0 border-b">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-semibold">Convites de Usuário</h2>
                            <p className="text-sm text-muted-foreground">
                                Gerencie convites para novos usuários do sistema
                            </p>
                        </div>
                        <PermissionGuard permission="users.invite">
                            <Link href={route('invitations.create')}>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Convidar Novo Usuário
                                </Button>
                            </Link>
                        </PermissionGuard>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-6 px-6">
                {/* Stats */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
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
                <div className="mb-6">
                    <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row">
                        <Input
                            type="search"
                            placeholder="Buscar por email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="sm:max-w-xs"
                        />
                        <Select value={status} onValueChange={handleStatusChange}>
                            <SelectTrigger className="sm:max-w-xs">
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
                        <Button type="submit">Buscar</Button>
                    </form>
                </div>

                {/* Table */}
                <div className="rounded-lg bg-white shadow">
                    <EntityDataTable
                        data={invitations.data}
                        columns={columns}
                        actions={renderActions}
                        emptyMessage="Nenhum convite encontrado."
                    />
                </div>

                {/* Pagination */}
                {invitations.links && invitations.links.length > 3 && (
                    <div className="mt-4 flex justify-center">
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                            {invitations.links.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${link.active
                                        ? 'z-10 bg-primary text-white'
                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                        } ${index === 0 ? 'rounded-l-md' : ''} ${index === invitations.links.length - 1 ? 'rounded-r-md' : ''
                                        } ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </nav>
                    </div>
                )}
            </div>

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
                        <div className="mt-1">{invitation.invited_by.name}</div>
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