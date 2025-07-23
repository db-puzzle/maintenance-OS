import { ColumnVisibility } from '@/components/data-table';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityPagination } from '@/components/shared/EntityPagination';
import CertificationSheet from '@/components/certifications/CertificationSheet';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { ColumnConfig } from '@/types/shared';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Certificações',
        href: '/certifications',
    },
];

interface Props {
    certifications: {
        data: Certification[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        search: string;
        active: string;
        sort: string;
        direction: 'asc' | 'desc';
        per_page: number;
    };
    can: {
        create: boolean;
    };
}

export default function CertificationsIndex({ certifications: initialCertifications, filters, can }: Props) {
    const entityOps = useEntityOperations<Certification>({
        entityName: 'certification',
        entityLabel: 'Certificação',
        routes: {
            index: 'certifications.index',
            show: 'certifications.show',
            destroy: 'certifications.destroy',
            checkDependencies: 'certifications.check-dependencies',
        },
    });

    const [search, setSearch] = useState(filters.search);
    const [activeFilter, setActiveFilter] = useState(filters.active || 'all');

    // Use centralized sorting hook
    const sortingResult = useSorting({
        routeName: 'certifications.index',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            active: activeFilter !== 'all' ? activeFilter : '',
            per_page: filters.per_page,
        },
    });
    const sortColumn = sortingResult.sort;
    const sortDirection = sortingResult.direction;
    const handleSort = sortingResult.handleSort;

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('certificationsColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            issuing_organization: true,
            validity_period_days: true,
            users_count: true,
        };
    });

    // Use data from server - cast to Record<string, unknown>[] for EntityDataTable
    const data = initialCertifications.data as unknown as Record<string, unknown>[];
    const pagination = {
        current_page: initialCertifications.current_page,
        last_page: initialCertifications.last_page,
        per_page: initialCertifications.per_page,
        total: initialCertifications.total,
        from: initialCertifications.from,
        to: initialCertifications.to,
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
            width: 'w-[300px]',
            render: (value, row) => {
                const cert = row as unknown as Certification;
                return (
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            {cert.name}
                            {cert.active ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Ativa</Badge>
                            ) : (
                                <Badge variant="secondary">Inativa</Badge>
                            )}
                        </div>
                        {cert.description && <div className="text-muted-foreground text-sm">{cert.description}</div>}
                    </div>
                );
            },
        },
        {
            key: 'issuing_organization',
            label: 'Organização Emissora',
            sortable: true,
            width: 'w-[200px]',
            render: (value) => value as string,
        },
        {
            key: 'validity_period_days',
            label: 'Validade',
            width: 'w-[120px]',
            render: (value) => formatValidityPeriod(value as number | null),
        },
        {
            key: 'users_count',
            label: 'Usuários',
            sortable: true,
            width: 'w-[100px]',
            headerAlign: 'center',
            render: (value) => (
                <div className="text-center">{value as number}</div>
            ),
        },
    ];

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('certificationsColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('certifications.index'),
            { search: value, active: activeFilter, sort: sortColumn, direction: sortDirection, per_page: filters.per_page || 10 },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleActiveFilter = (value: string) => {
        setActiveFilter(value);
        const activeParam = value === 'all' ? '' : value;
        router.get(
            route('certifications.index'),
            { search, active: activeParam, sort: sortColumn, direction: sortDirection, per_page: filters.per_page || 10 },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('certifications.index'),
            { ...(filters || {}), search, active: activeFilter, sort: sortColumn, direction: sortDirection, page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('certifications.index'),
            { ...(filters || {}), search, active: activeFilter, sort: sortColumn, direction: sortDirection, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Certificações" />

            <ListLayout
                title="Certificações"
                description="Gerencie as certificações disponíveis no sistema"
                searchValue={search}
                onSearchChange={handleSearch}
                onCreateClick={can.create ? () => entityOps.setEditSheetOpen(true) : undefined}
                createButtonText="Nova Certificação"
                actions={
                    <div className="flex items-center gap-2">
                        <Select value={activeFilter} onValueChange={handleActiveFilter}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="1">Ativas</SelectItem>
                                <SelectItem value="0">Inativas</SelectItem>
                            </SelectContent>
                        </Select>
                        <ColumnVisibility
                            columns={columns.map((col) => ({
                                id: col.key,
                                header: col.label,
                                cell: () => null,
                                width: 'w-auto',
                            }))}
                            columnVisibility={columnVisibility}
                            onColumnVisibilityChange={handleColumnVisibilityChange}
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={data}
                        columns={columns}
                        loading={false}
                        onRowClick={(certification) => router.visit(route('certifications.show', { id: (certification as unknown as Certification).id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(certification) => (
                            <EntityActionDropdown
                                onEdit={can.create ? () => entityOps.handleEdit(certification as unknown as Certification) : undefined}
                                onDelete={can.create ? () => entityOps.handleDelete(certification as unknown as Certification) : undefined}
                            />
                        )}
                        emptyMessage="Nenhuma certificação encontrada"
                    />

                    <EntityPagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onPerPageChange={handlePerPageChange}
                    />
                </div>
            </ListLayout>

            <CertificationSheet
                open={entityOps.isEditSheetOpen}
                onOpenChange={entityOps.setEditSheetOpen}
                certification={entityOps.editingItem || undefined}
                onClose={() => {
                    entityOps.setEditSheetOpen(false);
                }}
            />

            <EntityDeleteDialog
                open={entityOps.isDeleteDialogOpen}
                onOpenChange={entityOps.setDeleteDialogOpen}
                entityLabel={entityOps.deletingItem?.name || ''}
                onConfirm={entityOps.confirmDelete}
            />

            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="certificação"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}