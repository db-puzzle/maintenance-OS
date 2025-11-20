import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ManufacturingStep } from '@/types/production';
import { Manufacturer } from '@/types/asset-hierarchy';
import { cn } from '@/lib/utils';
import {
    RefreshCw,
    Clock,
    Package,
    Factory,
    Truck,
    LayoutGrid,
    LayoutList,
    AlertCircle
} from 'lucide-react';
import { ExternalStepCard } from '@/pages/production/external-steps/components/ExternalStepCard';
import { ExternalStepTableRow } from '@/pages/production/external-steps/components/ExternalStepTableRow';
import { ManufacturerSearchDialog } from '@/pages/production/external-steps/components/ManufacturerSearchDialog';
import { ExternalStepStatusDialog } from '@/components/production/external-step-status-dialog';
import { ImageDisplayToggleButton } from '@/components/ImageDisplayToggleButton';
import { formatNumber } from '@/utils/number';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface PageProps {
    steps: {
        data: ManufacturingStep[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    statusCounts: {
        awaiting_shipment: number;
        at_manufacturer: number;
        unassigned_manufacturer: number;
        total_awaiting_units: number;
        total_at_manufacturer_units: number;
    };
    manufacturers: Manufacturer[];
    filters: {
        search?: string;
        statuses?: string[] | string;
        manufacturer_id?: string;
        page?: number;
        per_page?: number;
    };
}

/**
 * External Steps Dashboard Page (Redesigned)
 *
 * Displays steps awaiting shipment and steps currently at external manufacturers.
 * Features table/card view toggle, filters, search, and pagination.
 * Allows users to update step status and track external manufacturing progress.
 */
export default function ExternalStepsIndex({
    steps = { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 },
    statusCounts = {
        awaiting_shipment: 0,
        at_manufacturer: 0,
        unassigned_manufacturer: 0,
        total_awaiting_units: 0,
        total_at_manufacturer_units: 0
    },
    manufacturers = [],
    filters = {},
}: PageProps) {
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showImages, setShowImages] = useState(true);
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [showManufacturerDialog, setShowManufacturerDialog] = useState(false);
    const [searchValue, setSearchValue] = useState(filters.search || '');

    // Dialog state for step actions
    const [selectedStep, setSelectedStep] = useState<ManufacturingStep | null>(null);
    const [dialogAction, setDialogAction] = useState<
        'ship' | 'in-process' | 'record-receipt' | null
    >(null);

    // Multi-select status filter state
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
        if (filters.statuses) {
            return Array.isArray(filters.statuses) ? filters.statuses : filters.statuses.split(',');
        }
        // Default to both statuses
        return ['awaiting_shipment', 'at_manufacturer'];
    });

    // Debounce timer ref to handle search
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            router.reload({
                only: ['steps', 'statusCounts', 'manufacturers', 'filters']
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
        { title: 'Home', href: '/home' },
        { title: 'Produção', href: '/production/planning' },
        { title: 'Etapas Externas', href: '/production/external-steps' }
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
            router.get(route('production.external-steps.index'), {
                ...filters,
                search: value,
                page: 1
            }, {
                preserveState: true,
                preserveScroll: true,
                only: ['steps', 'statusCounts', 'manufacturers', 'filters']
            });
        }, 500);
    };

    const updateFilters = (newFilters: Partial<typeof filters>) => {
        // Handle the multi-select status filter
        const filtersToSend = { ...filters, ...newFilters };

        // Convert statuses array to comma-separated string for URL
        if (filtersToSend.statuses && Array.isArray(filtersToSend.statuses)) {
            filtersToSend.statuses = filtersToSend.statuses.join(',');
        }

        // If no statuses are selected, pass a special value to show no steps
        if ('statuses' in newFilters && newFilters.statuses && newFilters.statuses.length === 0) {
            filtersToSend.statuses = 'none';
        }

        router.get(route('production.external-steps.index'), {
            ...filtersToSend,
            page: newFilters.search !== filters.search ? 1 : undefined
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['steps', 'statusCounts', 'manufacturers', 'filters']
        });
    };

    const handleStatusToggle = (status: string, checked: boolean) => {
        const newStatuses = checked
            ? [...selectedStatuses, status]
            : selectedStatuses.filter(s => s !== status);

        setSelectedStatuses(newStatuses);
        updateFilters({ statuses: newStatuses.join(',') });
    };

    const handleStepAction = (
        step: ManufacturingStep,
        action: 'ship' | 'in-process' | 'record-receipt'
    ) => {
        setSelectedStep(step);
        setDialogAction(action);
    };

    const closeDialog = () => {
        setSelectedStep(null);
        setDialogAction(null);
    };

    // Status summary cards
    const statusCards = [
        {
            key: 'awaiting_shipment',
            label: 'Aguardando Envio',
            count: statusCounts?.awaiting_shipment || 0,
            subtext: `${formatNumber(statusCounts?.total_awaiting_units || 0)} unidades`,
            icon: Package,
            color: 'text-muted-foreground'
        },
        {
            key: 'at_manufacturer',
            label: 'No Fabricante',
            count: statusCounts?.at_manufacturer || 0,
            subtext: `${formatNumber(statusCounts?.total_at_manufacturer_units || 0)} unidades`,
            icon: Truck,
            color: 'text-muted-foreground'
        },
        {
            key: 'unassigned',
            label: 'Sem Fabricante',
            count: statusCounts?.unassigned_manufacturer || 0,
            subtext: 'Requer atribuição',
            icon: AlertCircle,
            color: 'text-muted-foreground',
            isWarning: true
        }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Etapas Externas" />

            <ListLayout
                title="Etapas Externas"
                description="Monitore e gerencie etapas executadas por fabricantes terceirizados"
                searchPlaceholder="Buscar por nome da etapa, número da ordem ou item..."
                searchValue={searchValue}
                onSearchChange={handleSearch}
                createButtonText=""
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={cn(
                                'w-[160px] flex items-center justify-start',
                                autoRefresh
                                    ? 'bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100 hover:text-blue-600 hover:border-blue-400 dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90'
                                    : 'border hover:bg-blue-50/50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-accent dark:hover:text-accent-foreground'
                            )}
                        >
                            <Clock className="h-4 w-4 shrink-0" />
                            <span className="ml-2">Auto-refresh {autoRefresh ? 'ON' : 'OFF'}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.reload()}
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh
                        </Button>
                        {viewMode === 'card' && (
                            <ImageDisplayToggleButton
                                showImages={showImages}
                                onToggle={setShowImages}
                            />
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
                        >
                            {viewMode === 'card' ? (
                                <>
                                    <LayoutList className="h-4 w-4 mr-1" />
                                    Tabela
                                </>
                            ) : (
                                <>
                                    <LayoutGrid className="h-4 w-4 mr-1" />
                                    Cards
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {/* Status Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Manufacturer Selector Card */}
                    <Card
                        variant="compact"
                        className={cn(
                            "cursor-pointer transition-all",
                            "hover:shadow-md",
                            filters.manufacturer_id && "border-blue-600 hover:bg-accent/50 dark:border-blue-900 dark:bg-blue-950 ring-0.75 ring-blue-600 dark:ring-blue-900"
                        )}
                        onClick={() => setShowManufacturerDialog(true)}
                    >
                        <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Fabricante
                                    </p>
                                    <p className="text-lg font-bold truncate max-w-[120px]">
                                        {filters.manufacturer_id
                                            ? manufacturers.find(m => m.id.toString() === filters.manufacturer_id)?.name || 'Selected'
                                            : 'Todos'
                                        }
                        </p>
                    </div>
                                <Factory className="h-8 w-8 text-muted-foreground" strokeWidth={1} />
                </div>
                        </CardContent>
                    </Card>

                    {statusCards.map(card => {
                        const isSelected = card.key === 'unassigned' ? false : selectedStatuses.includes(card.key);
                        const isClickable = card.key !== 'unassigned';
                        return (
                            <Card
                                key={card.key}
                                variant="compact"
                                className={cn(
                                    "transition-all",
                                    isClickable && "cursor-pointer hover:shadow-md",
                                    isSelected && "border-blue-600 hover:bg-accent/50 dark:border-blue-900 dark:bg-blue-950 ring-0.75 ring-blue-600 dark:ring-blue-900",
                                    card.isWarning && card.count > 0 && "border-orange-500 dark:border-orange-700"
                                )}
                                onClick={() => isClickable && handleStatusToggle(card.key, !isSelected)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {card.label}
                                            </p>
                                            <p className="text-2xl font-bold">{card.count}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {card.subtext}
                                            </p>
                                        </div>
                                        <card.icon className={cn("h-8 w-8", card.color)} strokeWidth={1} />
                                    </div>
                                        </CardContent>
                                    </Card>
                        );
                    })}
                                                        </div>

                {/* Main Content - Card View */}
                {viewMode === 'card' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {steps.data.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">Nenhuma etapa externa disponível</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Etapas externas aparecerão aqui quando estiverem prontas
                                                            </p>
                                                        </div>
                        ) : (
                            steps.data.map((step) => (
                                <ExternalStepCard
                                    key={step.id}
                                    step={step}
                                    onAction={handleStepAction}
                                />
                            ))
                        )}
                                                            </div>
                                                        )}

                {/* Main Content - Table View */}
                {viewMode === 'table' && (
                    <div className="rounded-md border">
                        {steps.data.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">Nenhuma etapa externa disponível</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Etapas externas aparecerão aqui quando estiverem prontas
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Etapa</TableHead>
                                        <TableHead>Ordem / Item</TableHead>
                                        <TableHead>Fabricante</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Quantidade</TableHead>
                                        <TableHead>Lead Time / Data</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {steps.data.map((step) => (
                                        <ExternalStepTableRow
                                            key={step.id}
                                            step={step}
                                            onAction={handleStepAction}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                                                            </div>
                                                        )}

                {/* Pagination */}
                {steps.last_page > 1 && (
                    <div className="flex justify-center mt-6">
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            {Array.from({
                                length: steps.last_page
                            }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => {
                                        router.get(route('production.external-steps.index'), {
                                            ...filters,
                                            page
                                        });
                                    }}
                                    className={cn(
                                        "relative inline-flex items-center px-4 py-2 text-sm font-medium",
                                        page === steps.current_page
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
            </ListLayout>

            {/* Manufacturer Search Dialog */}
            <ManufacturerSearchDialog
                open={showManufacturerDialog}
                onOpenChange={setShowManufacturerDialog}
                manufacturers={manufacturers}
                selectedManufacturerId={filters.manufacturer_id}
                onSelectManufacturer={(manufacturerId) => {
                    updateFilters({ manufacturer_id: manufacturerId });
                    setShowManufacturerDialog(false);
                }}
            />

            {/* Status Update Dialog */}
            {selectedStep && dialogAction && (
                <ExternalStepStatusDialog
                    step={selectedStep}
                    action={dialogAction}
                    isOpen={!!dialogAction}
                    onClose={closeDialog}
                />
            )}
        </AppLayout>
    );
}
