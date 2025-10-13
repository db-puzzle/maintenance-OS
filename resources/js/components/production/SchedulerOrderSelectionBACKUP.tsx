import React, { useState, useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Zap, Users, ArrowRight, SquareDashedMousePointer } from 'lucide-react';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderSelectionPanel from '@/pages/production/scheduler/components/OrderSelectionPanel';
import FamilyVisualization from '@/pages/production/scheduler/components/FamilyVisualization';
import ValidationModal from '@/pages/production/scheduler/components/ValidationModal';

interface SchedulerRunData {
    version_id: number;
    algorithm: string;
    start_date: string;
    end_date: string;
    manufacturing_order_ids: number[];
    respect_locked_schedules: boolean;
}

interface SchedulerOrderSelectionProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRunScheduler: (data: SchedulerRunData) => void;
    onSchedulerStarted?: (jobData: { job_id: string; websocket_channel: string; version_id: number }) => void;
    algorithms: Array<{ value: string; label: string }>;
    defaultStartDate: string;
    activeScheduleVersion: any;
    currentVersion: any;
    orders: any[];
    workCells: any[];
    filters: any;
}

// Family Empty State Component
const FamilyEmptyState = () => {
    return (
        <div className="flex flex-col">
            <div className="py-0 px-0 mb-4">
                <div className="flex items-center justify-between text-base font-semibold">
                    <span>Selected Orders</span>
                    <Badge variant="secondary" className="text-xs">
                        0 order families
                    </Badge>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center pt-12">
                <div className="text-center max-w-md">
                    <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-muted/50 dark:bg-muted/30 flex items-center justify-center">
                        <SquareDashedMousePointer className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                        No Orders Selected
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                        Select manufacturing orders from the left panel to view their family relationships and dependencies.
                    </p>
                    <div className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-lg bg-muted/30 dark:bg-muted/20">
                        <span className="text-sm font-medium">Select orders</span>
                        <ArrowRight className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">View families</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function SchedulerOrderSelection({
    open,
    onOpenChange,
    onRunScheduler,
    onSchedulerStarted,
    algorithms,
    defaultStartDate,
    activeScheduleVersion,
    currentVersion,
    orders,
    workCells: _workCells,
    filters
}: SchedulerOrderSelectionProps) {

    const { schedulingConfig, flash } = usePage().props as any;
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [families, setFamilies] = useState<any[]>([]);
    const [selectionMode, setSelectionMode] = useState<'individual' | 'family'>('family');
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<any>(null);

    // Monitor flash data for scheduling job response
    useEffect(() => {
        // Check all possible locations for the scheduling job data
        const schedulingJob = flash?.schedulingJob ||
            (flash?.success && flash?.job_id ? flash : null);

        if (schedulingJob && open) {
            // Close this modal
            onOpenChange(false);

            // Trigger the progress modal
            if (onSchedulerStarted) {
                // Handle different data structures
                const jobData = schedulingJob.schedulingJob || schedulingJob;
                onSchedulerStarted({
                    job_id: jobData.job_id,
                    websocket_channel: jobData.websocket_channel,
                    version_id: jobData.version_id,
                });
            }
        }
    }, [flash, open, onOpenChange, onSchedulerStarted]);


    const { data, setData, post, processing } = useForm({
        version_id: currentVersion?.id || activeScheduleVersion?.id,
        algorithm: 'asap',
        start_date: defaultStartDate,
        end_date: filters?.end_date || format(new Date().setMonth(new Date().getMonth() + 3), 'yyyy-MM-dd'),
        manufacturing_order_ids: [] as number[],
        respect_locked_schedules: (schedulingConfig as any)?.locked_schedules_enabled || true,
    });

    // Handle family selection mode
    useEffect(() => {
        if (selectedOrders.length > 0 && selectionMode !== 'individual') {
            fetchFamilies(selectedOrders);
        }
    }, [selectedOrders, selectionMode]);

    // Handle validation modal display
    useEffect(() => {
        if (flash?.showValidationModal && flash?.validation) {
            // Modal will be shown based on this state
        }
    }, [flash]);

    const fetchFamilies = async (orderIds: number[]) => {
        try {
            const response = await fetch(route('production.scheduler.families', { order_ids: orderIds }));
            const data = await response.json();
            setFamilies(data.families || []);
        } catch (error) {
            console.error('Failed to fetch families:', error);
        }
    };

    const handleOrderSelection = (orderIds: number[]) => {
        setSelectedOrders(orderIds);
        setData('manufacturing_order_ids', orderIds);

        // Clear families if no orders selected, otherwise fetch families
        if (orderIds.length === 0) {
            setFamilies([]);
        } else {
            fetchFamilies(orderIds);
        }
    };

    const validateAndRun = () => {
        if (data.manufacturing_order_ids.length === 0) {
            alert('Please select at least one manufacturing order');
            return;
        }

        setIsValidating(true);
        post(route('production.scheduler.validate'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                setIsValidating(false);
                // Check the validation result from the page props
                const validation = (page.props as any).flash?.validation;
                if (validation) {
                    setValidationResult(validation);
                    if (validation.valid) {
                        runScheduler();
                    }
                } else {
                    // If no validation result, assume it's valid and run anyway
                    runScheduler();
                }
            },
            onError: (_errors) => {
                setIsValidating(false);
            }
        });
    };

    const runScheduler = () => {
        if (!data.version_id) {
            console.error('No version_id found in data');
            alert('Error: No schedule version ID found. Please check if a schedule version exists.');
            return;
        }

        // Use Inertia to post the data
        post(route('production.scheduler.run'), {
            onSuccess: () => {
                // The controller will return with flash data
                // The useEffect hook will handle closing this modal and opening the progress modal
            },
            onError: (errors) => {
                console.error('Error starting scheduler:', errors);
                alert('Failed to start scheduling. Please try again.');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!w-[95vw] !max-w-[1400px] !h-[85vh] !max-h-[85vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-lg font-semibold">Seleção de Ordens para Programação</DialogTitle>
                            {activeScheduleVersion && (
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                    <Clock className="w-3 h-3" />
                                    v{activeScheduleVersion.version_number}
                                </Badge>
                            )}
                        </div>
                        {selectedOrders.length > 0 && (
                            <Badge className="bg-primary/10 text-primary">
                                {selectedOrders.length} orders selected
                            </Badge>
                        )}
                    </div>
                    <DialogDescription className="sr-only">
                        Configure scheduling parameters, select manufacturing orders, and run the production scheduler
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {/* Compact Configuration Bar */}
                    <div className="px-6 pt-0 pb-4 border-b bg-muted/30 flex-shrink-0">
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                            {/* Algorithm Selection */}
                            <div className="flex items-center gap-2.5">
                                <Label htmlFor="algorithm" className="text-sm font-medium whitespace-nowrap">Algorithm:</Label>
                                <Select
                                    value={data.algorithm}
                                    onValueChange={(value) => setData('algorithm', value)}
                                >
                                    <SelectTrigger id="algorithm" className="w-[250px] h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {algorithms.map((algo) => (
                                            <SelectItem key={algo.value} value={algo.value}>
                                                {algo.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date Range */}
                            <div className="flex items-center gap-2.5">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <Label className="text-sm font-medium whitespace-nowrap">Date Range:</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        className="h-8 px-3 py-1 text-sm rounded-md border border-input bg-background"
                                    />
                                    <span className="text-sm text-muted-foreground">to</span>
                                    <input
                                        type="date"
                                        value={data.end_date}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                        min={data.start_date}
                                        className="h-8 px-3 py-1 text-sm rounded-md border border-input bg-background"
                                    />
                                </div>
                            </div>

                            {/* Respect Locked */}
                            <div className="flex items-center gap-2.5 ml-auto">
                                <Checkbox
                                    id="respect-locked"
                                    checked={data.respect_locked_schedules}
                                    onCheckedChange={(checked) =>
                                        setData('respect_locked_schedules', checked as boolean)
                                    }
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="respect-locked" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                                    Respect locked schedules
                                </Label>
                            </div>

                            {/* Algorithm hint */}
                            {data.algorithm === 'due_date' && (
                                <div className="w-full">
                                    <span className="text-xs text-muted-foreground italic">
                                        (Backward scheduling with auto-forward fallback)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Area with Tabs or Side-by-Side Layout */}
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <div className="flex-1 flex min-h-0">
                            <div className="hidden lg:flex flex-1 min-h-0 w-full">
                                {/* Desktop Side-by-Side */}
                                <div className="flex-1 border-r px-4 py-3 overflow-hidden flex flex-col min-h-0">
                                    <OrderSelectionPanel
                                        orders={orders}
                                        selectedOrders={selectedOrders}
                                        onSelectionChange={handleOrderSelection}
                                        selectionMode={selectionMode}
                                        onSelectionModeChange={setSelectionMode}
                                    />
                                </div>
                                <div className="flex-1 px-4 py-3 overflow-hidden flex flex-col min-h-0">
                                    {selectedOrders.length > 0 ? (
                                        <FamilyVisualization
                                            families={families}
                                            selectedOrders={selectedOrders}
                                        />
                                    ) : (
                                        <FamilyEmptyState />
                                    )}
                                </div>
                            </div>

                            {/* Mobile/Tablet Tabs */}
                            <div className="lg:hidden w-full h-full flex flex-col min-h-0">
                                <Tabs defaultValue="orders" className="h-full flex flex-col min-h-0">
                                    <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                                        <TabsTrigger value="orders">
                                            Orders ({selectedOrders.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="families">
                                            Families ({families.length})
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="orders" className="flex-1 overflow-hidden mt-0 px-4 py-3 flex flex-col min-h-0">
                                        <OrderSelectionPanel
                                            orders={orders}
                                            selectedOrders={selectedOrders}
                                            onSelectionChange={handleOrderSelection}
                                            selectionMode={selectionMode}
                                            onSelectionModeChange={setSelectionMode}
                                        />
                                    </TabsContent>
                                    <TabsContent value="families" className="flex-1 overflow-hidden mt-0 px-4 py-3 flex flex-col min-h-0">
                                        {selectedOrders.length > 0 ? (
                                            <FamilyVisualization
                                                families={families}
                                                selectedOrders={selectedOrders}
                                            />
                                        ) : (
                                            <FamilyEmptyState />
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Action Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="text-sm text-muted-foreground">
                        {selectedOrders.length === 0 ? (
                            'Select orders to continue'
                        ) : (
                            `${selectedOrders.length} order${selectedOrders.length > 1 ? 's' : ''} will be scheduled`
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => validateAndRun()}
                            disabled={processing || isValidating || selectedOrders.length === 0}
                            className="min-w-[120px]"
                        >
                            {isValidating ? 'Validating...' : 'Run Scheduler'}
                        </Button>
                    </div>
                </div>

                {/* Validation Modal */}
                {validationResult && !validationResult.valid && (
                    <ValidationModal
                        validation={validationResult}
                        onClose={() => setValidationResult(null)}
                        onContinue={runScheduler}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
