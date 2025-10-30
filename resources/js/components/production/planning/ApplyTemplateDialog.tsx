import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
    Search,
    Check,
    Info,
    Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { ColumnConfig } from '@/types/shared';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatNumber } from '@/utils/number';

interface RouteTemplate {
    id: number;
    name: string;
    description?: string;
    category?: string;
    item_category?: string;
    steps: Array<{
        id: number;
        sequence: number;
        name: string;
        work_cell_id?: number | null;
        is_required?: boolean;
        setup_time_minutes?: number;
        cycle_time_minutes?: number;
    }>;
    usage_count: number;
    last_used_at?: string;
    created_by: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    manufacturingOrderIds: number[];
    itemCategory?: string;
    itemNumber?: string;
    itemName?: string;
    routeTemplates: RouteTemplate[];
    onTemplateApplied?: () => void;
}

export default function ApplyTemplateDialog({
    open,
    onOpenChange,
    manufacturingOrderIds,
    itemCategory,
    itemNumber,
    itemName,
    routeTemplates,
    onTemplateApplied,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [filterByCategory, setFilterByCategory] = useState(true);
    const [isApplying, setIsApplying] = useState(false);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [dialogKey, setDialogKey] = useState(0);

    // Effect to handle when dialog opens/closes via prop change
    useEffect(() => {
        if (open) {
            // Reset selection when dialog opens
            setSelectedTemplateId(null);
            setIsApplying(false);
            // Increment key to force EntityDataTable to remount
            setDialogKey(prev => prev + 1);
        } else {
            // Also reset when closing to ensure clean state
            setSearchQuery('');
            setSelectedTemplateId(null);
            setPage(1);
            setIsApplying(false);
        }
    }, [open]);

    // Filter templates based on search query and category filter
    const filteredTemplates = useMemo(() => {
        let templates = [...routeTemplates];

        // Filter by category if enabled and itemCategory is provided
        if (filterByCategory && itemCategory) {
            templates = templates.filter(template =>
                !template.item_category || template.item_category === itemCategory
            );
        } else if (filterByCategory && !itemCategory) {
            // When no item category exists, only show templates without category
            templates = templates.filter(template => !template.item_category);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            templates = templates.filter(template =>
                template.name.toLowerCase().includes(query) ||
                template.description?.toLowerCase().includes(query) ||
                template.created_by.name.toLowerCase().includes(query)
            );
        }

        return templates;
    }, [routeTemplates, searchQuery, filterByCategory, itemCategory]);

    // Paginated templates
    const paginatedTemplates = useMemo(() => {
        const start = (page - 1) * perPage;
        const end = start + perPage;
        return filteredTemplates.slice(start, end);
    }, [filteredTemplates, page, perPage]);

    const pagination = useMemo(() => ({
        current_page: page,
        last_page: Math.ceil(filteredTemplates.length / perPage),
        per_page: perPage,
        total: filteredTemplates.length,
        from: filteredTemplates.length > 0 ? (page - 1) * perPage + 1 : null,
        to: filteredTemplates.length > 0 ? Math.min(page * perPage, filteredTemplates.length) : null,
    }), [filteredTemplates, page, perPage]);

    // Define columns for templates table
    const columns: ColumnConfig<RouteTemplate>[] = useMemo(() => [
        {
            key: 'selection',
            label: '',
            width: 'w-[40px]',
            render: (_value: unknown, template: RouteTemplate) => (
                selectedTemplateId === template.id ? <Check className="h-4 w-4 text-primary" /> : null
            )
        },
        {
            key: 'name',
            label: 'Nome do Template',
            width: 'w-[250px]',
            render: (value: unknown, template: RouteTemplate) => (
                <div>
                    <div className="font-medium">{value as string}</div>
                    {template.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{template.description}</div>
                    )}
                </div>
            )
        },
        {
            key: 'steps',
            label: 'Etapas',
            width: 'w-[80px]',
            render: (_value: unknown, template: RouteTemplate) => (
                <Badge variant="secondary" className="text-xs">
                    {template.steps.length} etapas
                </Badge>
            )
        },
        {
            key: 'item_category',
            label: 'Categoria',
            width: 'w-[120px]',
            render: (value: unknown) => {
                if (!value) return <span className="text-muted-foreground">Todas</span>;
                return <Badge variant="outline">{value as string}</Badge>;
            }
        },
        {
            key: 'usage_count',
            label: 'Uso',
            width: 'w-[80px]',
            render: (value: unknown) => (
                <span className="text-sm">{formatNumber(value as number)} vezes</span>
            )
        },
        {
            key: 'created_by',
            label: 'Criado Por',
            width: 'w-[150px]',
            render: (_value: unknown, template: RouteTemplate) => (
                <div className="text-sm">
                    <div>{template.created_by.name}</div>
                    <div className="text-xs text-muted-foreground">
                        {new Date(template.created_at).toLocaleDateString()}
                    </div>
                </div>
            )
        },
        {
            key: 'last_used_at',
            label: 'Último Uso',
            width: 'w-[120px]',
            render: (value: unknown) => {
                if (!value) return <span className="text-muted-foreground">Nunca</span>;
                return (
                    <span className="text-sm text-muted-foreground">
                        {new Date(value as string).toLocaleDateString()}
                    </span>
                );
            }
        }
    ], [selectedTemplateId]);

    // Handle template selection
    const handleTemplateSelection = (selectedIds: Set<string | number>) => {
        const selectedId = Array.from(selectedIds)[0];
        setSelectedTemplateId(selectedId ? Number(selectedId) : null);
    };

    // Apply the selected template
    const handleApplyTemplate = () => {
        if (!selectedTemplateId) {
            return;
        }

        setIsApplying(true);

        if (manufacturingOrderIds.length === 1) {
            // Single order - use the existing endpoint
            router.post(
                route('production.orders.apply-template', { order: manufacturingOrderIds[0] }),
                {
                    template_id: selectedTemplateId,
                },
                {
                    onSuccess: () => {
                        setIsApplying(false);
                        onOpenChange(false);
                        onTemplateApplied?.();
                    },
                    onError: () => {
                        setIsApplying(false);
                    },
                    preserveState: true,
                    preserveScroll: true,
                }
            );
        } else {
            // Multiple orders - use the bulk endpoint
            router.post(
                route('production.orders.bulk-apply-template'),
                {
                    order_ids: manufacturingOrderIds,
                    template_id: selectedTemplateId,
                },
                {
                    onSuccess: () => {
                        setIsApplying(false);
                        onOpenChange(false);
                        onTemplateApplied?.();
                    },
                    onError: () => {
                        setIsApplying(false);
                    },
                    preserveState: true,
                    preserveScroll: true,
                }
            );
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            // Reset state when closing
            setSearchQuery('');
            setSelectedTemplateId(null);
            setPage(1);
            setIsApplying(false);
        } else {
            // Also reset selection when opening to ensure clean state
            setSelectedTemplateId(null);
            setIsApplying(false);
            // Increment key to force EntityDataTable to remount
            setDialogKey(prev => prev + 1);
        }
        onOpenChange(open);
    };

    const selectedTemplate = useMemo(() => {
        return routeTemplates.find(t => t.id === selectedTemplateId);
    }, [selectedTemplateId, routeTemplates]);

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="!max-w-[70vw] w-[70vw] h-[80vh] flex flex-col p-0">
                    <DialogHeader className="mt-2 px-6 py-4 border-b">
                        <DialogTitle>
                            Aplicar Template de Rota
                            {manufacturingOrderIds.length > 1 && (
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    ({manufacturingOrderIds.length} ordens selecionadas)
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {manufacturingOrderIds.length === 1 && itemNumber && itemName && (
                                <span className="ml-1 font-medium">
                                    Item: {itemNumber} - {itemName}
                                </span>
                            )}
                            {manufacturingOrderIds.length === 1 && itemCategory && (
                                <span className="ml-1 text-muted-foreground">
                                    | Categoria: {itemCategory}
                                </span>
                            )}
                            {manufacturingOrderIds.length > 1 && (
                                <span className="ml-1 text-muted-foreground">
                                    Aplicar o mesmo template a múltiplas ordens de manufatura
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col overflow-hidden px-6">
                        <div className="flex-1 overflow-y-auto py-4">
                            {/* Search and Filter Bar */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar templates por nome, descrição ou criador..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setPage(1); // Reset to first page on search
                                        }}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="filter-category"
                                        checked={filterByCategory}
                                        onCheckedChange={setFilterByCategory}
                                        disabled={!itemCategory}
                                    />
                                    <Label htmlFor="filter-category" className="text-sm cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            Filtrar por categoria do item
                                        </div>
                                    </Label>
                                </div>
                            </div>

                            {/* Templates Table */}
                            <div className="mb-4">
                                <EntityDataTable
                                    key={`template-table-${dialogKey}`}
                                    data={paginatedTemplates}
                                    columns={columns}
                                    loading={false}
                                    emptyMessage="Nenhum template de rota encontrado."
                                    maxHeight="350px"
                                    selectable={true}
                                    selectedRows={new Set(selectedTemplateId ? [selectedTemplateId] : [])}
                                    onSelectionChange={handleTemplateSelection}
                                    getRowId={(template) => (template as RouteTemplate).id}
                                    onRowClick={(template) => {
                                        const templateId = (template as RouteTemplate).id;
                                        setSelectedTemplateId(selectedTemplateId === templateId ? null : templateId);
                                    }}
                                />
                            </div>

                            {/* Selected Template Details */}
                            {selectedTemplate && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="space-y-2">
                                            <div className="font-medium">{selectedTemplate.name}</div>
                                            {selectedTemplate.description && (
                                                <div className="text-sm">{selectedTemplate.description}</div>
                                            )}
                                            <div className="text-sm">
                                                Este template contém {selectedTemplate.steps.length} etapas de rota:
                                                <ul className="mt-1 ml-4 list-disc text-xs">
                                                    {selectedTemplate.steps.slice(0, 3).map((step, index) => (
                                                        <li key={index}>
                                                            Etapa {step.sequence}: {step.name}
                                                            {step.setup_time_minutes && step.cycle_time_minutes && (
                                                                <span className="text-muted-foreground ml-1">
                                                                    ({formatNumber(step.setup_time_minutes)} min setup, {formatNumber(step.cycle_time_minutes)} min ciclo)
                                                                </span>
                                                            )}
                                                        </li>
                                                    ))}
                                                    {selectedTemplate.steps.length > 3 && (
                                                        <li className="text-muted-foreground">
                                                            ...e mais {selectedTemplate.steps.length - 3} etapas
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Pagination */}
                            {filteredTemplates.length > perPage && (
                                <div className="pt-4">
                                    <EntityPagination
                                        pagination={pagination}
                                        onPageChange={setPage}
                                        onPerPageChange={(newPerPage) => {
                                            setPerPage(newPerPage);
                                            setPage(1);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isApplying}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={handleApplyTemplate}
                                disabled={!selectedTemplateId || isApplying}
                            >
                                {isApplying ? 'Aplicando...' : 'Aplicar Template'}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

        </>
    );
}
