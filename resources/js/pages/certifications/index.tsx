import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import CertificationSheet from '@/components/certifications/CertificationSheet';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnConfig } from '@/types/shared';
import { Plus, Search, Shield } from 'lucide-react';

interface Certification {
    id: number;
    name: string;
    description: string | null;
    issuing_organization: string;
    validity_period_days: number | null;
    active: boolean;
    users_count: number;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    certifications: {
        data: Certification[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        search?: string;
        active?: string;
    };
    can: {
        create: boolean;
    };
}

export default function CertificationsIndex({ certifications, filters, can }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [activeFilter, setActiveFilter] = useState(filters.active || '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editingCertification, setEditingCertification] = useState<Certification | null>(null);
    const [deleteCertification, setDeleteCertification] = useState<Certification | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [dependencies, setDependencies] = useState<any>(null);
    const [dependenciesOpen, setDependenciesOpen] = useState(false);

    const { delete: destroy } = useForm();

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(route('certifications.index'), { search: value, active: activeFilter }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleActiveFilter = (value: string) => {
        setActiveFilter(value);
        router.get(route('certifications.index'), { search, active: value }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleEdit = (certification: Certification) => {
        setEditingCertification(certification);
        setCreateOpen(true);
    };

    const handleDelete = async (certification: Certification) => {
        setDeleteCertification(certification);
        
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
        if (deleteCertification) {
            destroy(route('certifications.destroy', deleteCertification.id), {
                onFinish: () => {
                    setDeleteDialogOpen(false);
                    setDeleteCertification(null);
                },
            });
        }
    };

    const formatValidityPeriod = (days: number | null) => {
        if (!days) return 'Sem validade';
        if (days === 365) return '1 ano';
        if (days % 365 === 0) return `${days / 365} anos`;
        if (days === 30) return '1 mês';
        if (days % 30 === 0) return `${Math.floor(days / 30)} meses`;
        return `${days} dias`;
    };

    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            render: (value, row) => {
                const cert = row as Certification;
                return (
                    <div className="font-medium">
                        {cert.name}
                        {cert.active ? (
                            <Badge variant="success" className="ml-2">Ativa</Badge>
                        ) : (
                            <Badge variant="secondary" className="ml-2">Inativa</Badge>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'issuing_organization',
            label: 'Organização Emissora',
            sortable: true,
        },
        {
            key: 'validity_period_days',
            label: 'Validade',
            width: 'w-32',
            render: (value) => formatValidityPeriod(value as number | null),
        },
        {
            key: 'users_count',
            label: 'Usuários',
            width: 'w-24',
            headerAlign: 'center',
            render: (value) => (
                <div className="text-center">{value}</div>
            ),
        },
        {
            key: 'created_at',
            label: 'Criado em',
            width: 'w-40',
            sortable: true,
        },
    ];

    const actions = (row: Record<string, unknown>) => {
        const certification = row as Certification;
        return (
            <EntityActionDropdown
                viewUrl={route('certifications.show', certification.id)}
                onEdit={() => handleEdit(certification)}
                onDelete={() => handleDelete(certification)}
                canView={true}
                canEdit={can.create}
                canDelete={can.create}
            />
        );
    };

    return (
        <AppLayout title="Certificações">
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Certificações</CardTitle>
                                    <CardDescription>
                                        Gerencie as certificações disponíveis no sistema
                                    </CardDescription>
                                </div>
                                {can.create && (
                                    <Button onClick={() => setCreateOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nova Certificação
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 flex gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Buscar certificações..."
                                        value={search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Select value={activeFilter} onValueChange={handleActiveFilter}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Todos</SelectItem>
                                        <SelectItem value="1">Ativas</SelectItem>
                                        <SelectItem value="0">Inativas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <EntityDataTable
                                data={certifications.data}
                                columns={columns}
                                actions={actions}
                                emptyMessage="Nenhuma certificação encontrada"
                            />

                            <div className="mt-4">
                                <EntityPagination
                                    pagination={certifications}
                                    onPageChange={(page) => {
                                        router.get(route('certifications.index'), { ...filters, page }, {
                                            preserveState: true,
                                            preserveScroll: true,
                                        });
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <CertificationSheet
                open={createOpen}
                onOpenChange={setCreateOpen}
                certification={editingCertification}
                onClose={() => {
                    setCreateOpen(false);
                    setEditingCertification(null);
                }}
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
                description={`Tem certeza que deseja excluir a certificação "${deleteCertification?.name}"? Esta ação não pode ser desfeita.`}
            />
        </AppLayout>
    );
}