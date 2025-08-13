import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ManufacturingOrder, WorkCell } from '@/types/production';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
    Search,
    RefreshCw,
    Filter,
    Play,
    CheckCircle2,
    AlertCircle,
    Clock,
    Package,
    CalendarIcon,
    Table,
    LayoutGrid,
    ChevronDown,
    MoreHorizontal,
    FileText,
    Factory
} from 'lucide-react';
import { MOStatusBadge } from './components/MOStatusBadge';
import { MOPriorityBadge } from './components/MOPriorityBadge';
import { MOProgressBar } from './components/MOProgressBar';
import { MOCardView } from './components/MOCardView';
import { MODetailPanel } from './components/MODetailPanel';
import { ReportProductionDialog } from './components/ReportProductionDialog';
import { ReportScrapDialog } from './components/ReportScrapDialog';
import { HoldProductionDialog } from './components/HoldProductionDialog';
import { WorkCellSearchDialog } from './components/WorkCellSearchDialog';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface PageProps {
    orders: {
        data: ManufacturingOrder[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    statusCounts: Record<string, number>;
    workCells: WorkCell[];
    filters: {
        search?: string;
        status?: string;
        work_cell_id?: string;
        priority?: string;
        date_from?: string;
        date_to?: string;
        has_routing?: string;
        overdue?: string;
        sort_by?: string;
        sort_direction?: string;
        per_page?: number;
    };
    canExecute: boolean;
    canCreate: boolean;
    canUpdate: boolean;
}

export default function ProductionReporting({
    orders = { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 },
    statusCounts = {},
    workCells = [],
    filters = {},
    canUpdate = false
}: PageProps) {

    const [viewMode, setViewMode] = useState<'table' | 'card'>(
        localStorage.getItem('production-reporting-view') as 'table' | 'card' || 'table'
    );
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
    const [reportProductionOrder, setReportProductionOrder] = useState<ManufacturingOrder | null>(null);
    const [reportScrapOrder, setReportScrapOrder] = useState<ManufacturingOrder | null>(null);
    const [holdOrder, setHoldOrder] = useState<ManufacturingOrder | null>(null);
    const [showWorkCellDialog, setShowWorkCellDialog] = useState(false);

    // Search state - no debounce in state, handle it in the search handler
    const [searchValue, setSearchValue] = useState(filters.search || '');

    // Debounce timer ref to handle search
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Effect to update view mode preference
    useEffect(() => {
        localStorage.setItem('production-reporting-view', viewMode);
    }, [viewMode]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            router.reload({
                only: ['orders', 'statusCounts', 'workCells', 'filters']
            });
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
    }, []);

    const breadcrumbs = [
        { title: 'Production', href: '/production' },
        { title: 'Reporting', href: '/production/reporting' }
    ];

    // Handle search with debounce
    const handleSearch = (value: string) => {
        setSearchValue(value);

        // Clear existing timer
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }

        // Set new timer for debounced search
        searchTimerRef.current = setTimeout(() => {
            router.get(route('production.reporting.index'), {
                ...filters,
                search: value,
                page: 1
            }, {
                preserveState: true,
                preserveScroll: true,
                only: ['orders', 'statusCounts', 'workCells', 'filters']
            });
        }, 500);
    };

    const updateFilters = (newFilters: Partial<typeof filters>) => {
        router.get(route('production.reporting.index'), {
            ...filters,
            ...newFilters,
            page: newFilters.search !== filters.search ? 1 : undefined
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['orders', 'statusCounts', 'workCells', 'filters']
        });
    };

    const handleSort = (field: string) => {
        // Find the column to check if it has a custom sortField
        const column = tableColumns.find(col => col.key === field);
        const sortField = column?.sortField || field;

        const direction = filters.sort_by === sortField && filters.sort_direction === 'asc' ? 'desc' : 'asc';
        updateFilters({ sort_by: sortField, sort_direction: direction });
    };

    const handleAction = (action: string, order: ManufacturingOrder) => {
        switch (action) {
            case 'start':
                router.post(route('production.reporting.start', { order: order.id }));
                break;
            case 'report':
                setReportProductionOrder(order);
                break;
            case 'complete':
                if (confirm('Are you sure you want to complete this order?')) {
                    router.post(route('production.reporting.complete', { order: order.id }));
                }
                break;
            case 'hold':
                setHoldOrder(order);
                break;
            case 'resume':
                router.post(route('production.reporting.resume', { order: order.id }));
                break;
            case 'scrap':
                setReportScrapOrder(order);
                break;
            case 'view':
                router.visit(route('production.orders.show', { order: order.id }));
                break;
            default:
                break;
        }
    };



    // Status summary cards
    const statusCards = [
        {
            key: 'released',
            label: 'Released',
            count: statusCounts.released || 0,
            icon: Package,
            color: 'text-indigo-600'
        },
        {
            key: 'in_progress',
            label: 'In Progress',
            count: statusCounts.in_progress || 0,
            icon: Clock,
            color: 'text-green-600'
        },
        {
            key: 'planned',
            label: 'Planned',
            count: statusCounts.planned || 0,
            icon: CalendarIcon,
            color: 'text-blue-600'
        },
        {
            key: 'completed',
            label: 'Completed',
            count: statusCounts.completed || 0,
            icon: CheckCircle2,
            color: 'text-emerald-600'
        }
    ];

    const tableColumns = [
        {
            key: 'order_number',
            label: 'MO Number',
            sortable: true,
            render: (value: unknown, order: ManufacturingOrder) => {
                if (!order) return null;
                return (
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{order.order_number}</span>
                        {order.has_route && <Badge variant="outline" className="text-xs">Routed</Badge>}
                    </div>
                );
            }
        },
        {
            key: 'item',
            label: 'Item',
            sortable: true,
            sortField: 'item_name',
            render: (value: unknown, order: ManufacturingOrder) => {
                if (!order) return null;
                return (
                    <div className="flex items-center gap-3">
                        {order.item?.primaryImage && (
                            <img
                                src={order.item.primaryImage.thumbnail_url || order.item.primaryImage.url}
                                alt={order.item.name}
                                className="w-10 h-10 object-cover rounded"
                            />
                        )}
                        <div>
                            <div className="font-medium">{order.item?.item_number}</div>
                            <div className="text-sm text-muted-foreground">{order.item?.name}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (value: unknown, order: ManufacturingOrder) => {
                if (!order) return null;
                return <MOStatusBadge status={order.status} />;
            }
        },
        {
            key: 'current_step',
            label: 'Current Step/Work Cell',
            render: (value: unknown, order: ManufacturingOrder) => {
                if (!order || !order.has_route || !order.current_step) {
                    return <span className="text-muted-foreground">—</span>;
                }
                return (
                    <div>
                        <div className="text-sm font-medium">{order.current_step.name}</div>
                        <div className="text-xs text-muted-foreground">
                            {order.current_step.work_cell?.name || 'No work cell'}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'progress',
            label: 'Progress',
            render: (value: unknown, order: ManufacturingOrder) => {
                if (!order) return null;
                return (
                    <div className="w-32">
                        <MOProgressBar
                            completed={order.quantity_completed}
                            scrapped={order.quantity_scrapped}
                            total={order.quantity}
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                            {order.quantity_completed} of {order.quantity}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'priority',
            label: 'Priority',
            sortable: true,
            render: (value: unknown, order: ManufacturingOrder) => {
                if (!order) return null;
                return <MOPriorityBadge priority={order.priority} />;
            }
        },
        {
            key: 'requested_date',
            label: 'Due Date',
            sortable: true,
            render: (value: unknown, order: ManufacturingOrder) => {
                if (!order || !order.requested_date) return <span className="text-muted-foreground">—</span>;
                const date = parseISO(order.requested_date);
                const isOverdue = date < new Date() && !['completed', 'cancelled'].includes(order.status);
                return (
                    <div className={cn(isOverdue && 'text-red-600 font-medium')}>
                        {format(date, 'MMM d, yyyy')}
                        {isOverdue && <AlertCircle className="inline-block w-4 h-4 ml-1" />}
                    </div>
                );
            }
        },
        {
            key: 'actions',
            label: '',
            render: (value: unknown, order: ManufacturingOrder) => {
                if (!order) return null;
                return (
                    <div className="flex items-center justify-end gap-2">
                        {order.status === 'released' && (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleAction('start', order)}
                            >
                                <Play className="w-4 h-4 mr-1" />
                                Start
                            </Button>
                        )}
                        {order.status === 'in_progress' && (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleAction('report', order)}
                            >
                                <FileText className="w-4 h-4 mr-1" />
                                Report
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedOrder(order)}
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                );
            }
        }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Production Reporting" />

            <div className="flex-1 overflow-y-auto">
                <div className="space-y-6 p-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h1 className="text-2xl font-bold">Production Reporting</h1>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.reload()}
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Refresh
                            </Button>
                            <Toggle
                                pressed={autoRefresh}
                                onPressedChange={setAutoRefresh}
                                size="sm"
                            >
                                <Clock className="h-4 w-4 mr-1" />
                                Auto-refresh
                            </Toggle>
                            <div className="flex rounded-md shadow-sm">
                                <Button
                                    size="sm"
                                    variant={viewMode === 'table' ? 'default' : 'outline'}
                                    className="rounded-r-none"
                                    onClick={() => setViewMode('table')}
                                >
                                    <Table className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant={viewMode === 'card' ? 'default' : 'outline'}
                                    className="rounded-l-none"
                                    onClick={() => setViewMode('card')}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Status Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {statusCards.map(card => (
                            <Card
                                key={card.key}
                                variant="compact"
                                className={cn(
                                    "cursor-pointer transition-colors",
                                    filters.status === card.key && "ring-2 ring-primary"
                                )}
                                onClick={() => updateFilters({
                                    status: filters.status === card.key ? 'all' : card.key
                                })}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {card.label}
                                            </p>
                                            <p className="text-2xl font-bold">{card.count}</p>
                                        </div>
                                        <card.icon className={cn("h-8 w-8", card.color)} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Work Cell Selector Card */}
                        <Card
                            variant="compact"
                            className={cn(
                                "cursor-pointer transition-colors",
                                filters.work_cell_id && "ring-2 ring-primary"
                            )}
                            onClick={() => setShowWorkCellDialog(true)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Work Cell
                                        </p>
                                        <p className="text-sm font-bold truncate max-w-[120px]">
                                            {filters.work_cell_id
                                                ? workCells.find(wc => wc.id.toString() === filters.work_cell_id)?.name || 'Selected'
                                                : 'All Cells'
                                            }
                                        </p>
                                    </div>
                                    <Factory className="h-8 w-8 text-purple-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search and Filters */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    type="text"
                                    placeholder="Search by order number, item name or SKU..."
                                    value={searchValue}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter className="h-4 w-4 mr-2" />
                                Filters
                                <ChevronDown className={cn(
                                    "h-4 w-4 ml-2 transition-transform",
                                    showFilters && "rotate-180"
                                )} />
                            </Button>
                        </div>

                        {/* Advanced Filters */}
                        {showFilters && (
                            <Card>
                                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Work Cell</label>
                                        <Select
                                            value={filters.work_cell_id || 'all'}
                                            onValueChange={(value) => updateFilters({
                                                work_cell_id: value === 'all' ? undefined : value
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All Work Cells" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Work Cells</SelectItem>
                                                {workCells.map(cell => (
                                                    <SelectItem key={cell.id} value={cell.id.toString()}>
                                                        {cell.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Priority</label>
                                        <Select
                                            value={filters.priority || 'all'}
                                            onValueChange={(value) => updateFilters({
                                                priority: value === 'all' ? undefined : value
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All Priorities" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Priorities</SelectItem>
                                                <SelectItem value="100">High (100)</SelectItem>
                                                <SelectItem value="50">Medium (50)</SelectItem>
                                                <SelectItem value="0">Low (0)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Has Routing</label>
                                        <Select
                                            value={filters.has_routing || 'all'}
                                            onValueChange={(value) => updateFilters({
                                                has_routing: value === 'all' ? undefined : value
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All Orders" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Orders</SelectItem>
                                                <SelectItem value="yes">With Routing</SelectItem>
                                                <SelectItem value="no">Without Routing</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Date From</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !filters.date_from && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {filters.date_from ? format(parseISO(filters.date_from), 'PPP') : "Select date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={filters.date_from ? parseISO(filters.date_from) : undefined}
                                                    onSelect={(date) => updateFilters({
                                                        date_from: date ? format(date, 'yyyy-MM-dd') : undefined
                                                    })}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Date To</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !filters.date_to && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {filters.date_to ? format(parseISO(filters.date_to), 'PPP') : "Select date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={filters.date_to ? parseISO(filters.date_to) : undefined}
                                                    onSelect={(date) => updateFilters({
                                                        date_to: date ? format(date, 'yyyy-MM-dd') : undefined
                                                    })}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="flex items-end">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => updateFilters({
                                                work_cell_id: undefined,
                                                priority: undefined,
                                                has_routing: undefined,
                                                date_from: undefined,
                                                date_to: undefined,
                                                overdue: undefined
                                            })}
                                        >
                                            Clear Filters
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Main Content */}
                    {viewMode === 'table' ? (
                        <EntityDataTable
                            data={orders.data || []}
                            columns={tableColumns}
                            onSort={handleSort}
                            onRowClick={(order) => setSelectedOrder(order)}
                        />

                    ) : (
                        <MOCardView
                            orders={orders.data || []}
                            onOrderClick={setSelectedOrder}
                            onAction={handleAction}
                        />
                    )}

                    {/* Pagination */}
                    {orders.last_page > 1 && (
                        <div className="flex justify-center">
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                {Array.from({ length: orders.last_page }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => {
                                            router.get(route('production.reporting.index'), {
                                                ...filters,
                                                page
                                            });
                                        }}
                                        className={cn(
                                            "relative inline-flex items-center px-4 py-2 text-sm font-medium",
                                            page === orders.current_page
                                                ? "z-10 bg-primary text-primary-foreground"
                                                : "bg-background border-border text-foreground hover:bg-accent"
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Detail Panel */}
            {selectedOrder && (
                <MODetailPanel
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onAction={handleAction}
                    canUpdate={canUpdate}
                />
            )}

            {/* Dialogs */}
            {reportProductionOrder && (
                <ReportProductionDialog
                    order={reportProductionOrder}
                    onClose={() => setReportProductionOrder(null)}
                />
            )}

            {reportScrapOrder && (
                <ReportScrapDialog
                    order={reportScrapOrder}
                    onClose={() => setReportScrapOrder(null)}
                />
            )}

            {holdOrder && (
                <HoldProductionDialog
                    order={holdOrder}
                    onClose={() => setHoldOrder(null)}
                />
            )}

            {/* Work Cell Search Dialog */}
            <WorkCellSearchDialog
                open={showWorkCellDialog}
                onOpenChange={setShowWorkCellDialog}
                workCells={workCells}
                selectedWorkCellId={filters.work_cell_id}
                onSelectWorkCell={(workCellId) => {
                    updateFilters({ work_cell_id: workCellId });
                    setShowWorkCellDialog(false);
                }}
            />
        </AppLayout>
    );
}
