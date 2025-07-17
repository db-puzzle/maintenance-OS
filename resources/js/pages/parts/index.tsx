import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Package, Plus } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BreadcrumbItem } from '@/types';
import { HeadingLarge } from '@/components/HeadingLarge';
import EntityDataTable from '@/components/shared/EntityDataTable';
import EntityPagination from '@/components/shared/EntityPagination';
import { useSorting } from '@/hooks/use-sorting';
import { useDebounce } from '@/hooks/use-debounce';
import { useEntityOperations } from '@/hooks/use-entity-operations';
import { CreatePartSheet } from '@/components/parts/CreatePartSheet';
import { PartSubstitutionDialog } from '@/components/parts/PartSubstitutionDialog';
import { toast } from 'sonner';
import { ColumnVisibility } from '@/components/ColumnVisibility';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    supplier: string | null;
    manufacturer: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

interface PartsPageProps {
    parts: {
        data: Part[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        search: string;
        sort_field: string;
        sort_direction: 'asc' | 'desc';
        per_page: number;
    };
}

export default function PartsIndex({ parts, filters }: PartsPageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [loading, setLoading] = useState(false);
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | null>(null);
    const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false);
    const [availableParts, setAvailableParts] = useState<Part[]>([]);
    const debouncedSearch = useDebounce(search, 500);
    const { sortField, sortDirection, handleSort } = useSorting(filters.sort_field, filters.sort_direction);
    
    const [columnVisibility, setColumnVisibility] = useState({
        part_number: true,
        name: true,
        unit_cost: true,
        available_quantity: true,
        minimum_quantity: false,
        location: true,
        supplier: true,
        manufacturer: false,
        active: true,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Peças', href: '/parts' },
    ];

    const entityOps = useEntityOperations<Part>({
        entityName: 'part',
        entityLabel: 'Peça',
        routes: {
            index: 'parts.index',
            show: 'parts.show',
            destroy: 'parts.destroy',
            checkDependencies: 'parts.check-dependencies',
        },
        onDependenciesFound: (dependencies) => {
            // If there are work order dependencies, show substitution dialog
            if (dependencies.dependencies.work_orders?.total > 0) {
                // Load available parts for substitution
                axios.get(route('parts.index', { per_page: 1000, active: true }))
                    .then(response => {
                        setAvailableParts(response.data.parts.data);
                        setShowSubstitutionDialog(true);
                    });
                return true; // Prevent default dependencies dialog
            }
            return false; // Show default dependencies dialog
        }
    });

    const handleSubstitutionConfirm = async (
        substitutePart: Part, 
        updateMode: 'all' | 'selected', 
        selectedIds: number[]
    ) => {
        try {
            await axios.post(route('parts.substitute-and-delete', entityOps.deletingItem!.id), {
                substitute_part_id: substitutePart.id,
                update_mode: updateMode,
                selected_work_order_ids: selectedIds
            });
            
            toast.success('Peça substituída e excluída com sucesso');
            setShowSubstitutionDialog(false);
            router.reload();
        } catch (error) {
            toast.error('Erro ao substituir peça');
        }
    };

    useEffect(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (sortField) params.append('sort_field', sortField);
        if (sortDirection) params.append('sort_direction', sortDirection);
        params.append('per_page', filters.per_page.toString());

        const url = `/parts${params.toString() ? '?' + params.toString() : ''}`;
        
        setLoading(true);
        router.visit(url, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setLoading(false),
        });
    }, [debouncedSearch, sortField, sortDirection]);

    const handlePageChange = (page: number) => {
        router.visit(`/parts?page=${page}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handlePerPageChange = (perPage: number) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (sortField) params.append('sort_field', sortField);
        if (sortDirection) params.append('sort_direction', sortDirection);
        params.append('per_page', perPage.toString());

        router.visit(`/parts?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleEdit = (part: Part) => {
        setEditingPart(part);
        setIsCreateSheetOpen(true);
    };

    const handleDelete = (part: Part) => {
        entityOps.handleDelete(part);
    };

    const columns = [
        {
            key: 'part_number',
            label: 'Número da Peça',
            sortable: true,
            visible: columnVisibility.part_number,
        },
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            visible: columnVisibility.name,
            render: (part: Part) => (
                <div>
                    <div className="font-medium">{part.name}</div>
                    {part.description && (
                        <div className="text-sm text-muted-foreground">{part.description}</div>
                    )}
                </div>
            ),
        },
        {
            key: 'unit_cost',
            label: 'Custo Unitário',
            sortable: true,
            visible: columnVisibility.unit_cost,
            render: (part: Part) => `R$ ${part.unit_cost.toFixed(2)}`,
        },
        {
            key: 'available_quantity',
            label: 'Qtd. Disponível',
            sortable: true,
            visible: columnVisibility.available_quantity,
            render: (part: Part) => (
                <div className="flex items-center gap-2">
                    <span className={cn(
                        part.available_quantity < part.minimum_quantity && 'text-destructive'
                    )}>
                        {part.available_quantity}
                    </span>
                    {part.available_quantity < part.minimum_quantity && (
                        <Badge variant="destructive" className="h-5">
                            Baixo
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'minimum_quantity',
            label: 'Qtd. Mínima',
            sortable: true,
            visible: columnVisibility.minimum_quantity,
        },
        {
            key: 'location',
            label: 'Localização',
            sortable: true,
            visible: columnVisibility.location,
        },
        {
            key: 'supplier',
            label: 'Fornecedor',
            sortable: true,
            visible: columnVisibility.supplier,
        },
        {
            key: 'manufacturer',
            label: 'Fabricante',
            sortable: true,
            visible: columnVisibility.manufacturer,
        },
        {
            key: 'active',
            label: 'Status',
            sortable: true,
            visible: columnVisibility.active,
            render: (part: Part) => (
                <Badge variant={part.active ? 'default' : 'secondary'}>
                    {part.active ? 'Ativo' : 'Inativo'}
                </Badge>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Peças" />

            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <HeadingLarge 
                        title="Peças" 
                        description="Gerenciar peças e estoque" 
                        icon={Package} 
                    />
                    <Button 
                        size="sm" 
                        onClick={() => {
                            setEditingPart(null);
                            setIsCreateSheetOpen(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Peça
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Buscar por número, nome, fornecedor ou fabricante..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-md"
                        />
                    </div>
                    <ColumnVisibility
                        columns={Object.keys(columnVisibility)}
                        columnVisibility={columnVisibility}
                        onColumnVisibilityChange={setColumnVisibility}
                        columnLabels={{
                            part_number: 'Número da Peça',
                            name: 'Nome',
                            unit_cost: 'Custo Unitário',
                            available_quantity: 'Qtd. Disponível',
                            minimum_quantity: 'Qtd. Mínima',
                            location: 'Localização',
                            supplier: 'Fornecedor',
                            manufacturer: 'Fabricante',
                            active: 'Status',
                        }}
                    />
                </div>

                <EntityDataTable
                    data={parts.data}
                    columns={columns}
                    loading={loading}
                    onRowClick={(part) => router.visit(route('parts.show', part.id))}
                    columnVisibility={columnVisibility}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    actions={(part) => ({
                        onEdit: () => handleEdit(part),
                        onDelete: () => handleDelete(part),
                    })}
                />

                <EntityPagination 
                    pagination={parts} 
                    onPageChange={handlePageChange} 
                    onPerPageChange={handlePerPageChange} 
                />

                <CreatePartSheet
                    open={isCreateSheetOpen}
                    onOpenChange={setIsCreateSheetOpen}
                    part={editingPart}
                    onSuccess={() => {
                        setIsCreateSheetOpen(false);
                        setEditingPart(null);
                        router.reload();
                    }}
                />

                {entityOps.deletingItem && entityOps.dependencies && showSubstitutionDialog && (
                    <PartSubstitutionDialog
                        open={showSubstitutionDialog}
                        onOpenChange={setShowSubstitutionDialog}
                        part={entityOps.deletingItem}
                        dependencies={entityOps.dependencies}
                        availableParts={availableParts}
                        onConfirm={handleSubstitutionConfirm}
                    />
                )}

                {entityOps.renderDialogs()}
            </div>
        </AppLayout>
    );
}