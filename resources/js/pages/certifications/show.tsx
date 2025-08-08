import React from 'react';
import { router, Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import CertificationFormComponent from '@/components/certifications/CertificationFormComponent';
import { ColumnConfig } from '@/types/shared';
import { User, Building2, Users, AlertCircle } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
interface CertificationUser {
    id: number;
    name: string;
    email: string;
    issued_at: string | null;
    expires_at: string | null;
    certificate_number: string | null;
    is_expired: boolean;
}
interface Certification {
    id: number;
    name: string;
    description: string | null;
    issuing_organization: string;
    validity_period_days: number | null;
    active: boolean;
    created_at: string;
    updated_at: string;
    users: CertificationUser[];
}
interface PageProps {
    certification: Certification;
    can: {
        update: boolean;
        delete: boolean;
    };
    activeTab?: string;
}
export default function CertificationShow({ certification, can, activeTab = 'informacoes' }: PageProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Certificações',
            href: '/certifications',
        },
        {
            title: certification.name,
            href: '#',
        },
    ];
    const handleEditSuccess = () => {
        // Reload the page to refresh the data
        router.reload();
    };
    const userColumns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            render: (value, row) => {
                const user = row as unknown as CertificationUser;
                return (
                    <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                );
            },
        },
        {
            key: 'certificate_number',
            label: 'Número do Certificado',
            width: 'w-48',
            render: (value) => (value || '-') as React.ReactNode,
        },
        {
            key: 'issued_at',
            label: 'Data de Emissão',
            width: 'w-32',
            render: (value) => {
                if (!value) return '-';
                return new Date(value as string).toLocaleDateString('pt-BR');
            },
        },
        {
            key: 'expires_at',
            label: 'Data de Validade',
            width: 'w-32',
            render: (value, row) => {
                const user = row as unknown as CertificationUser;
                if (!value) return '-';
                const date = new Date(value as string);
                const dateString = date.toLocaleDateString('pt-BR');
                if (user.is_expired) {
                    return (
                        <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-500">{dateString}</span>
                        </div>
                    );
                }
                return dateString;
            },
        },
        {
            key: 'status',
            label: 'Status',
            width: 'w-32',
            render: (value, row) => {
                const user = row as unknown as CertificationUser;
                return user.is_expired ? (
                    <Badge variant="destructive">Expirado</Badge>
                ) : (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">Válido</Badge>
                );
            },
        },
    ];
    const validUsers = certification.users.filter(u => !u.is_expired).length;
    const expiredUsers = certification.users.filter(u => u.is_expired).length;
    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{certification.issuing_organization}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{certification.users.length} {certification.users.length === 1 ? 'usuário' : 'usuários'}</span>
            </span>
            {certification.users.length > 0 && (
                <>
                    <span className="text-muted-foreground">•</span>
                    <span className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">{validUsers} válidos</Badge>
                        {expiredUsers > 0 && <Badge variant="destructive">{expiredUsers} expirados</Badge>}
                    </span>
                </>
            )}
            <span className="text-muted-foreground">•</span>
            <span>
                {certification.active ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">Ativa</Badge>
                ) : (
                    <Badge variant="secondary">Inativa</Badge>
                )}
            </span>
        </span>
    );
    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <CertificationFormComponent
                        certification={certification}
                        initialMode="view"
                        onSuccess={handleEditSuccess}
                        canUpdate={can.update}
                        canDelete={can.delete}
                    />
                </div>
            ),
        },
        {
            id: 'usuarios',
            label: 'Usuários Certificados',
            content: (
                <div className="mt-4 space-y-4">
                    {certification.users.length > 0 ? (
                        <EntityDataTable
                            data={certification.users as unknown as Record<string, unknown>[]}
                            columns={userColumns}
                            emptyMessage="Nenhum usuário possui esta certificação"
                            onRowClick={(row) => router.get(route('users.show', (row as unknown as CertificationUser).id))}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <User className="mb-4 h-12 w-12 text-muted-foreground" />
                            <p className="text-lg font-medium">Nenhum usuário possui esta certificação</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Os usuários podem adicionar esta certificação em seus perfis
                            </p>
                        </div>
                    )}
                </div>
            ),
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Certificação ${certification.name}`} />
            <ShowLayout
                title={certification.name}
                subtitle={subtitle}
                editRoute=""
                tabs={tabs}
                defaultActiveTab={activeTab}
            />
        </AppLayout>
    );
}