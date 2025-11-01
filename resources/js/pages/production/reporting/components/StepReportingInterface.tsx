import React, { useState } from 'react';
import { ManufacturingOrder, ManufacturingStep, ManufacturingStepExecution } from '@/types/production';
import { Plus, Minus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { createFormAdapter } from '@/utils/form-adapters';
import { TextArea } from '@/components/TextArea';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/number';
import axios from 'axios';

interface StepReportingInterfaceProps {
    step: ManufacturingStep;
    execution: ManufacturingStepExecution;
    order: ManufacturingOrder;
    onSubmit: () => void;
}

export function StepReportingInterface({
    step,
    execution,
    order,
    onSubmit
}: StepReportingInterfaceProps) {
    const [activeTab, setActiveTab] = useState<'production' | 'scrap' | 'quality'>('production');
    const [submitting, setSubmitting] = useState(false);

    const { data, setData, errors, clearErrors, reset } = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        scrap_reason: '',
        time_spent: '',
        notes: '',
        mark_complete: false,
        // Quality check fields
        quality_result: '' as 'passed' | 'failed' | '',
        quality_notes: '',
        failure_action: '' as 'scrap' | 'rework' | '',
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    // Calculate max quantities
    const maxQuantity = order.quantity - (step.cumulative_quantity_completed || 0) - (step.cumulative_quantity_scrapped || 0);
    const remainingAfterReport = maxQuantity - (data.quantity_completed + data.quantity_scrapped);

    const adjustQuantity = (field: 'quantity_completed' | 'quantity_scrapped', delta: number) => {
        const currentValue = data[field];
        const newValue = Math.max(0, currentValue + delta);

        if (field === 'quantity_completed') {
            setData(field, Math.min(newValue, maxQuantity));
        } else {
            setData(field, Math.min(newValue, maxQuantity - data.quantity_completed));
        }
    };

    const handleQuickQuantity = (qty: number) => {
        const newQty = Math.min(data.quantity_completed + qty, maxQuantity);
        setData('quantity_completed', newQty);
    };

    const handleSubmit = async () => {
        // Validate based on step type
        if (step.step_type === 'quality_check' && !data.quality_result) {
            alert('Please select a quality check result');
            return;
        }

        if (data.quality_result === 'failed' && !data.failure_action) {
            alert('Please select a failure action');
            return;
        }

        if (data.quantity_scrapped > 0 && !data.scrap_reason?.trim()) {
            alert('Please provide a reason for scrapped items');
            return;
        }

        setSubmitting(true);
        try {
            // Prepare submission data
            interface SubmitData {
                quantity_completed: number;
                mark_complete: boolean;
                time_spent?: string;
                notes?: string;
                quantity_scrapped?: number;
                scrap_reason?: string;
                quality_result?: 'passed' | 'failed';
                quality_notes?: string;
                failure_action?: 'scrap' | 'rework';
            }

            const submitData: SubmitData = {
                quantity_completed: data.quantity_completed || 0,
                mark_complete: data.mark_complete,
            };

            // Only include optional fields if they have values
            if (data.time_spent) {
                submitData.time_spent = data.time_spent;
            }

            if (data.notes) {
                submitData.notes = data.notes;
            }

            // Only include scrap-related fields if there's actually scrap to report
            if (data.quantity_scrapped && data.quantity_scrapped > 0) {
                submitData.quantity_scrapped = data.quantity_scrapped;
                submitData.scrap_reason = data.scrap_reason;
            }

            // Include quality check fields if applicable
            if (step.step_type === 'quality_check') {
                submitData.quality_result = data.quality_result as 'passed' | 'failed' | undefined;
                submitData.quality_notes = data.quality_notes;
                if (data.quality_result === 'failed') {
                    submitData.failure_action = data.failure_action as 'scrap' | 'rework' | undefined;
                }
            }

            await axios.post(
                window.route('production.reporting.steps.report-progress', execution.id),
                submitData
            );

            reset();
            onSubmit();
        } catch (error) {
            console.error('Failed to report progress:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                alert(axiosError.response?.data?.message || 'Failed to report progress');
            } else {
                alert('Failed to report progress');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const isQualityCheckStep = step.step_type === 'quality_check';

    return (
        <div className="space-y-4">
            <h4 className="text-base font-semibold">Report Step Progress</h4>

            <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as 'production' | 'scrap' | 'quality')}
                className="w-full"
            >
                <TabsList className={cn("grid w-full", isQualityCheckStep ? "grid-cols-3" : "grid-cols-2")}>
                    <TabsTrigger value="production">Production</TabsTrigger>
                    <TabsTrigger value="scrap">Scrap</TabsTrigger>
                    {isQualityCheckStep && (
                        <TabsTrigger value="quality">Quality</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="production" className="space-y-4 mt-4">
                    {/* Quantity Input with +/- buttons */}
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12"
                            onClick={() => adjustQuantity('quantity_completed', -1)}
                            disabled={data.quantity_completed <= 0}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>

                        <div className="text-center">
                            <input
                                type="number"
                                value={data.quantity_completed}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setData('quantity_completed', Math.min(val, maxQuantity));
                                }}
                                className="w-24 h-14 text-2xl font-bold text-center border rounded-md"
                                min="0"
                                max={maxQuantity}
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                                {order.unit_of_measure}
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12"
                            onClick={() => adjustQuantity('quantity_completed', 1)}
                            disabled={data.quantity_completed >= maxQuantity}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Quick quantity buttons */}
                    <div className="flex gap-2 justify-center">
                        {[10, 25, 50, 100].map((qty) => (
                            <Button
                                key={qty}
                                variant="outline"
                                size="sm"
                                className="min-w-[60px]"
                                onClick={() => handleQuickQuantity(qty)}
                                disabled={qty > maxQuantity}
                            >
                                {qty}
                            </Button>
                        ))}
                    </div>

                    {/* Remaining quantity info */}
                    <div className="text-center text-sm text-muted-foreground">
                        <p>Maximum available: {formatNumber(maxQuantity)} {order.unit_of_measure}</p>
                        {remainingAfterReport > 0 && (
                            <p className="mt-1">Remaining after report: {formatNumber(remainingAfterReport)} {order.unit_of_measure}</p>
                        )}
                    </div>

                    {/* Production notes */}
                    <TextArea
                        form={formAdapter}
                        name="notes"
                        label="Notes (optional)"
                        placeholder="Add any production notes..."
                        rows={3}
                    />
                </TabsContent>

                <TabsContent value="scrap" className="space-y-4 mt-4">
                    {/* Scrap quantity controls */}
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12"
                            onClick={() => adjustQuantity('quantity_scrapped', -1)}
                            disabled={data.quantity_scrapped <= 0}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>

                        <div className="text-center">
                            <input
                                type="number"
                                value={data.quantity_scrapped}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setData('quantity_scrapped', Math.min(val, maxQuantity - data.quantity_completed));
                                }}
                                className="w-24 h-14 text-2xl font-bold text-center border rounded-md text-red-600"
                                min="0"
                                max={maxQuantity - data.quantity_completed}
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                                {order.unit_of_measure}
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12"
                            onClick={() => adjustQuantity('quantity_scrapped', 1)}
                            disabled={data.quantity_scrapped >= (maxQuantity - data.quantity_completed)}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Scrap reason */}
                    <TextArea
                        form={formAdapter}
                        name="scrap_reason"
                        label="Reason for scrap"
                        placeholder="Describe why items were scrapped..."
                        rows={3}
                        required={data.quantity_scrapped > 0}
                    />

                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md">
                        <p className="text-sm text-red-700 dark:text-red-300">
                            <strong>Note:</strong> Scrapped items will be permanently recorded and deducted from the total quantity.
                        </p>
                    </div>
                </TabsContent>

                {isQualityCheckStep && (
                    <TabsContent value="quality" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium mb-3 block">Quality Check Result</Label>
                                <RadioGroup
                                    value={data.quality_result}
                                    onValueChange={(value) => setData('quality_result', value as 'passed' | 'failed')}
                                >
                                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50">
                                        <RadioGroupItem value="passed" id="passed" />
                                        <Label htmlFor="passed" className="flex-1 cursor-pointer flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <span>Passed</span>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50">
                                        <RadioGroupItem value="failed" id="failed" />
                                        <Label htmlFor="failed" className="flex-1 cursor-pointer flex items-center gap-2">
                                            <XCircle className="w-4 h-4 text-red-600" />
                                            <span>Failed</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {data.quality_result === 'failed' && (
                                <div>
                                    <Label className="text-sm font-medium mb-3 block">Failure Action</Label>
                                    <RadioGroup
                                        value={data.failure_action}
                                        onValueChange={(value) => setData('failure_action', value as 'scrap' | 'rework')}
                                    >
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                            <RadioGroupItem value="scrap" id="scrap_action" />
                                            <Label htmlFor="scrap_action" className="flex-1 cursor-pointer">
                                                Scrap Items
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                            <RadioGroupItem value="rework" id="rework_action" />
                                            <Label htmlFor="rework_action" className="flex-1 cursor-pointer">
                                                Rework Items
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            )}

                            <TextArea
                                form={formAdapter}
                                name="quality_notes"
                                label="Quality Notes"
                                placeholder="Add quality check notes..."
                                rows={3}
                            />
                        </div>
                    </TabsContent>
                )}
            </Tabs>

            {/* Mark complete checkbox */}
            {remainingAfterReport === 0 && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.mark_complete}
                            onChange={(e) => {
                                (setData as (key: string, value: boolean) => void)('mark_complete', e.target.checked);
                            }}
                            className="rounded"
                        />
                        <span className="text-sm">
                            Mark this step as complete (all quantities will be reported)
                        </span>
                    </label>
                </div>
            )}

            {/* Submit button */}
            <Button
                variant="default"
                size="default"
                className="w-full h-12 text-base"
                onClick={handleSubmit}
                disabled={
                    submitting ||
                    (data.quantity_completed === 0 && data.quantity_scrapped === 0) ||
                    (data.quantity_scrapped > 0 && !data.scrap_reason?.trim()) ||
                    (isQualityCheckStep && !data.quality_result) ||
                    (data.quality_result === 'failed' && !data.failure_action)
                }
            >
                {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
        </div>
    );
}
