import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import OrderSelectionPanel from '../OrderSelectionPanel';
import FamilyVisualization from '../FamilyVisualization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ManufacturingOrder } from '@/types/production';
import { ScheduleVersion } from '@/types/scheduler';

// Declare the global route function
declare const route: (name: string, params?: Record<string, string | number | undefined>) => string;

interface OrderFamily {
    family_id: string;
    family_name: string;
    orders: number[];
}

interface OrderSelectionStepProps {
    orders: ManufacturingOrder[];
    defaultStartDate: string;
    currentVersion?: ScheduleVersion;
    activeScheduleVersion?: ScheduleVersion;
    onNext: (selectedOrders: number[], dateRange: { start_date: string; end_date: string }) => void;
}

export function OrderSelectionStep({
    orders,
    defaultStartDate,
    currentVersion: _currentVersion,
    activeScheduleVersion: _activeScheduleVersion,
    onNext,
}: OrderSelectionStepProps) {
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [families, setFamilies] = useState<OrderFamily[]>([]);
    const [selectionMode, setSelectionMode] = useState<'individual' | 'family'>('family');

    // Date range state
    const [startDate, setStartDate] = useState(defaultStartDate || format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd'));

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
            start_date: startDate,
            end_date: endDate,
        });
    };

    return (
        <div className="space-y-6">
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
                                dateRange={{
                                    startDate,
                                    endDate,
                                    onStartDateChange: setStartDate,
                                    onEndDateChange: setEndDate
                                }}
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
