import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package, Users, AlertCircle } from 'lucide-react';

interface Order {
    id: number;
    order_number: string;
    item: {
        code: string;
        description: string;
    };
    quantity: number;
    status: string;
    priority: number;
    requested_date: string;
    parent_id: number | null;
    manufacturingRoute?: {
        steps: any[];
    };
}

interface OrderSelectionPanelProps {
    orders: Order[];
    selectedOrders: number[];
    onSelectionChange: (orderIds: number[]) => void;
    selectionMode: 'individual' | 'family' | 'smart';
    onSelectionModeChange: (mode: 'individual' | 'family' | 'smart') => void;
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
        return orders.filter(order => {
            const matchesSearch = searchTerm === '' ||
                order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.item.description.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
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

            orderFamilies.forEach((family, parentId) => {
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Manufacturing Orders</span>
                    <Badge variant="secondary">
                        {selectedOrders.length} selected
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Selection Mode */}
                <div className="space-y-2">
                    <Label>Selection Mode</Label>
                    <RadioGroup value={selectionMode} onValueChange={(value: any) => onSelectionModeChange(value)}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="individual" id="individual" />
                            <Label htmlFor="individual">Individual Orders</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="family" id="family" />
                            <Label htmlFor="family">Family Groups</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="smart" id="smart" />
                            <Label htmlFor="smart">Smart (Auto-detect families)</Label>
                        </div>
                    </RadioGroup>
                </div>

                {/* Search and Filters */}
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant={statusFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('all')}
                        >
                            All
                        </Button>
                        <Button
                            variant={statusFilter === 'planned' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('planned')}
                        >
                            Planned
                        </Button>
                        <Button
                            variant={statusFilter === 'released' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('released')}
                        >
                            Released
                        </Button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                        Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear
                    </Button>
                </div>

                {/* Order List */}
                <ScrollArea className="h-[400px] border rounded-md p-2">
                    <div className="space-y-2">
                        {filteredOrders.map(order => {
                            const isParent = !order.parent_id;
                            const hasChildren = orders.some(o => o.parent_id === order.id);
                            const isSelected = selectedOrders.includes(order.id);

                            return (
                                <div
                                    key={order.id}
                                    className={`p-3 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50'
                                        } ${!isParent ? 'ml-6' : ''}`}
                                    onClick={() => handleOrderToggle(order.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => { }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{order.order_number}</span>
                                                    {hasChildren && (
                                                        <Users className="w-4 h-4 text-blue-500" />
                                                    )}
                                                    {!order.manufacturingRoute && (
                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {order.item.code} - {order.item.description}
                                                </div>
                                                <div className="flex items-center gap-4 mt-1 text-sm">
                                                    <span>Qty: {order.quantity}</span>
                                                    <span>Priority: {order.priority}</span>
                                                    {order.requested_date && (
                                                        <span>Due: {new Date(order.requested_date).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className={`${getOrderBadgeColor(order.status)} text-white`}>
                                            {order.status}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
