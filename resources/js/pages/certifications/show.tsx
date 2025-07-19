import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import ShowLayout from '@/layouts/show-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import CertificationSheet from '@/components/certifications/CertificationSheet';
import { ColumnConfig } from '@/types/shared';
import { Edit, Trash2, User, Calendar, Building2, Clock } from 'lucide-react';

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
}

export default function CertificationShow({ certification, can }: PageProps) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [dependencies, setDependencies] = useState<any>(null);
    const [dependenciesOpen, setDependenciesOpen] = useState(false);

    const { delete: destroy } = useForm();

    const handleDelete = async () => {
        // Check dependencies first
        const response = await fetch(route('certifications.check-dependencies', certification.id));
        const data = await response.json();
        
        if (!data.canDelete) {
            setDependencies(data);
            setDependenciesOpen(true);
        } else {
            setDeleteDialogOpen(true);
        }
    };

    const confirmDelete = () => {
        destroy(route('certifications.destroy', certification.id));
    };

    const formatValidityPeriod = (days: number | null) => {
        if (!days) return 'Sem validade';
        if (days === 365) return '1 ano';
        if (days % 365 === 0) return `${days / 365} anos`;
        if (days === 30) return '1 mês';
        if (days % 30 === 0) return `${Math.floor(days / 30)} meses`;
        return `${days} dias`;
    };

    const userColumns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            render: (value, row) => {
                const user = row as CertificationUser;
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
            render: (value) => value || '-',
        },
        {
            key: 'issued_at',
            label: 'Data de Emissão',
            width: 'w-32',
            render: (value) => value || '-',
        },
        {
            key: 'expires_at',
            label: 'Validade',
            width: 'w-32',
            render: (value, row) => {
                const user = row as CertificationUser;
                if (!value) return 'Sem validade';
                return (
                    <div>
                        <div>{value}</div>
                        {user.is_expired && (
                            <Badge variant="destructive" className="mt-1">Expirado</Badge>
                        )}
                    </div>
                );
            },
        },
    ];

    const detailItems = [
        {
            label: 'Organização Emissora',
            value: certification.issuing_organization,
            icon: Building2,
        },
        {
            label: 'Período de Validade',
            value: formatValidityPeriod(certification.validity_period_days),
            icon: Clock,
        },
        {
            label: 'Status',
            value: certification.active ? (
                <Badge variant="success">Ativa</Badge>
            ) : (
                <Badge variant="secondary">Inativa</Badge>
            ),
        },
        {
            label: 'Criado em',
            value: certification.created_at,
            icon: Calendar,
        },
        {
            label: 'Atualizado em',
            value: certification.updated_at,
            icon: Calendar,
        },
    ];

    const breadcrumbs = [
        { label: 'Certificações', href: route('certifications.index') },
        { label: certification.name },
    ];

    const actions = (
        <>
            {can.update && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            )}
            {can.delete && (
                <Button variant="outline" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                </Button>
            )}
        </>
    );

    return (
        <ShowLayout
            title={certification.name}
            subtitle={certification.description || 'Sem descrição'}
            breadcrumbs={breadcrumbs}
            actions={actions}
            detailItems={detailItems}
        >
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Usuários certificados</CardTitle>
                            <CardDescription>
                                {certification.users.length} {certification.users.length === 1 ? 'usuário possui' : 'usuários possuem'} esta certificação
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {certification.users.length > 0 ? (
                        <EntityDataTable
                            data={certification.users}
                            columns={userColumns}
                            emptyMessage="Nenhum usuário possui esta certificação"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <User className="mb-4 h-12 w-12 text-muted-foreground" />
                            <p className="text-lg font-medium">Nenhum usuário possui esta certificação</p>
                            <p className="text-sm text-muted-foreground">
                                Os usuários podem adicionar esta certificação em seus perfis
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <CertificationSheet
                open={editOpen}
                onOpenChange={setEditOpen}
                certification={certification}
                onClose={() => setEditOpen(false)}
            />

            {dependencies && (
                <EntityDependenciesDialog
                    open={dependenciesOpen}
                    onOpenChange={setDependenciesOpen}
                    entityName="certificação"
                    dependencies={dependencies}
                />
            )}

            <EntityDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title="Excluir Certificação"
                description={`Tem certeza que deseja excluir a certificação "${certification.name}"? Esta ação não pode ser desfeita.`}
            />
        </ShowLayout>
    );
}