import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import OrderSelectionPanel from '../OrderSelectionPanel';
import FamilyVisualization from '../FamilyVisualization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrderSelectionStepProps {
    orders: any[];
    algorithms: Array<{ value: string; label: string }>;
    defaultStartDate: string;
    currentVersion?: any;
    activeScheduleVersion?: any;
    onNext: (selectedOrders: number[], configData: any) => void;
}

export function OrderSelectionStep({
    orders,
    algorithms,
    defaultStartDate,
    currentVersion,
    activeScheduleVersion,
    onNext,
}: OrderSelectionStepProps) {
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [families, setFamilies] = useState<any[]>([]);
    const [selectionMode, setSelectionMode] = useState<'individual' | 'family'>('family');

    // Configuration state
    const [algorithm, setAlgorithm] = useState(algorithms[0]?.value || 'asap');
    const [startDate, setStartDate] = useState(defaultStartDate || format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd'));
    const [respectLockedSchedules, setRespectLockedSchedules] = useState(true);

    const fetchFamilies = async (orderIds: number[]) => {
        if (orderIds.length === 0) {
            setFamilies([]);
            return;
        }

        try {
            // Build query string with array parameters
            const params = new URLSearchParams();
            orderIds.forEach(id => params.append('order_ids[]', id.toString()));

            const response = await fetch(route('production.scheduler.families') + '?' + params.toString());
            const data = await response.json();
            setFamilies(data.families || []);
        } catch (error) {
            console.error('Failed to fetch families:', error);
        }
    };

    const handleOrderSelection = (orderIds: number[]) => {
        setSelectedOrders(orderIds);
        fetchFamilies(orderIds);
    };

    const handleNext = () => {
        onNext(selectedOrders, {
            algorithm,
            start_date: startDate,
            end_date: endDate,
            respect_locked_schedules: respectLockedSchedules,
        });
    };

    return (
        <div className="space-y-6">
            {/* Configuration Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Scheduling Configuration</CardTitle>
                    <CardDescription>
                        Configure the scheduling parameters for your production run
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Algorithm Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="algorithm">Scheduling Algorithm</Label>
                            <Select
                                value={algorithm}
                                onValueChange={setAlgorithm}
                            >
                                <SelectTrigger id="algorithm" className="w-full">
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
                            {algorithm === 'due_date' && (
                                <p className="text-xs text-muted-foreground">
                                    Backward scheduling with auto-forward fallback
                                </p>
                            )}
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2">
                            <Label>Date Range</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <span className="text-sm text-muted-foreground">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Respect Locked Schedules */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="respect-locked"
                            checked={respectLockedSchedules}
                            onCheckedChange={(checked) => setRespectLockedSchedules(!!checked)}
                        />
                        <Label
                            htmlFor="respect-locked"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Respect locked schedules
                        </Label>
                    </div>

                    {/* Version Info */}
                    {activeScheduleVersion && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Working with schedule version <Badge variant="outline" className="ml-1">v{activeScheduleVersion.version_number}</Badge>
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Order Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Select Manufacturing Orders</CardTitle>
                            <CardDescription>
                                Choose the orders to include in this scheduling run
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OrderSelectionPanel
                                orders={orders}
                                selectedOrders={selectedOrders}
                                onSelectionChange={handleOrderSelection}
                                selectionMode={selectionMode}
                                onSelectionModeChange={setSelectionMode}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Family Dependencies</CardTitle>
                            <CardDescription>
                                Visual representation of order relationships
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedOrders.length > 0 ? (
                                <FamilyVisualization
                                    families={families}
                                    selectedOrders={selectedOrders}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                                    Select orders to view family dependencies
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                    {selectedOrders.length === 0
                        ? 'Select orders to continue'
                        : `${selectedOrders.length} order${selectedOrders.length !== 1 ? 's' : ''} selected`}
                </div>
                <Button
                    onClick={handleNext}
                    disabled={selectedOrders.length === 0}
                >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
