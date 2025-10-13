import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock, Factory } from 'lucide-react';
import { TextInput } from '@/components/TextInput';
import { createFormAdapter } from '@/utils/form-adapters';

interface TimeParameterFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    step: any;
    orderId: number;
    orderQuantity: number;
    itemId?: number;
    onSuccess?: () => void;
}

export default function TimeParameterForm({
    open,
    onOpenChange,
    step,
    orderId,
    orderQuantity,
    itemId,
    onSuccess,
}: TimeParameterFormProps) {
    const [activeTab, setActiveTab] = useState<'step' | 'workcell'>(
        step.has_step_time ? 'step' : 'workcell'
    );

    // Form for step times
    const stepForm = useForm({
        setup_time_minutes: step.setup_time_minutes || 0,
        cycle_time_minutes: step.cycle_time_minutes || 0,
    });

    const stepFormAdapter = createFormAdapter(stepForm);

    // Form for work cell rates
    const workCellForm = useForm({
        item_id: itemId || '',
        setup_time_minutes: step.work_cell_rate?.setup_time_minutes || 0,
        production_rate_per_hour: step.work_cell_rate?.production_rate_per_hour || 0,
        unit_of_measure: step.work_cell_rate?.unit_of_measure || 'pieces',
        notes: step.work_cell_rate?.notes || '',
    });

    const workCellFormAdapter = createFormAdapter(workCellForm);

    const handleStepUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        stepForm.patch(route('production.steps.update-time', step.id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                onSuccess?.();
            },
        });
    };

    const handleWorkCellUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!step.work_cell_id) {
            alert('This step does not have a work cell assigned');
            return;
        }
        workCellForm.post(route('production.work-cells.update-rate', step.work_cell_id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                onSuccess?.();
            },
        });
    };

    const calculateTotalTime = (setupTime: number, cycleTime: number, quantity: number) => {
        return setupTime + (cycleTime * quantity);
    };

    const calculateCycleTimeFromRate = (rate: number) => {
        return rate > 0 ? 60 / rate : 0;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Configure Time Parameters</DialogTitle>
                    <DialogDescription>
                        Set up time parameters for "{step.name}"{' '}
                        {step.work_cell && `on ${step.work_cell.name}`}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'step' | 'workcell')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="step" className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Step Times
                        </TabsTrigger>
                        <TabsTrigger
                            value="workcell"
                            disabled={!step.work_cell_id}
                            className="flex items-center gap-2"
                        >
                            <Factory className="w-4 h-4" />
                            Work Cell Rate
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="step" className="space-y-4 mt-4">
                        <form onSubmit={handleStepUpdate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="setup_time">Setup Time (minutes)</Label>
                                    <TextInput
                                        id="setup_time"
                                        form={stepFormAdapter}
                                        name="setup_time_minutes"
                                        type="number"
                                        min="0"
                                        step="1"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cycle_time">Cycle Time (minutes/piece)</Label>
                                    <TextInput
                                        id="cycle_time"
                                        form={stepFormAdapter}
                                        name="cycle_time_minutes"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Total time for {orderQuantity} pieces:{' '}
                                    <strong>
                                        {Math.round(
                                            calculateTotalTime(
                                                Number(stepForm.data.setup_time_minutes),
                                                Number(stepForm.data.cycle_time_minutes),
                                                orderQuantity
                                            )
                                        )}{' '}
                                        minutes
                                    </strong>
                                </AlertDescription>
                            </Alert>

                            {step.has_step_time && (
                                <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                                    <AlertDescription>
                                        Currently using step times. These values will override any work cell rates.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={stepForm.processing}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={stepForm.processing}>
                                    {stepForm.processing ? 'Saving...' : 'Save Step Times'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>

                    <TabsContent value="workcell" className="space-y-4 mt-4">
                        {!step.work_cell_id ? (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    This step does not have a work cell assigned. Please assign a work cell first.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <form onSubmit={handleWorkCellUpdate} className="space-y-4">
                                <input type="hidden" {...workCellFormAdapter.data} name="item_id" value={itemId} />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="wc_setup_time">Setup Time (minutes)</Label>
                                        <TextInput
                                            id="wc_setup_time"
                                            form={workCellFormAdapter}
                                            name="setup_time_minutes"
                                            type="number"
                                            min="0"
                                            step="1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="production_rate">Production Rate</Label>
                                        <div className="flex gap-2">
                                            <TextInput
                                                id="production_rate"
                                                form={workCellFormAdapter}
                                                name="production_rate_per_hour"
                                                type="number"
                                                min="0.001"
                                                step="0.001"
                                                className="flex-1"
                                            />
                                            <TextInput
                                                form={workCellFormAdapter}
                                                name="unit_of_measure"
                                                placeholder="units"
                                                className="w-24"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">per hour</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes (optional)</Label>
                                    <TextInput
                                        id="notes"
                                        form={workCellFormAdapter}
                                        name="notes"
                                        multiline
                                        rows={3}
                                    />
                                </div>

                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="space-y-1">
                                            <div>
                                                Cycle time per piece:{' '}
                                                <strong>
                                                    {calculateCycleTimeFromRate(
                                                        Number(workCellForm.data.production_rate_per_hour)
                                                    ).toFixed(2)}{' '}
                                                    minutes
                                                </strong>
                                            </div>
                                            <div>
                                                Total time for {orderQuantity} pieces:{' '}
                                                <strong>
                                                    {Math.round(
                                                        calculateTotalTime(
                                                            Number(workCellForm.data.setup_time_minutes),
                                                            calculateCycleTimeFromRate(
                                                                Number(workCellForm.data.production_rate_per_hour)
                                                            ),
                                                            orderQuantity
                                                        )
                                                    )}{' '}
                                                    minutes
                                                </strong>
                                            </div>
                                        </div>
                                    </AlertDescription>
                                </Alert>

                                {step.has_work_cell_rate && !step.has_step_time && (
                                    <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                                        <AlertDescription>
                                            Currently using work cell rate. Step-specific times will override this if set.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                        disabled={workCellForm.processing}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={workCellForm.processing}>
                                        {workCellForm.processing ? 'Saving...' : 'Save Work Cell Rate'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
