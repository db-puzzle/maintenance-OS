import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkCell, ManufacturingStep, ManufacturingOrder, ManufacturingStepExecution } from '@/types/production';
import { cn } from '@/lib/utils';

import {
    RefreshCw,
    Play,
    AlertCircle,
    Clock,
    FileText,
    Factory
} from 'lucide-react';
import { StepExecutionCard } from '@/pages/production/reporting/components/StepExecutionCard';
import { WorkCellSearchDialog } from '@/pages/production/reporting/components/WorkCellSearchDialog';
import { ImageDisplayToggleButton } from '@/components/ImageDisplayToggleButton';
import { MOStepActionDialog } from '@/pages/production/reporting/components/MOStepActionDialog';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface ExecutableStep {
    step: ManufacturingStep & {
        work_cell?: WorkCell;
    };
    order: ManufacturingOrder;
    execution?: ManufacturingStepExecution | null;
    can_execute: boolean;
    cannot_execute_reason?: string | null;
}

interface PageProps {
    steps: {
        data: ExecutableStep[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stepStatusCounts: Record<string, number>;
    workCells: WorkCell[];
    filters: {
        search?: string;
        statuses?: string[] | string;
        work_cell_id?: string;
        step_type?: string;
        page?: number;
        per_page?: number;
    };
    canExecute: boolean;
}


export default function ProductionReporting({
    steps = { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 },
    stepStatusCounts = {},
    workCells = [],
    filters = {}
}: PageProps) {


    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showImages, setShowImages] = useState(true);
    const [showWorkCellDialog, setShowWorkCellDialog] = useState(false);
    const [selectedStep, setSelectedStep] = useState<ExecutableStep | null>(null);
    const [showStepActionDialog, setShowStepActionDialog] = useState(false);


    // Search state - no debounce in state, handle it in the search handler
    const [searchValue, setSearchValue] = useState(filters.search || '');


    // Multi-select status filter state
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
        if (filters.statuses) {
            // If we already have multiple statuses (from backend), use them
            return Array.isArray(filters.statuses) ? filters.statuses : filters.statuses.split(',');
        }
        // Default for steps
        return ['queued', 'in_progress', 'on_hold', 'awaiting_quality'];
    });

    // Debounce timer ref to handle search
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);




    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            router.reload({
                only: ['steps', 'stepStatusCounts', 'workCells', 'filters']
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
        { title: 'Apontamento de Etapas', href: '#' }
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

        router.get(route('production.reporting.index'), {
            ...filtersToSend,
            page: newFilters.search !== filters.search ? 1 : undefined
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['steps', 'stepStatusCounts', 'workCells', 'filters']
        });
    };


    const handleStatusToggle = (status: string, checked: boolean) => {
        const newStatuses = checked
            ? [...selectedStatuses, status]
            : selectedStatuses.filter(s => s !== status);

        setSelectedStatuses(newStatuses);

        updateFilters({ statuses: newStatuses.join(',') });
    };



    // Status summary cards for steps
    const statusCards = [
        {
            key: 'queued',
            label: 'Prontas',
            count: stepStatusCounts?.queued || 0,
            icon: Clock,
            color: 'text-muted-foreground'
        },
        {
            key: 'in_progress',
            label: 'Em Execução',
            count: stepStatusCounts?.in_progress || 0,
            icon: Play,
            color: 'text-muted-foreground'
        },
        {
            key: 'awaiting_quality',
            label: 'Aguardando QC',
            count: stepStatusCounts?.awaiting_quality || 0,
            icon: FileText,
            color: 'text-muted-foreground'
        },
        {
            key: 'on_hold',
            label: 'Pausadas',
            count: stepStatusCounts?.on_hold || 0,
            icon: AlertCircle,
            color: 'text-muted-foreground'
        }
    ];


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Apontamento de Etapas" />

            <ListLayout
                title="Apontamento de Etapas"
                description="Gerencie e acompanhe a execução das etapas de produção"
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
                        <ImageDisplayToggleButton
                            showImages={showImages}
                            onToggle={setShowImages}
                        />
                    </div>
                }
            >
                {/* Status Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

                    {/* Work Cell Selector Card */}
                    <Card
                        variant="compact"
                        className={cn(
                            "cursor-pointer transition-all",
                            "hover:shadow-md",
                            filters.work_cell_id && "border-blue-600 hover:bg-accent/50 dark:border-blue-900 dark:bg-blue-950 ring-0.75 ring-blue-600 dark:ring-blue-900"
                        )}
                        onClick={() => setShowWorkCellDialog(true)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Célula de Trabalho                                        </p>
                                    <p className="text-lg font-bold truncate max-w-[120px]">
                                        {filters.work_cell_id
                                            ? workCells.find(wc => wc.id.toString() === filters.work_cell_id)?.name || 'Selected'
                                            : 'All Cells'
                                        }
                                    </p>
                                </div>
                                <Factory className="h-8 w-8 text-muted-foreground" strokeWidth={1} />
                            </div>
                        </CardContent>
                    </Card>

                    {statusCards.map(card => {
                        const isSelected = selectedStatuses.includes(card.key);
                        return (
                            <Card
                                key={card.key}
                                variant="compact"
                                className={cn(
                                    "cursor-pointer transition-all",
                                    "hover:shadow-md",
                                    isSelected && "border-blue-600 hover:bg-accent/50 dark:border-blue-900 dark:bg-blue-950 ring-0.75 ring-blue-600 dark:ring-blue-900"
                                )}
                                onClick={() => handleStatusToggle(card.key, !isSelected)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {card.label}
                                            </p>
                                            <p className="text-2xl font-bold">{card.count}</p>
                                        </div>
                                        <card.icon className={cn("h-8 w-8", card.color)} strokeWidth={1} />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <Select
                        value={filters.step_type || 'all'}
                        onValueChange={(value) => {
                            updateFilters({
                                step_type: value === 'all' ? undefined : value
                            });
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Step Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Tipos</SelectItem>
                            <SelectItem value="standard">Padrão</SelectItem>
                            <SelectItem value="quality_check">Verificação QC</SelectItem>
                            <SelectItem value="rework">Retrabalho</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {steps.data.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                            <p className="text-muted-foreground">Nenhuma etapa disponível para execução</p>
                        </div>
                    ) : (
                        steps.data.map((stepData) => (
                            <StepExecutionCard
                                key={`${stepData.step.id}-${stepData.order.id}`}
                                step={stepData.step as ManufacturingStep}
                                order={stepData.order}
                                execution={stepData.execution}
                                canExecute={stepData.can_execute}
                                cannotExecuteReason={stepData.cannot_execute_reason}
                                onClick={() => {
                                    // Open the step action dialog instead of navigating
                                    setSelectedStep(stepData);
                                    setShowStepActionDialog(true);
                                }}
                            />
                        ))
                    )}
                </div>

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
                                        router.get(route('production.reporting.index'), {
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

            {/* Step Action Dialog */}
            <MOStepActionDialog
                order={selectedStep?.order || null}
                isOpen={showStepActionDialog}
                onOpenChange={setShowStepActionDialog}
                activeStepId={selectedStep?.step.id}
            />
        </AppLayout>
    );
}
