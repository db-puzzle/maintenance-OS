import { ColumnVisibility } from '@/components/data-table';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Badge } from '@/components/ui/badge';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { ColumnConfig } from '@/types/shared';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';
import { PartSubstitutionDialog } from '@/components/parts/PartSubstitutionDialog';
// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Peças',
        href: '/parts',
    },
];
interface Manufacturer {
    id: number;
    name: string;
}
interface Part {
    id: number;
    part_number: string;
    name: string;
    description: string | null;
    unit_cost: number;
    available_quantity: number;
    minimum_quantity: number;
    maximum_quantity: number | null;
    location: string | null;
    manufacturer_id: number | null;
    manufacturer?: Manufacturer | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}
// Simplified Part interface for substitution dialog
interface SimplePart {
    id: number;
    part_number: string;
    name: string;
    available_quantity: number;
    minimum_quantity: number;
}
interface Props {
    parts: {
        data: Part[];
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
export default function PartsIndex({ parts: initialParts, filters }: Props) {
    const entityOps = useEntityOperations<Part>({
        entityName: 'part',
        entityLabel: 'Peça',
        routes: {
            index: 'parts.index',
            show: 'parts.show',
            destroy: 'parts.destroy',
            checkDependencies: 'parts.check-dependencies',
        },
    });
    const [search, setSearch] = useState(filters.search || '');
    const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false);
    const [availableParts] = useState<Part[]>([]);
    // Use centralized sorting hook
    const { sort, direction, handleSort } = useSorting({
        routeName: 'parts.index',
        initialSort: filters.sort || 'part_number',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
    });
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('partsColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            part_number: true,
            name: true,
            unit_cost: true,
            available_quantity: true,
            minimum_quantity: false,
            location: true,
            manufacturer: false,
            active: true,
        };
    });
    // Use data from server
    const data = initialParts.data;
    const pagination = {
        current_page: initialParts.current_page,
        last_page: initialParts.last_page,
        per_page: initialParts.per_page,
        total: initialParts.total,
        from: initialParts.from,
        to: initialParts.to,
    };
    const columns: ColumnConfig[] = [
        {
            key: 'part_number',
            label: 'Part Number',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => {
                const part = row as unknown as Part;
                return part.part_number;
            },
        },
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => {
                const part = row as unknown as Part;
                return (
                    <div>
                        <div className="font-medium">{part.name}</div>
                        {part.description && (
                            <div className="text-muted-foreground text-sm">
                                {part.description.length > 40 ? `${part.description.substring(0, 40)}...` : part.description}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'unit_cost',
            label: 'Custo Unitário',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => {
                const part = row as unknown as Part;
                const cost = typeof part.unit_cost === 'number' ? part.unit_cost : parseFloat(part.unit_cost || '0');
                return `R$ ${cost.toFixed(2)}`;
            },
        },
        {
            key: 'available_quantity',
            label: 'Qtd. Disponível',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => {
                const part = row as unknown as Part;
                const availableQty = typeof part.available_quantity === 'number' ? part.available_quantity : parseInt(part.available_quantity || '0');
                const minQty = typeof part.minimum_quantity === 'number' ? part.minimum_quantity : parseInt(part.minimum_quantity || '0');
                return (
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            availableQty < minQty && 'text-destructive'
                        )}>
                            {availableQty}
                        </span>
                        {availableQty < minQty && (
                            <Badge variant="destructive" className="h-5">
                                Baixo
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'minimum_quantity',
            label: 'Qtd. Mínima',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => {
                const part = row as unknown as Part;
                const minQty = typeof part.minimum_quantity === 'number' ? part.minimum_quantity : parseInt(part.minimum_quantity || '0');
                return minQty;
            },
        },
        {
            key: 'location',
            label: 'Localização',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => {
                const part = row as unknown as Part;
                return part.location || '-';
            },
        },
        {
            key: 'manufacturer',
            label: 'Fabricante',
            sortable: true,
            width: 'w-[200px]',
            render: (value, row) => {
                const part = row as unknown;
                return part.manufacturer?.name || '-';
            },
        },
        {
            key: 'active',
            label: 'Status',
            sortable: true,
            width: 'w-[100px]',
            render: (value, row) => {
                const part = row as unknown as Part;
                return part.active ? 'Ativo' : 'Inativo';
            },
        },
    ];
    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('partsColumnsVisibility', JSON.stringify(newVisibility));
    };
    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('parts.index'),
            { search: value, sort, direction, per_page: filters.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handlePageChange = (page: number) => {
        router.get(route('parts.index'), { ...filters, search, sort, direction, page }, { preserveState: true, preserveScroll: true });
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('parts.index'),
            { ...filters, search, sort, direction, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handleEdit = (part: Part) => {
        router.get(route('parts.show', { part: part.id }));
    };
    const handleCreate = () => {
        router.get(route('parts.create'));
    };
    const handleSubstitutionConfirm = (
        substitutePart: SimplePart,
        updateMode: 'all' | 'selected',
        selectedIds: number[]
    ) => {
        if (!entityOps.deletingItem) return;
        axios.post(route('parts.substitute-and-delete', { part: entityOps.deletingItem.id }), {
            substitute_part_id: substitutePart.id,
            update_mode: updateMode,
            selected_work_order_ids: selectedIds
        }).then(() => {
            toast.success('Peça substituída e excluída com sucesso');
            setShowSubstitutionDialog(false);
            router.reload();
        }).catch(() => {
            toast.error('Erro ao substituir peça');
        });
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Peças" />
            <ListLayout
                title="Peças"
                description="Gerencie as peças e estoque do sistema"
                searchValue={search}
                onSearchChange={handleSearch}
                createButtonText="Nova Peça"
                onCreateClick={handleCreate}
                actions={
                    <div className="flex items-center gap-2">
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
                        data={data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={false}
                        onRowClick={(row) => {
                            const part = row as unknown as Part;
                            router.visit(route('parts.show', { part: part.id }));
                        }}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(row) => {
                            const part = row as unknown as Part;
                            return (
                                <EntityActionDropdown
                                    onEdit={() => handleEdit(part)}
                                    onDelete={() => entityOps.handleDelete(part)}
                                />
                            );
                        }}
                    />
                    <EntityPagination pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
                </div>
            </ListLayout>
            {entityOps.deletingItem && entityOps.dependencies && showSubstitutionDialog && (
                <PartSubstitutionDialog
                    open={showSubstitutionDialog}
                    onOpenChange={setShowSubstitutionDialog}
                    part={{
                        id: entityOps.deletingItem.id,
                        part_number: entityOps.deletingItem.part_number,
                        name: entityOps.deletingItem.name,
                        available_quantity: entityOps.deletingItem.available_quantity,
                        minimum_quantity: entityOps.deletingItem.minimum_quantity,
                    }}
                    dependencies={entityOps.dependencies}
                    availableParts={availableParts.map(part => ({
                        id: part.id,
                        part_number: part.part_number,
                        name: part.name,
                        available_quantity: part.available_quantity,
                        minimum_quantity: part.minimum_quantity,
                    }))}
                    onConfirm={handleSubstitutionConfirm}
                />
            )}
            <EntityDeleteDialog
                open={entityOps.isDeleteDialogOpen}
                onOpenChange={entityOps.setDeleteDialogOpen}
                entityLabel={`a peça ${entityOps.deletingItem?.name || ''}`}
                onConfirm={entityOps.confirmDelete}
                confirmationValue={entityOps.deletingItem?.part_number}
                confirmationLabel={`Digite o Part Number (${entityOps.deletingItem?.part_number}) para confirmar`}
            />
            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="peça"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}