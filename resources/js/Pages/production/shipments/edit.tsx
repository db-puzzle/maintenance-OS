import React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, X } from 'lucide-react';
import { format } from 'date-fns';

interface ShipmentItem {
    id: string;
    manufacturing_order_id: string;
    product_id: string;
    quantity: number;
    package_type: string;
    package_count: number;
    weight: number | null;
    dimensions: string | null;
    notes: string | null;
    manufacturing_order: {
        order_number: string;
        product: {
            id: string;
            item_number: string;
            name: string;
        };
    };
}

interface Shipment {
    id: string;
    shipment_number: string;
    destination: string;
    customer_name: string;
    scheduled_date: string;
    status: 'draft' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
    shipment_type: 'customer' | 'internal' | 'vendor' | 'other';
    tracking_number: string | null;
    carrier: string | null;
    shipping_method: string | null;
    cost: number | null;
    notes: string | null;
    items: ShipmentItem[];
}

interface Props {
    shipment: Shipment;
}

const typeLabels: Record<string, string> = {
    customer: 'Customer Shipment',
    internal: 'Internal Transfer',
    vendor: 'Vendor Return',
    other: 'Other',
};

export default function ShipmentEdit({ shipment }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        destination: shipment.destination,
        customer_name: shipment.customer_name,
        scheduled_date: shipment.scheduled_date,
        shipment_type: shipment.shipment_type,
        tracking_number: shipment.tracking_number || '',
        carrier: shipment.carrier || '',
        shipping_method: shipment.shipping_method || '',
        cost: shipment.cost?.toString() || '',
        notes: shipment.notes || '',
        items: shipment.items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            package_type: item.package_type,
            package_count: item.package_count,
            weight: item.weight?.toString() || '',
            dimensions: item.dimensions || '',
            notes: item.notes || '',
        })),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('production.shipments.update', shipment.id));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setData('items', newItems);
    };

    const breadcrumbs = [
        { title: 'Production', href: route('home') },
        { title: 'Shipments', href: route('production.shipments.index') },
        { title: shipment.shipment_number, href: route('production.shipments.show', shipment.id) },
        { title: 'Edit', href: '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Shipment ${shipment.shipment_number}`} />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Edit Shipment {shipment.shipment_number}</h1>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('production.shipments.show', shipment.id)}>
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                            </Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Shipment Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Shipment Details</CardTitle>
                        <CardDescription>Update the shipment information</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="shipment_type">Type</Label>
                            <Select
                                value={data.shipment_type}
                                onValueChange={(value) => setData('shipment_type', value as any)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(typeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.shipment_type && (
                                <p className="text-sm text-red-600">{errors.shipment_type}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer_name">Customer Name</Label>
                            <Input
                                id="customer_name"
                                value={data.customer_name}
                                onChange={(e) => setData('customer_name', e.target.value)}
                            />
                            {errors.customer_name && (
                                <p className="text-sm text-red-600">{errors.customer_name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="destination">Destination</Label>
                            <Input
                                id="destination"
                                value={data.destination}
                                onChange={(e) => setData('destination', e.target.value)}
                            />
                            {errors.destination && (
                                <p className="text-sm text-red-600">{errors.destination}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="scheduled_date">Scheduled Date</Label>
                            <Input
                                id="scheduled_date"
                                type="date"
                                value={data.scheduled_date}
                                onChange={(e) => setData('scheduled_date', e.target.value)}
                            />
                            {errors.scheduled_date && (
                                <p className="text-sm text-red-600">{errors.scheduled_date}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="carrier">Carrier</Label>
                            <Input
                                id="carrier"
                                value={data.carrier}
                                onChange={(e) => setData('carrier', e.target.value)}
                            />
                            {errors.carrier && (
                                <p className="text-sm text-red-600">{errors.carrier}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tracking_number">Tracking Number</Label>
                            <Input
                                id="tracking_number"
                                value={data.tracking_number}
                                onChange={(e) => setData('tracking_number', e.target.value)}
                            />
                            {errors.tracking_number && (
                                <p className="text-sm text-red-600">{errors.tracking_number}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="shipping_method">Shipping Method</Label>
                            <Input
                                id="shipping_method"
                                value={data.shipping_method}
                                onChange={(e) => setData('shipping_method', e.target.value)}
                            />
                            {errors.shipping_method && (
                                <p className="text-sm text-red-600">{errors.shipping_method}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cost">Cost</Label>
                            <Input
                                id="cost"
                                type="number"
                                step="0.01"
                                value={data.cost}
                                onChange={(e) => setData('cost', e.target.value)}
                            />
                            {errors.cost && (
                                <p className="text-sm text-red-600">{errors.cost}</p>
                            )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                            />
                            {errors.notes && (
                                <p className="text-sm text-red-600">{errors.notes}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Shipment Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Items</CardTitle>
                        <CardDescription>Update package information for each item</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {shipment.items.map((item, index) => (
                                <div key={item.id} className="rounded-lg border p-4">
                                    <div className="mb-3 font-medium">
                                        {item.manufacturing_order.product.item_number} - {item.manufacturing_order.product.name}
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label>Quantity</Label>
                                            <Input
                                                type="number"
                                                value={data.items[index].quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Package Type</Label>
                                            <Input
                                                value={data.items[index].package_type}
                                                onChange={(e) => updateItem(index, 'package_type', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Package Count</Label>
                                            <Input
                                                type="number"
                                                value={data.items[index].package_count}
                                                onChange={(e) => updateItem(index, 'package_count', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Weight (kg)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={data.items[index].weight}
                                                onChange={(e) => updateItem(index, 'weight', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Dimensions</Label>
                                            <Input
                                                value={data.items[index].dimensions}
                                                onChange={(e) => updateItem(index, 'dimensions', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-3">
                                            <Label>Notes</Label>
                                            <Textarea
                                                value={data.items[index].notes}
                                                onChange={(e) => updateItem(index, 'notes', e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </form>
        </AppLayout>
    );
} 