import CreateShiftSheet from '@/components/CreateShiftSheet';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { ColumnConfig } from '@/types/shared';
import { Head, router } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { useState } from 'react';

interface Break {
    start_time: string;
    end_time: string;
}

interface Shift {
    start_time: string;
    end_time: string;
    active: boolean;
    breaks: Break[];
}

interface Schedule {
    weekday: string;
    shifts: Shift[];
}

interface ShiftData {
    id: number;
    name: string;
    plant_count?: number;
    area_count?: number;
    sector_count?: number;
    asset_count?: number;
    schedules: Schedule[];
    total_work_hours?: number;
    total_work_minutes?: number;
    total_break_hours?: number;
    total_break_minutes?: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Hierarquia de Ativos',
        href: '/asset-hierarchy',
    },
    {
        title: 'Turnos',
        href: '/asset-hierarchy/shifts',
    },
];

interface Props {
    shifts: {
        data: ShiftData[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        search: string;
        sort: string;
        direction: 'asc' | 'desc';
        per_page: number;
    };
}

export default function Shifts({ shifts: initialShifts, filters }: Props) {
    const entityOps = useEntityOperations<ShiftData>({
        entityName: 'shift',
        entityLabel: 'Turno',
        routes: {
            index: 'asset-hierarchy.shifts',
            show: 'asset-hierarchy.shifts.show',
            destroy: 'asset-hierarchy.shifts.destroy',
            checkDependencies: 'asset-hierarchy.shifts.check-dependencies',
        },
    });

    const [search, setSearch] = useState(filters.search || '');

    const { sort, direction, handleSort } = useSorting({
        routeName: 'asset-hierarchy.shifts',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
    });

    const data = initialShifts.data;
    const pagination = {
        current_page: initialShifts.current_page,
        last_page: initialShifts.last_page,
        per_page: initialShifts.per_page,
        total: initialShifts.total,
        from: initialShifts.from,
        to: initialShifts.to,
    };

    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value) => <div className="font-medium">{value as string}</div>,
        },
        {
            key: 'associations',
            label: 'Associações',
            sortable: false,
            width: 'w-[300px]',
            render: (value, row) => {
                const shift = row as unknown as ShiftData;
                const counts = [];
                if ((shift.plant_count || 0) > 0) counts.push(`${shift.plant_count} planta(s)`);
                if ((shift.area_count || 0) > 0) counts.push(`${shift.area_count} área(s)`);
                if ((shift.sector_count || 0) > 0) counts.push(`${shift.sector_count} setor(es)`);
                if ((shift.asset_count || 0) > 0) counts.push(`${shift.asset_count} ativo(s)`);
                return (
                    <span className="text-muted-foreground text-sm">
                        {counts.length > 0 ? counts.join(', ') : 'Nenhuma associação'}
                    </span>
                );
            },
        },
        {
            key: 'total_work_hours',
            label: 'Horas de Trabalho',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => {
                const shift = row as unknown as ShiftData;
                const hours = shift.total_work_hours || 0;
                const minutes = shift.total_work_minutes || 0;
                return `${hours}h ${minutes}m`;
            },
        },
        {
            key: 'total_break_hours',
            label: 'Horas de Intervalo',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => {
                const shift = row as unknown as ShiftData;
                const hours = shift.total_break_hours || 0;
                const minutes = shift.total_break_minutes || 0;
                return `${hours}h ${minutes}m`;
            },
        },
    ];

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('asset-hierarchy.shifts'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('asset-hierarchy.shifts'),
            { ...filters, search, sort, direction, page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('asset-hierarchy.shifts'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleShiftCreated = (shift: ShiftData) => {
        // Refresh the page to show the new shift
        router.reload();
    };

    const handleShiftUpdated = (shift: ShiftData) => {
        // Refresh the page to show the updated shift
        router.reload();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Turnos" />

            <ListLayout
                title="Turnos"
                description="Gerencie os turnos de trabalho"
                searchValue={search}
                onSearchChange={handleSearch}
                onCreateClick={() => entityOps.setEditSheetOpen(true)}
                createButtonText="Adicionar"
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={false}
                        onRowClick={(shift) => router.visit(route('asset-hierarchy.shifts.show', { id: (shift as unknown as ShiftData).id }))}
                        onSort={handleSort}
                        actions={(shift) => (
                            <EntityActionDropdown
                                onEdit={() => entityOps.handleEdit(shift as unknown as ShiftData)}
                                onDelete={() => entityOps.handleDelete(shift as unknown as ShiftData)}
                            />
                        )}
                        emptyMessage="Nenhum turno cadastrado"
                    />

                    <EntityPagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onPerPageChange={handlePerPageChange}
                    />
                </div>
            </ListLayout>

            <CreateShiftSheet
                initialShift={entityOps.editingItem ? {
                    id: entityOps.editingItem.id,
                    name: entityOps.editingItem.name,
                    schedules: entityOps.editingItem.schedules,
                } : undefined}
                isOpen={entityOps.isEditSheetOpen}
                onOpenChange={entityOps.setEditSheetOpen}
                onSuccess={entityOps.editingItem ? handleShiftUpdated : handleShiftCreated}
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
                entityName="turno"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
} 