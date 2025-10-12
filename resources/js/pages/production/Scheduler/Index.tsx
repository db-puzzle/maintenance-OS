import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CalendarIcon, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import OrderSelectionPanel from './components/OrderSelectionPanel';
import FamilyVisualization from './components/FamilyVisualization';
import ValidationModal from './components/ValidationModal';

interface SchedulerIndexProps {
    algorithms: Array<{ value: string; label: string }>;
    defaultStartDate: string;
    activeScheduleVersion: any;
    currentVersion: any;
    orders: any[];
    workCells: any[];
    filters: any;
}

export default function SchedulerIndex({
    algorithms,
    defaultStartDate,
    activeScheduleVersion,
    currentVersion,
    orders,
    workCells,
    filters
}: SchedulerIndexProps) {
    const { schedulingConfig, flash } = usePage().props;
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [families, setFamilies] = useState<any[]>([]);
    const [selectionMode, setSelectionMode] = useState<'individual' | 'family' | 'smart'>('smart');
    const [isValidating, setIsValidating] = useState(false);

    const { data, setData, post, processing } = useForm({
        version_id: currentVersion?.id,
        algorithm: 'asap',
        start_date: defaultStartDate,
        end_date: filters?.end_date || format(new Date().setMonth(new Date().getMonth() + 3), 'yyyy-MM-dd'),
        manufacturing_order_ids: [] as number[],
        respect_locked_schedules: schedulingConfig?.locked_schedules_enabled || true,
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
            only: ['validation', 'flash'],
            onSuccess: () => {
                setIsValidating(false);
                // If validation passes, run the scheduler
                if (flash?.validation?.valid) {
                    runScheduler();
                }
            },
            onError: () => {
                setIsValidating(false);
            }
        });
    };

    const runScheduler = () => {
        post(route('production.scheduler.run'), {
            onSuccess: () => {
                // Will redirect to progress page automatically
            },
        });
    };

    return (
        <>
            <Head title="Production Scheduler" />

            <div className="container mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Production Scheduler</h1>
                    <div className="flex gap-2">
                        {activeScheduleVersion && (
                            <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Version {activeScheduleVersion.version_number}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Algorithm Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Scheduling Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="algorithm">Algorithm</Label>
                                <Select
                                    value={data.algorithm}
                                    onValueChange={(value) => setData('algorithm', value)}
                                >
                                    <SelectTrigger id="algorithm">
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
                                {data.algorithm === 'due_date' && (
                                    <p className="text-sm text-muted-foreground">
                                        Schedules backward from due dates with automatic forward fallback
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date-range">Date Range</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                    <span className="self-center">to</span>
                                    <input
                                        type="date"
                                        value={data.end_date}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                        min={data.start_date}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="respect-locked"
                                checked={data.respect_locked_schedules}
                                onCheckedChange={(checked) =>
                                    setData('respect_locked_schedules', checked as boolean)
                                }
                            />
                            <Label htmlFor="respect-locked">
                                Respect locked schedules
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Order Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <OrderSelectionPanel
                        orders={orders}
                        selectedOrders={selectedOrders}
                        onSelectionChange={handleOrderSelection}
                        selectionMode={selectionMode}
                        onSelectionModeChange={setSelectionMode}
                    />

                    {families.length > 0 && (
                        <FamilyVisualization
                            families={families}
                            selectedOrders={selectedOrders}
                        />
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4">
                    <Button
                        variant="outline"
                        onClick={() => router.visit(route('production.scheduler.index'))}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={validateAndRun}
                        disabled={processing || isValidating || selectedOrders.length === 0}
                    >
                        {isValidating ? 'Validating...' : 'Run Scheduler'}
                    </Button>
                </div>

                {/* Validation Modal */}
                {flash?.showValidationModal && flash?.validation && (
                    <ValidationModal
                        validation={flash.validation}
                        onClose={() => router.reload({ only: ['flash'] })}
                        onContinue={runScheduler}
                    />
                )}
            </div>
        </>
    );
}
