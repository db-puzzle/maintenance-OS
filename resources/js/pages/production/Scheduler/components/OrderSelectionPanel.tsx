import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TextInput } from '@/components/TextInput';
import { Users, AlertCircle } from 'lucide-react';

interface Order {
    id: number;
    order_number: string;
    item: {
        code: string;
        name: string;
        description: string;
    };
    quantity: number;
    status: string;
    priority: number;
    requested_date: string;
    parent_id: number | null;
    manufacturingRoute?: {
        id: number;
        name: string;
        steps: Array<{
            id: number;
            name: string;
            sequence_number: number;
            work_cell_id: number;
        }>;
    } | null;
}

interface OrderSelectionPanelProps {
    orders: Order[];
    selectedOrders: number[];
    onSelectionChange: (orderIds: number[]) => void;
    selectionMode: 'individual' | 'family';
    onSelectionModeChange: (mode: 'individual' | 'family') => void;
}

export default function OrderSelectionPanel({
    orders,
    selectedOrders,
    onSelectionChange,
    selectionMode,
    onSelectionModeChange
}: OrderSelectionPanelProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');


    // Filter orders based on search and status
    const filteredOrders = useMemo(() => {
        const filtered = orders.filter(order => {
            const matchesSearch = searchTerm === '' ||
                order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.item?.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((order.item as any)?.item_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.item?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.item?.description || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        return filtered;
    }, [orders, searchTerm, statusFilter]);

    // Group orders by family
    const orderFamilies = useMemo(() => {
        const families = new Map<number, Order[]>();

        // First, identify all top-level parents
        orders.forEach(order => {
            if (!order.parent_id) {
                families.set(order.id, [order]);
            }
        });

        // Then, assign children to their families
        orders.forEach(order => {
            if (order.parent_id) {
                // Find the top parent
                let topParent = orders.find(o => o.id === order.parent_id);
                while (topParent?.parent_id) {
                    topParent = orders.find(o => o.id === topParent!.parent_id);
                }

                if (topParent && families.has(topParent.id)) {
                    families.get(topParent.id)!.push(order);
                }
            }
        });

        return families;
    }, [orders]);

    const handleOrderToggle = (orderId: number) => {
        if (selectionMode === 'individual') {
            if (selectedOrders.includes(orderId)) {
                onSelectionChange(selectedOrders.filter(id => id !== orderId));
            } else {
                onSelectionChange([...selectedOrders, orderId]);
            }
        } else {
            // Find the family this order belongs to
            let familyOrders: number[] = [];

            orderFamilies.forEach((family, _parentId) => {
                if (family.some(o => o.id === orderId)) {
                    familyOrders = family.map(o => o.id);
                }
            });

            if (familyOrders.length > 0) {
                const allSelected = familyOrders.every(id => selectedOrders.includes(id));

                if (allSelected) {
                    onSelectionChange(selectedOrders.filter(id => !familyOrders.includes(id)));
                } else {
                    const newSelection = [...selectedOrders];
                    familyOrders.forEach(id => {
                        if (!newSelection.includes(id)) {
                            newSelection.push(id);
                        }
                    });
                    onSelectionChange(newSelection);
                }
            }
        }
    };

    const selectAll = () => {
        onSelectionChange(filteredOrders.map(o => o.id));
    };

    const clearSelection = () => {
        onSelectionChange([]);
    };

    const getOrderBadgeColor = (status: string) => {
        switch (status) {
            case 'planned': return 'bg-blue-500';
            case 'released': return 'bg-green-500';
            case 'in_progress': return 'bg-yellow-500';
            case 'completed': return 'bg-gray-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="h-full flex flex-col gap-3 min-h-0">

            {/* Search and Filters */}
            <div className="flex gap-2 items-center flex-shrink-0">
                <div className="flex-1">
                    <TextInput
                        form={{
                            data: { search: searchTerm },
                            setData: ((_key: string, value?: string | number | boolean | File | null | undefined) => {
                                if (typeof _key === 'string' && value !== undefined) {
                                    setSearchTerm(String(value || ''));
                                }
                            }) as any,
                            errors: {},
                            clearErrors: () => { }
                        }}
                        name="search"
                        label=""
                        placeholder="Search orders..."
                    />
                </div>

                <div className="ml-2 flex gap-1">
                    <Button
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                        className="h-7 w-26.5 px-2 text-xs"
                    >
                        All
                    </Button>
                    <Button
                        variant={statusFilter === 'planned' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('planned')}
                        className="h-7 w-26.5 px-2 text-xs"
                    >
                        Planned
                    </Button>
                    <Button
                        variant={statusFilter === 'released' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter('released')}
                        className="h-7 w-26.5 px-2 text-xs"
                    >
                        Released
                    </Button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 items-center flex-shrink-0">
                {/* Selection Mode */}
                <Button
                    variant={selectionMode === 'family' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSelectionModeChange('family')}
                    className="h-7 px-2 text-xs flex-1"
                >
                    Family
                </Button>
                <Button
                    variant={selectionMode === 'individual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSelectionModeChange('individual')}
                    className="h-7 px-2 text-xs flex-1"
                >
                    Individual
                </Button>


                {/* Divider */}
                <div className="h-7 w-px bg-border" />

                {/* Selection Actions */}
                <Button variant="outline" size="sm" onClick={selectAll} className="h-7 px-2 text-xs flex-1">
                    Select All ({filteredOrders.length})
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection} className="h-7 px-2 text-xs flex-1">
                    Clear
                </Button>
            </div>

            {/* Alerts */}
            <div className="flex-shrink-0">
                {orders.length > filteredOrders.length && searchTerm === '' && statusFilter === 'all' && (
                    <Alert className="py-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                            Showing {filteredOrders.length} of {orders.length} orders.
                        </AlertDescription>
                    </Alert>
                )}

                {filteredOrders.some(order => !order.manufacturingRoute || !order.manufacturingRoute.steps || order.manufacturingRoute.steps.length === 0) && (
                    <Alert className="py-2" variant="destructive">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                            Some orders lack manufacturing routes.
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {/* Order List */}
            <div className="flex-1 overflow-hidden min-h-0 -mx-4 border-t">
                <ScrollArea className="h-full">
                    <div className="pt-4 px-6 py-2">
                        <div className="space-y-2">
                            {filteredOrders.map(order => {
                                const hasChildren = orders.some(o => o.parent_id === order.id);
                                const isSelected = selectedOrders.includes(order.id);

                                return (
                                    <div
                                        key={order.id}
                                        className={`p-2 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50'}`}
                                        onClick={() => handleOrderToggle(order.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-3">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => { }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-3.5 w-3.5"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-sm">{order.order_number}</span>
                                                        {hasChildren && (
                                                            <Users className="w-3 h-3 text-blue-500" />
                                                        )}
                                                        {(!order.manufacturingRoute || !order.manufacturingRoute.steps || order.manufacturingRoute.steps.length === 0) && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <AlertCircle className="w-3 h-3 text-red-500" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>This order has no manufacturing route steps defined.</p>
                                                                    <p>Please assign a route before scheduling.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-600 truncate">
                                                        {order.item?.code || 'No Code'} - {order.item?.name || order.item?.description || 'No Description'}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                                        <span>Qty: {order.quantity}</span>
                                                        <span>P{order.priority}</span>
                                                        {order.requested_date && (
                                                            <span>{new Date(order.requested_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={`${getOrderBadgeColor(order.status)} text-white text-xs py-0 px-1.5`}>
                                                {order.status}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
