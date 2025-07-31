import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Package, Truck, CheckCircle, XCircle, Clock, FileText, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
        bill_of_material: {
            bom_number: string;
        };
    };
    product: {
        id: string;
        item_number: string;
        name: string;
    };
}

interface ShipmentPhoto {
    id: string;
    file_path: string;
    caption: string | null;
    uploaded_at: string;
}

interface Shipment {
    id: string;
    shipment_number: string;
    destination: string;
    customer_name: string;
    scheduled_date: string;
    shipped_date: string | null;
    delivered_date: string | null;
    status: 'draft' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
    shipment_type: 'customer' | 'internal' | 'vendor' | 'other';
    tracking_number: string | null;
    carrier: string | null;
    shipping_method: string | null;
    cost: number | null;
    notes: string | null;
    items: ShipmentItem[];
    photos: ShipmentPhoto[];
    created_by: {
        id: string;
        name: string;
    };
    created_at: string;
    updated_at: string;
}

interface Props {
    shipment: Shipment;
    can: {
        update: boolean;
        delete: boolean;
        ready: boolean;
        ship: boolean;
        deliver: boolean;
        upload_photos: boolean;
    };
}

const statusConfig = {
    draft: { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
    ready: { icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    in_transit: { icon: Truck, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    delivered: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    cancelled: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

const typeLabels: Record<string, string> = {
    customer: 'Customer Shipment',
    internal: 'Internal Transfer',
    vendor: 'Vendor Return',
    other: 'Other',
};

const statusLabels: Record<string, string> = {
    draft: 'Draft',
    ready: 'Ready to Ship',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

export default function ShipmentShow({ shipment, can }: Props) {
    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this shipment?')) {
            router.delete(route('production.shipments.destroy', shipment.id));
        }
    };

    const handleStatusUpdate = (action: 'ready' | 'ship' | 'deliver' | 'cancel') => {
        const routes = {
            ready: 'production.shipments.ready',
            ship: 'production.shipments.ship',
            deliver: 'production.shipments.deliver',
            cancel: 'production.shipments.cancel',
        };

        router.post(route(routes[action], shipment.id));
    };

    const breadcrumbs = [
        { title: 'Production', href: route('home') },
        { title: 'Shipments', href: route('production.shipments.index') },
        { title: shipment.shipment_number, href: '' },
    ];

    const config = statusConfig[shipment.status];
    const StatusIcon = config.icon;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Shipment ${shipment.shipment_number}`} />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold">Shipment {shipment.shipment_number}</h1>
                        <Badge variant="secondary" className={cn(config.bgColor, config.color)}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusLabels[shipment.status]}
                        </Badge>
                    </div>
                    <div className="flex gap-2">
                        {shipment.status === 'draft' && can.ready && (
                            <Button onClick={() => handleStatusUpdate('ready')} variant="outline">
                                <Package className="mr-2 h-4 w-4" />
                                Mark Ready
                            </Button>
                        )}
                        {shipment.status === 'ready' && can.ship && (
                            <Button onClick={() => handleStatusUpdate('ship')} variant="outline">
                                <Truck className="mr-2 h-4 w-4" />
                                Ship
                            </Button>
                        )}
                        {shipment.status === 'in_transit' && can.deliver && (
                            <Button onClick={() => handleStatusUpdate('deliver')} variant="outline">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Delivered
                            </Button>
                        )}
                        {can.update && ['draft', 'ready'].includes(shipment.status) && (
                            <Button asChild variant="outline">
                                <Link href={route('production.shipments.edit', shipment.id)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </Link>
                            </Button>
                        )}
                        {can.delete && shipment.status === 'draft' && (
                            <Button onClick={handleDelete} variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>
                <div className="grid gap-6">
                    {/* Shipment Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Shipment Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div>
                                <div className="text-sm text-muted-foreground">Type</div>
                                <div className="font-medium">{typeLabels[shipment.shipment_type]}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Customer</div>
                                <div className="font-medium">{shipment.customer_name}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Destination</div>
                                <div className="font-medium">{shipment.destination}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Scheduled Date</div>
                                <div className="font-medium">{format(new Date(shipment.scheduled_date), 'MMM dd, yyyy')}</div>
                            </div>
                            {shipment.carrier && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Carrier</div>
                                    <div className="font-medium">{shipment.carrier}</div>
                                </div>
                            )}
                            {shipment.tracking_number && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Tracking Number</div>
                                    <div className="font-medium">{shipment.tracking_number}</div>
                                </div>
                            )}
                            {shipment.shipped_date && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Shipped Date</div>
                                    <div className="font-medium">{format(new Date(shipment.shipped_date), 'MMM dd, yyyy')}</div>
                                </div>
                            )}
                            {shipment.delivered_date && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Delivered Date</div>
                                    <div className="font-medium">{format(new Date(shipment.delivered_date), 'MMM dd, yyyy')}</div>
                                </div>
                            )}
                            {shipment.notes && (
                                <div className="md:col-span-2">
                                    <div className="text-sm text-muted-foreground">Notes</div>
                                    <div className="mt-1 whitespace-pre-wrap">{shipment.notes}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Shipment Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Items ({shipment.items.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {shipment.items.map((item) => (
                                    <div key={item.id} className="rounded-lg border p-4">
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Product</div>
                                                <div className="font-medium">
                                                    {item.product.item_number} - {item.product.name}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Production Order</div>
                                                <div className="font-medium">{item.manufacturing_order.order_number}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Quantity</div>
                                                <div className="font-medium">{item.quantity}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Package Type</div>
                                                <div className="font-medium">{item.package_type}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Package Count</div>
                                                <div className="font-medium">{item.package_count}</div>
                                            </div>
                                            {item.weight && (
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Weight</div>
                                                    <div className="font-medium">{item.weight} kg</div>
                                                </div>
                                            )}
                                            {item.notes && (
                                                <div className="md:col-span-3">
                                                    <div className="text-sm text-muted-foreground">Notes</div>
                                                    <div className="mt-1 text-sm">{item.notes}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Photos */}
                    {shipment.photos.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Photos ({shipment.photos.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-3">
                                    {shipment.photos.map((photo) => (
                                        <div key={photo.id} className="space-y-2">
                                            <img
                                                src={photo.file_path}
                                                alt={photo.caption || 'Shipment photo'}
                                                className="w-full rounded-lg object-cover"
                                            />
                                            {photo.caption && (
                                                <p className="text-sm text-muted-foreground">{photo.caption}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
} 