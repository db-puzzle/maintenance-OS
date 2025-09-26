import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
    Search,
    CalendarIcon,
    Clock,
    Package,
    GitBranch,
    AlertTriangle,
    CheckCircle2,
    Circle,
    Layers,
    Copy,
} from 'lucide-react';
import { formatNumber } from '@/utils/number';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import { Spinner } from '../../../../../components/ui/shadcn-io/spinner';
import axios from 'axios';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: string | number | Record<string, string | number>) => string;

interface MOSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (orderIds: number[], multiSelect: boolean) => void;
    selectedIds?: Set<number>;
    multiSelect?: boolean;
}

interface SearchFilters {
    search: string;
    rootOnly: boolean;
    status: string[];
    createdFrom: Date | undefined;
    createdTo: Date | undefined;
    dueDateFrom: Date | undefined;
    dueDateTo: Date | undefined;
    categoryId: number | null;
    priority: string | null;
    hasUnplannedChildren: boolean;
    recentlyModified: boolean;
    [key: string]: string | boolean | string[] | Date | undefined | number | null;
}

interface SearchResult {
    id: number;
    order_number: string;
    status: string;
    priority: string;
    quantity: number;
    due_date: string | null;
    created_at: string;
    updated_at: string;
    item: {
        id: number;
        item_number: string;
        name: string;
        description: string | null;
        category: {
            id: number;
            name: string;
        } | null;
        primary_image_url?: string;
        primary_image_thumbnail_url?: string;
        media?: Array<{ id: number; url: string; thumbnail_url?: string }>;
    } | null;
    parent: {
        id: number;
        order_number: string;
    } | null;
    has_children: boolean;
    children_count: number;
    is_root: boolean;
    has_route: boolean;
}

export function MOSelectionModal({
    open,
    onOpenChange,
    onSelect,
    selectedIds = new Set(),
    multiSelect = false,
}: MOSelectionModalProps) {
    const [activeTab, setActiveTab] = useState<'search' | 'recent'>('search');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [recentOrders, setRecentOrders] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set(selectedIds));
    const searchRequestRef = useRef<AbortController | null>(null);

    // Update selected orders when props change (e.g., when modal reopens)
    useEffect(() => {
        setSelectedOrders(new Set(selectedIds));
    }, [selectedIds]);

    // Cleanup abort controller when modal closes
    useEffect(() => {
        if (!open && searchRequestRef.current) {
            searchRequestRef.current.abort();
            searchRequestRef.current = null;
            setLoading(false);
        }
    }, [open]);
    const [sortBy] = useState<string>('created_at');
    const [sortOrder] = useState<'asc' | 'desc'>('desc');

    // Initialize form for filters
    const form = useForm<SearchFilters>({
        search: '',
        rootOnly: false,
        status: [],
        createdFrom: undefined,
        createdTo: undefined,
        dueDateFrom: undefined,
        dueDateTo: undefined,
        categoryId: null,
        priority: null,
        hasUnplannedChildren: false,
        recentlyModified: false,
    });


    // Fetch data when modal opens
    useEffect(() => {
        if (open && activeTab === 'recent') {
            fetchRecentOrders();
        }
    }, [open, activeTab]);

    // Define performSearch before using it
    const performSearch = useCallback(async () => {
        // Cancel previous request if it exists
        if (searchRequestRef.current) {
            searchRequestRef.current.abort();
        }

        // Create new abort controller for this request
        const abortController = new AbortController();
        searchRequestRef.current = abortController;

        setLoading(true);
        try {
            const params = {
                ...form.data,
                page: currentPage,
                sortBy,
                sortOrder,
                perPage: 20,
            };

            const response = await axios.get(route('production.planning.orders.search'), {
                params,
                signal: abortController.signal
            });

            // Only update state if this request wasn't cancelled
            if (!abortController.signal.aborted) {
                setSearchResults(response.data.data);
                setTotalPages(response.data.last_page);
                setTotalCount(response.data.total || 0);
            }
        } catch (error) {
            // Don't show error if request was cancelled
            if (!axios.isCancel(error)) {
                console.error('Error searching orders:', error);
                toast.error('Falha ao pesquisar ordens');
            }
        } finally {
            // Only clear loading if this request wasn't cancelled
            if (!abortController.signal.aborted) {
                setLoading(false);
            }
        }
    }, [form.data, currentPage, sortBy, sortOrder]);

    // Unified search effect that handles both initial search and filter changes
    useEffect(() => {
        // Only run search if modal is open and on search tab
        if (!open || activeTab !== 'search') {
            return;
        }

        // Use shorter delay for initial search (when no search term), longer for user typing
        const delay = form.data.search.length === 0 ? 100 : 300;

        const timeoutId = setTimeout(() => {
            performSearch();
        }, delay);

        return () => clearTimeout(timeoutId);
    }, [
        open,
        activeTab,
        form.data.search,
        form.data.rootOnly,
        form.data.status,
        form.data.createdFrom,
        form.data.createdTo,
        form.data.dueDateFrom,
        form.data.dueDateTo,
        form.data.categoryId,
        form.data.priority,
        form.data.hasUnplannedChildren,
        form.data.recentlyModified,
        currentPage,
        sortBy,
        sortOrder,
        performSearch
    ]);

    // Scroll to selected item when search results change
    useEffect(() => {
        if (searchResults.length > 0 && selectedOrders.size > 0) {
            const selectedId = Array.from(selectedOrders)[0];
            const element = document.getElementById(`order-row-${selectedId}`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [searchResults, selectedOrders]);

    const fetchRecentOrders = async () => {
        setLoading(true);
        try {
            const response = await axios.get(route('production.planning.orders.recent'));
            setRecentOrders(response.data);
        } catch (error) {
            console.error('Error fetching recent orders:', error);
            toast.error('Falha ao carregar ordens recentes');
        } finally {
            setLoading(false);
        }
    };

    const handleOrderSelect = (orderId: number) => {
        // In single select mode, just replace the selection
        setSelectedOrders(new Set([orderId]));
    };

    const handleConfirmSelection = () => {
        const selectedIds = Array.from(selectedOrders);
        onSelect(selectedIds, multiSelect);
        onOpenChange(false);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: typeof Circle; label: string }> = {
            draft: { color: 'bg-gray-500', icon: Circle, label: 'Rascunho' },
            planned: { color: 'bg-blue-500', icon: CheckCircle2, label: 'Planejado' },
            released: { color: 'bg-green-500', icon: CheckCircle2, label: 'Liberado' },
            in_progress: { color: 'bg-yellow-500', icon: Clock, label: 'Em Progresso' },
            completed: { color: 'bg-emerald-500', icon: CheckCircle2, label: 'Concluído' },
            cancelled: { color: 'bg-red-500', icon: AlertTriangle, label: 'Cancelado' },
        };

        const config = statusConfig[status] || statusConfig.draft;
        const Icon = config.icon;

        return (
            <Badge variant="outline" className="gap-1">
                <Icon className={cn('h-3 w-3', config.color)} />
                {config.label}
            </Badge>
        );
    };

    const renderOrderRow = (order: SearchResult) => {
        const isSelected = selectedOrders.has(order.id);

        return (
            <div
                key={order.id}
                id={`order-row-${order.id}`}
                className={cn(
                    'flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-[color,box-shadow,border-color,background-color]',
                    isSelected
                        ? 'border-ring dark:border-slate-600 ring-ring/10 dark:ring-slate-500/20 bg-input-focus dark:bg-slate-800/50'
                        : 'border-input hover:bg-muted/50 dark:hover:bg-slate-800/30 border-transparent'
                )}
                onClick={() => handleOrderSelect(order.id)}
                onDoubleClick={() => {
                    handleOrderSelect(order.id);
                    handleConfirmSelection();
                }}
            >
                {/* Image */}
                <div className="flex-shrink-0">
                    {order.item && (
                        <ItemImagePreview
                            primaryImageUrl={order.item.primary_image_thumbnail_url || order.item.primary_image_url}
                            imageCount={order.item.media?.length || 0}
                            className="w-12 h-12"
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{order.order_number}</span>

                        {/* Quantity with Copy icon */}
                        <div className="flex items-center gap-1">
                            <Copy className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                                {formatNumber(order.quantity)}
                            </span>
                        </div>

                        {order.is_root && (
                            <Badge variant="secondary" className="text-xs">
                                <Layers className="h-3 w-3 mr-1" />
                                Raiz
                            </Badge>
                        )}
                        {order.has_children && (
                            <Badge variant="outline" className="text-xs">
                                <GitBranch className="h-3 w-3 mr-1" />
                                {order.children_count}
                            </Badge>
                        )}
                    </div>

                    {order.item && (
                        <div className="text-sm text-muted-foreground">
                            <span className="font-mono">{order.item.item_number}</span>
                            <span className="mx-2">•</span>
                            <span>{order.item.name}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {order.item?.category && (
                            <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {order.item.category.name}
                            </span>
                        )}
                        {order.due_date && (
                            <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {format(new Date(order.due_date), 'd MMM, yyyy')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    {order.has_route && (
                        <Badge variant="secondary" className="text-xs">
                            Possui Roteiro
                        </Badge>
                    )}
                </div>
            </div>
        );
    };

    const clearFilters = () => {
        form.reset();
        setCurrentPage(1);
    };

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (form.data.rootOnly) count++;
        if (form.data.status.length > 0) count++;
        if (form.data.createdFrom || form.data.createdTo) count++;
        if (form.data.dueDateFrom || form.data.dueDateTo) count++;
        if (form.data.categoryId) count++;
        if (form.data.priority) count++;
        if (form.data.hasUnplannedChildren) count++;
        if (form.data.recentlyModified) count++;
        return count;
    }, [form.data]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[90vw] w-[80vw] h-[85vh] p-0 gap-0 sm:!max-w-[90vw] flex flex-col">
                {/* Hidden title for accessibility */}
                <DialogTitle className="sr-only">Selecionar Ordem de Produção</DialogTitle>
                <DialogDescription className="sr-only">
                    Pesquise e filtre ordens de produção para adicionar à sua visão de planejamento.
                </DialogDescription>

                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">
                        Selecionar Ordem de Produção
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1.5">
                        Pesquise e filtre ordens de produção para adicionar à sua visão de planejamento.
                    </p>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden min-h-0">
                    {/* Left Panel - Filters */}
                    <div className="w-72 border-r bg-muted/20 p-4 overflow-y-auto">
                        <div className="space-y-6">
                            {/* Search Input */}
                            <div>
                                <Label className="text-sm font-medium mb-2 block">Pesquisar</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Número da ordem, nome do item..."
                                        value={form.data.search}
                                        onChange={(e) => form.setData('search', e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Quick Filters */}
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Filtros Rápidos</Label>

                                <div className="space-y-2 mt-3">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <Checkbox
                                            checked={form.data.rootOnly}
                                            onCheckedChange={(checked) => form.setData('rootOnly', !!checked)}
                                        />
                                        <Layers className="h-4 w-4" />
                                        Apenas Ordens Raiz
                                    </label>

                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <Checkbox
                                            checked={form.data.hasUnplannedChildren}
                                            onCheckedChange={(checked) => form.setData('hasUnplannedChildren', !!checked)}
                                        />
                                        <AlertTriangle className="h-4 w-4" />
                                        Possui MOs Não Planejados
                                    </label>

                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <Checkbox
                                            checked={form.data.recentlyModified}
                                            onCheckedChange={(checked) => form.setData('recentlyModified', !!checked)}
                                        />
                                        <Clock className="h-4 w-4" />
                                        Modificado Recentemente
                                    </label>
                                </div>
                            </div>

                            <Separator />

                            {/* Status Filter */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Status</Label>
                                <div className="space-y-1 mt-3">
                                    {['draft', 'planned', 'released', 'in_progress'].map((status) => (
                                        <label key={status} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <Checkbox
                                                checked={form.data.status.includes(status)}
                                                onCheckedChange={(checked) => {
                                                    const newStatus = checked
                                                        ? [...form.data.status, status]
                                                        : form.data.status.filter((s) => s !== status);
                                                    form.setData('status', newStatus);
                                                }}
                                            />
                                            {status === 'draft' ? 'Rascunho' : status === 'planned' ? 'Planejado' : status === 'released' ? 'Liberado' : status === 'in_progress' ? 'Em Progresso' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Date Filters */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Intervalos de Data</Label>

                                <div className="mt-3">
                                    <Label className="text-xs text-muted-foreground mb-1">Data de Criação</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                    {form.data.createdFrom ? format(form.data.createdFrom, 'd MMM') : 'De'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.data.createdFrom}
                                                    onSelect={(date) => form.setData('createdFrom', date)}
                                                />
                                            </PopoverContent>
                                        </Popover>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                    {form.data.createdTo ? format(form.data.createdTo, 'd MMM') : 'Até'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.data.createdTo}
                                                    onSelect={(date) => form.setData('createdTo', date)}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1">Data de Vencimento</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                    {form.data.dueDateFrom ? format(form.data.dueDateFrom, 'd MMM') : 'De'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.data.dueDateFrom}
                                                    onSelect={(date) => form.setData('dueDateFrom', date)}
                                                />
                                            </PopoverContent>
                                        </Popover>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                    {form.data.dueDateTo ? format(form.data.dueDateTo, 'd MMM') : 'Até'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.data.dueDateTo}
                                                    onSelect={(date) => form.setData('dueDateTo', date)}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            {activeFiltersCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="w-full"
                                >
                                    Limpar Filtros ({activeFiltersCount})
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Results */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'recent')} className="flex-1 flex flex-col min-h-0">
                            <div className="px-4 py-2 border-b">
                                <TabsList className="grid w-full max-w-[450px] grid-cols-2">
                                    <TabsTrigger value="search">
                                        Todos os Resultados
                                        {totalCount > 0 && (
                                            <span className="ml-2 inline-flex items-center justify-center rounded-md border border-transparent bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-medium">
                                                {totalCount}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="recent">Ordens Recentes</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="search" className="flex-1 m-0 flex flex-col min-h-0">
                                <ScrollArea className="flex-1 min-h-0">
                                    <div className="p-4 space-y-2">
                                        {loading ? (
                                            <div className="flex justify-center items-center py-8">
                                                <Spinner className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        ) : searchResults.length > 0 ? (
                                            <>
                                                {searchResults.map(renderOrderRow)}

                                                {totalPages > 1 && (
                                                    <div className="flex justify-center gap-2 mt-4">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                            disabled={currentPage === 1}
                                                        >
                                                            Anterior
                                                        </Button>
                                                        <span className="flex items-center px-3 text-sm">
                                                            Página {currentPage} de {totalPages}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                            disabled={currentPage === totalPages}
                                                        >
                                                            Próximo
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                Nenhuma ordem encontrada. Tente ajustar seus filtros.
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="recent" className="flex-1 m-0 flex flex-col min-h-0">
                                <ScrollArea className="flex-1 min-h-0">
                                    <div className="p-4 space-y-2">
                                        {loading ? (
                                            <div className="flex justify-center items-center py-8">
                                                <Spinner className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        ) : recentOrders.length > 0 ? (
                                            recentOrders.map(renderOrderRow)
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                Nenhuma ordem recente encontrada.
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
                    <div className="text-sm text-muted-foreground">
                        {selectedOrders.size > 0 && (
                            <span>1 ordem selecionada</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmSelection}
                            disabled={selectedOrders.size === 0}
                        >
                            Selecionar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
