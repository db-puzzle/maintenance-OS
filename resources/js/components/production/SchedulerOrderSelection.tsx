import React, { useState, useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, ArrowRight, SquareDashedMousePointer, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import OrderSelectionPanel from '@/pages/production/scheduler/components/OrderSelectionPanel';
import FamilyVisualization from '@/pages/production/scheduler/components/FamilyVisualization';
import ValidationModal from '@/pages/production/scheduler/components/ValidationModal';
import TimeParameterHierarchicalView from '@/components/production/scheduler/TimeParameterHierarchicalView';
import { cn } from '@/lib/utils';

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
    activeScheduleVersion: { id: number; name: string } | null;
    currentVersion: { id: number; name: string } | null;
    orders: Array<{ id: number; order_number: string; item: { name: string }; family_id?: number }>;
    workCells: Array<{ id: number; name: string }>;
    filters: Record<string, unknown>;
}

// Step Indicator Component
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const steps = [
        { number: 1, label: 'Select Orders', icon: SquareDashedMousePointer },
        { number: 2, label: 'Configure Time', icon: Clock },
        { number: 3, label: 'Review & Start', icon: Check }
    ];

    return (
        <div className="flex items-center justify-center w-full py-4 border-b">
            <div className="flex items-center gap-8">
                {steps.map((step, index) => (
                    <React.Fragment key={step.number}>
                        <div className="flex items-center gap-3">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                                    currentStep > step.number
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : currentStep === step.number
                                            ? "border-primary text-primary"
                                            : "border-muted-foreground/30 text-muted-foreground"
                                )}
                            >
                                {currentStep > step.number ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <span className="text-sm font-semibold">{step.number}</span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span
                                    className={cn(
                                        "text-sm font-medium",
                                        currentStep >= step.number ? "text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                            <ChevronRight
                                className={cn(
                                    "w-4 h-4",
                                    currentStep > step.number ? "text-primary" : "text-muted-foreground/30"
                                )}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default function SchedulerOrderSelection({
    open,
    onOpenChange,
    onRunScheduler: _onRunScheduler,
    onSchedulerStarted,
    algorithms,
    defaultStartDate,
    activeScheduleVersion,
    currentVersion,
    orders,
    workCells: _workCells,
    filters: _filters
}: SchedulerOrderSelectionProps) {

    const { flash } = usePage().props as { flash: { success?: string; error?: string; schedulingJob?: { job_id: string; websocket_channel: string; version_id: number } } & Record<string, unknown> };
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [families, setFamilies] = useState<Array<{ id: number; name: string; orders: Array<{ id: number }> }>>([]);
    const [selectionMode, setSelectionMode] = useState<'individual' | 'family'>('family');
    const [validationResult, setValidationResult] = useState<{ is_valid: boolean; errors: string[]; warnings: string[] } | null>(null);
    const [timeParameterData, setTimeParameterData] = useState<Array<{ order_id: number; time_parameter_status: string; children?: Array<{ order_id: number; time_parameter_status: string }> }>>([]);
    const [loadingTimeParams, setLoadingTimeParams] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    // Initialize form with useForm hook
    const { data, setData, post, processing, errors: _errors } = useForm({
        version_id: currentVersion?.id || 0,
        algorithm: algorithms[0]?.value || 'asap',
        start_date: defaultStartDate || format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd'),
        manufacturing_order_ids: [] as number[],
        respect_locked_schedules: true,
    });

    // Monitor flash data for scheduling job response
    useEffect(() => {
        const schedulingJob = flash?.schedulingJob ||
            (flash?.success && flash?.job_id ? flash : null);

        if (schedulingJob && open) {
            onOpenChange(false);
            if (onSchedulerStarted) {
                const jobData = schedulingJob.schedulingJob || schedulingJob;
                onSchedulerStarted({
                    job_id: jobData.job_id,
                    websocket_channel: jobData.websocket_channel,
                    version_id: jobData.version_id
                });
            }
        }
    }, [flash, open, onOpenChange, onSchedulerStarted]);

    const fetchFamilies = async (orderIds: number[]) => {
        try {
            const response = await fetch(route('production.scheduler.families', { order_ids: orderIds }));
            const data = await response.json();
            setFamilies(data.families || []);
        } catch (error) {
            console.error('Failed to fetch families:', error);
        }
    };

    const fetchTimeParameters = async (orderIds: number[]) => {
        if (orderIds.length === 0) {
            setTimeParameterData([]);
            return;
        }

        setLoadingTimeParams(true);
        try {
            const response = await axios.post(route('production.scheduler.validate-time-parameters'), {
                manufacturing_order_ids: orderIds
            });
            setTimeParameterData(response.data || []);
        } catch (error) {
            console.error('Failed to fetch time parameters:', error);
        } finally {
            setLoadingTimeParams(false);
        }
    };

    const handleOrderSelection = (orderIds: number[]) => {
        setSelectedOrders(orderIds);
        setData('manufacturing_order_ids', orderIds);

        if (orderIds.length === 0) {
            setFamilies([]);
            setTimeParameterData([]);
        } else {
            fetchFamilies(orderIds);
        }
    };

    const handleRunScheduler = () => {
        post(route('production.scheduler.run'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                // Success handled by flash message
            },
            onError: (errors) => {
                console.error('Error starting scheduler:', errors);
                alert('Failed to start scheduling. Please try again.');
            }
        });
    };

    // Navigation helpers
    const canProceedToNext = () => {
        switch (currentStep) {
            case 1:
                return selectedOrders.length > 0;
            case 2: {
                // Check all orders in the hierarchical structure
                const checkAllOrdersValid = (orders: Array<{ order_id: number; time_parameter_status: string; children?: Array<{ order_id: number; time_parameter_status: string }> }>): boolean => {
                    return orders.every(order => {
                        const isValid = order.time_parameter_status === 'valid';
                        const childrenValid = order.children ? checkAllOrdersValid(order.children) : true;
                        return isValid && childrenValid;
                    });
                };
                return checkAllOrdersValid(timeParameterData);
            }
            case 3:
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (currentStep === 1 && selectedOrders.length > 0) {
            // Fetch time parameters when moving to step 2
            fetchTimeParameters(selectedOrders);
        }
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!w-[95vw] !max-w-[1400px] !h-[90vh] !max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-lg font-semibold">Production Scheduler Setup</DialogTitle>
                            {activeScheduleVersion && (
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                    <Clock className="w-3 h-3" />
                                    v{activeScheduleVersion.version_number}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <DialogDescription className="sr-only">
                        Configure scheduling parameters, select manufacturing orders, and run the production scheduler
                    </DialogDescription>
                </DialogHeader>

                {/* Step Indicator */}
                <StepIndicator currentStep={currentStep} />

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {/* Step 1: Order Selection with Configuration */}
                    {currentStep === 1 && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {/* Configuration Bar for Step 1 */}
                            <div className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
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
                                                setData('respect_locked_schedules', !!checked)
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

                            {/* Order Selection and Family Visualization */}
                            <div className="flex-1 overflow-hidden flex gap-4 p-4">
                                <div className="flex-1 overflow-hidden">
                                    <OrderSelectionPanel
                                        orders={orders}
                                        selectedOrders={selectedOrders}
                                        onSelectionChange={handleOrderSelection}
                                        selectionMode={selectionMode}
                                        onSelectionModeChange={setSelectionMode}
                                    />
                                </div>
                                <div className="w-1/3 overflow-hidden">
                                    <div className="h-full border rounded-lg p-4 overflow-auto">
                                        <h3 className="text-sm font-semibold mb-3">Family Dependencies</h3>
                                        {selectedOrders.length > 0 ? (
                                            <FamilyVisualization
                                                families={families}
                                                selectedOrders={selectedOrders}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                                                Select orders to view family dependencies
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Time Parameter Configuration */}
                    {currentStep === 2 && (
                        <div className="flex-1 overflow-hidden flex flex-col p-6">
                            {loadingTimeParams ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                        <p className="text-sm text-muted-foreground">Loading time parameters...</p>
                                    </div>
                                </div>
                            ) : (
                                <TimeParameterHierarchicalView
                                    orders={timeParameterData}
                                    showThumbnails={true}
                                    onRefresh={() => fetchTimeParameters(selectedOrders)}
                                    expandLevel={1}
                                />
                            )}
                        </div>
                    )}

                    {/* Step 3: Review and Start */}
                    {currentStep === 3 && (
                        <div className="flex-1 overflow-hidden flex flex-col p-6">
                            <div className="mb-6">
                                <h3 className="text-base font-semibold">Review Scheduling Configuration</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Review your selections before starting the scheduler
                                </p>
                            </div>

                            <div className="space-y-6">
                                {/* Configuration Summary */}
                                <div className="border rounded-lg p-4">
                                    <h4 className="text-sm font-semibold mb-3">Configuration Summary</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Algorithm:</span>
                                            <p className="font-medium">{algorithms.find(a => a.value === data.algorithm)?.label}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Date Range:</span>
                                            <p className="font-medium">{format(new Date(data.start_date), 'MMM dd, yyyy')} - {format(new Date(data.end_date), 'MMM dd, yyyy')}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Respect Locked Schedules:</span>
                                            <p className="font-medium">{data.respect_locked_schedules ? 'Yes' : 'No'}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Total Orders:</span>
                                            <p className="font-medium">{selectedOrders.length}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Selected Orders Summary */}
                                <div className="border rounded-lg p-4">
                                    <h4 className="text-sm font-semibold mb-3">Selected Orders ({selectedOrders.length})</h4>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            {orders
                                                .filter(order => selectedOrders.includes(order.id))
                                                .map(order => (
                                                    <div key={order.id} className="flex items-center gap-2 p-2 border rounded">
                                                        <Badge variant="outline" className="text-xs">
                                                            {order.order_number}
                                                        </Badge>
                                                        <span className="truncate text-xs">{order.item?.name}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Family Summary */}
                                {families.length > 0 && (
                                    <div className="border rounded-lg p-4">
                                        <h4 className="text-sm font-semibold mb-3">Family Groups ({families.length})</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Orders are grouped into {families.length} family group{families.length > 1 ? 's' : ''} based on dependencies.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with Navigation */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="text-sm text-muted-foreground">
                        {currentStep === 1 && (
                            selectedOrders.length === 0 ? 'Select orders to continue' : `${selectedOrders.length} order${selectedOrders.length > 1 ? 's' : ''} selected`
                        )}
                        {currentStep === 2 && (() => {
                            const countInvalidOrders = (orders: Array<{ order_id: number; time_parameter_status: string; children?: Array<{ order_id: number; time_parameter_status: string }> }>): number => {
                                return orders.reduce((count, order) => {
                                    const orderInvalid = order.time_parameter_status !== 'valid' ? 1 : 0;
                                    const childrenInvalid = order.children ? countInvalidOrders(order.children) : 0;
                                    return count + orderInvalid + childrenInvalid;
                                }, 0);
                            };
                            const invalidCount = countInvalidOrders(timeParameterData);
                            return invalidCount > 0
                                ? `Configure time parameters for ${invalidCount} order${invalidCount > 1 ? 's' : ''} to continue`
                                : 'All time parameters configured';
                        })()}
                        {currentStep === 3 && `Ready to schedule ${selectedOrders.length} order${selectedOrders.length > 1 ? 's' : ''}`}
                    </div>
                    <div className="flex gap-2">
                        {currentStep > 1 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrevious}
                                disabled={processing}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        {currentStep < 3 ? (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleNext}
                                disabled={!canProceedToNext()}
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleRunScheduler}
                                disabled={processing || selectedOrders.length === 0}
                            >
                                {processing ? (
                                    <>
                                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight className="w-4 h-4 mr-2" />
                                        Run Scheduler
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Validation Modal */}
                {validationResult && (
                    <ValidationModal
                        validation={validationResult}
                        onClose={() => setValidationResult(null)}
                        onContinue={() => {
                            // Continue with scheduling despite warnings
                            handleRunScheduler();
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
