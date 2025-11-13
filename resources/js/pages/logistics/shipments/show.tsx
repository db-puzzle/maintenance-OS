import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Shipment } from '@/types/logistics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShipmentStatusBadge } from '@/components/logistics/shipment-status-badge';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    Truck,
    Download,
    CheckCircle,
    Package,
    MapPin,
    Calendar,
    User,
    FileText,
    AlertTriangle,
    Upload,
    X,
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { formatNumber } from '@/utils/number';
import { toast } from 'sonner';

interface Props {
    shipment: Shipment;
}

/**
 * Shipment Details Page
 *
 * Displays complete shipment information including items, status history,
 * and actions for marking as shipped or received.
 */
export default function ShowShipment({ shipment }: Props) {
    const [showShippedDialog, setShowShippedDialog] = useState(false);
    const [showReceivedDialog, setShowReceivedDialog] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [carrierName, setCarrierName] = useState('');
    const [receivingNotes, setReceivingNotes] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Logística',
            href: '/logistics/shipments',
        },
        {
            title: 'Remessas',
            href: '/logistics/shipments',
        },
        {
            title: shipment.shipment_number,
            href: route('logistics.shipments.show', shipment.id),
        },
    ];

    const handleMarkAsShipped = () => {
        setIsSubmitting(true);
        const formData = new FormData();
        if (trackingNumber) formData.append('tracking_number', trackingNumber);
        if (carrierName) formData.append('carrier_name', carrierName);

        router.post(route('logistics.shipments.mark-as-shipped', shipment.id), formData, {
            onSuccess: () => {
                toast.success('Remessa marcada como enviada');
                setShowShippedDialog(false);
            },
            onError: () => {
                toast.error('Erro ao marcar remessa como enviada');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const handleMarkAsReceived = () => {
        setIsSubmitting(true);
        const items = shipment.items?.map((item) => ({
            item_id: item.id,
            quantity_received: item.quantity_shipped - item.quantity_received,
            quantity_rejected: 0,
        })) || [];

        router.post(
            route('logistics.shipments.mark-as-received', shipment.id),
            {
                items,
                receiving_notes: receivingNotes,
            },
            {
                onSuccess: () => {
                    toast.success('Remessa marcada como recebida');
                    setShowReceivedDialog(false);
                },
                onError: () => {
                    toast.error('Erro ao marcar remessa como recebida');
                },
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setPhotos((prev) => [...prev, ...files].slice(0, 10));
    };

    const removePhoto = (index: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Remessa ${shipment.shipment_number}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={route('logistics.shipments.index')}>
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">{shipment.shipment_number}</h1>
                            <p className="text-muted-foreground">
                                {shipment.destination_name ||
                                    (shipment.destination && 'name' in shipment.destination
                                        ? String(shipment.destination.name)
                                        : '')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {shipment.is_overdue && (
                            <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Atrasado
                            </Badge>
                        )}
                        <ShipmentStatusBadge status={shipment.status} />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {shipment.packing_list_path && (
                        <Button variant="outline" asChild>
                            <a
                                href={route('logistics.shipments.packing-list', shipment.id)}
                                target="_blank"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Baixar Lista de Embalagem
                            </a>
                        </Button>
                    )}

                    {(shipment.status === 'planned' || shipment.status === 'packed') && (
                        <Button onClick={() => setShowShippedDialog(true)}>
                            <Truck className="h-4 w-4 mr-2" />
                            Marcar como Enviado
                        </Button>
                    )}

                    {(shipment.status === 'shipped' ||
                        shipment.status === 'in_transit' ||
                        shipment.status === 'delivered') && (
                            <Button onClick={() => setShowReceivedDialog(true)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar como Recebido
                            </Button>
                        )}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Left Column - Details */}
                    <div className="space-y-4">
                        {/* Shipping Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Informações de Envio
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Transportadora:</span>
                                    <p className="font-medium">{shipment.carrier_name || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Rastreamento:</span>
                                    <p className="font-medium">{shipment.tracking_number || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Data Planejada:
                                    </span>
                                    <p className="font-medium">
                                        {shipment.planned_ship_date
                                            ? new Date(shipment.planned_ship_date).toLocaleDateString(
                                                'pt-BR'
                                            )
                                            : '-'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Data Real:
                                    </span>
                                    <p className="font-medium">
                                        {shipment.actual_ship_date
                                            ? new Date(shipment.actual_ship_date).toLocaleDateString(
                                                'pt-BR'
                                            )
                                            : '-'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Destination */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Destino
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Nome:</span>
                                    <p className="font-medium">
                                        {shipment.destination_name ||
                                            (shipment.destination && 'name' in shipment.destination
                                                ? String(shipment.destination.name)
                                                : '-')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Endereço:</span>
                                    <p className="font-medium">{shipment.destination_address || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Tipo:</span>
                                    <p className="font-medium capitalize">{shipment.destination_type}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* User Tracking */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Histórico
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {shipment.creator && (
                                    <div>
                                        <span className="text-muted-foreground">Criado por:</span>
                                        <p className="font-medium">{shipment.creator.name}</p>
                                    </div>
                                )}
                                {shipment.shipper && (
                                    <div>
                                        <span className="text-muted-foreground">Enviado por:</span>
                                        <p className="font-medium">{shipment.shipper.name}</p>
                                    </div>
                                )}
                                {shipment.receiver && (
                                    <div>
                                        <span className="text-muted-foreground">Recebido por:</span>
                                        <p className="font-medium">{shipment.receiver.name}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Items */}
                    <div className="col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        Itens ({shipment.items?.length || 0})
                                    </CardTitle>
                                    <Badge variant="secondary">
                                        {formatNumber(
                                            shipment.items?.reduce((sum, item) => sum + item.quantity_shipped, 0) || 0
                                        )}{' '}
                                        unidades
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {shipment.items && shipment.items.length > 0 ? (
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-3">
                                            {shipment.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="p-4 border rounded-lg space-y-2"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <p className="font-medium">{item.item_name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                OM: {item.manufacturing_order?.order_number}
                                                            </p>
                                                            {item.manufacturing_step && (
                                                                <p className="text-sm text-muted-foreground">
                                                                    Etapa: {item.manufacturing_step.name}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium text-lg">
                                                                {formatNumber(item.quantity_shipped)}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                unidades
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Receipt Progress */}
                                                    {item.quantity_received > 0 && (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <div className="flex-1 bg-muted rounded-full h-2">
                                                                <div
                                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                                    style={{
                                                                        width: `${(item.quantity_received / item.quantity_shipped) * 100}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatNumber(item.quantity_received)} recebido
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Package Info */}
                                                    {item.package_count && (
                                                        <div className="text-xs text-muted-foreground">
                                                            Embalagem: {item.package_count} {item.package_type}
                                                        </div>
                                                    )}

                                                    {/* Notes */}
                                                    {item.notes && (
                                                        <div className="text-xs text-muted-foreground pt-2 border-t">
                                                            {item.notes}
                                                        </div>
                                                    )}

                                                    {/* Rejection Info */}
                                                    {item.quantity_rejected > 0 && (
                                                        <div className="bg-destructive/10 rounded-lg p-2 text-xs">
                                                            <span className="text-destructive font-medium">
                                                                {formatNumber(item.quantity_rejected)} unidades rejeitadas
                                                            </span>
                                                            {item.rejection_reason && (
                                                                <p className="text-muted-foreground mt-1">
                                                                    {item.rejection_reason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                        Nenhum item nesta remessa
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Notes Section */}
                        {(shipment.shipping_notes || shipment.receiving_notes) && (
                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Notas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    {shipment.shipping_notes && (
                                        <div>
                                            <span className="font-medium">Notas de Envio:</span>
                                            <p className="text-muted-foreground mt-1">
                                                {shipment.shipping_notes}
                                            </p>
                                        </div>
                                    )}
                                    {shipment.receiving_notes && (
                                        <div>
                                            <span className="font-medium">Notas de Recebimento:</span>
                                            <p className="text-muted-foreground mt-1">
                                                {shipment.receiving_notes}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Mark as Shipped Dialog */}
            <Dialog open={showShippedDialog} onOpenChange={setShowShippedDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Marcar Remessa como Enviada</DialogTitle>
                        <DialogDescription>
                            Atualize as informações de rastreamento e confirme o envio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Transportadora</Label>
                            <Input
                                value={carrierName}
                                onChange={(e) => setCarrierName(e.target.value)}
                                placeholder="UPS, FedEx, DHL..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Número de Rastreamento</Label>
                            <Input
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Ex: 1Z999AA10123456784"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowShippedDialog(false)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleMarkAsShipped} disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : 'Confirmar Envio'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mark as Received Dialog */}
            <Dialog open={showReceivedDialog} onOpenChange={setShowReceivedDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Marcar Remessa como Recebida</DialogTitle>
                        <DialogDescription>
                            Confirme o recebimento de {shipment.items?.length || 0} item(s).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Notas de Recebimento (opcional)</Label>
                            <Textarea
                                value={receivingNotes}
                                onChange={(e) => setReceivingNotes(e.target.value)}
                                rows={3}
                                placeholder="Adicione observações sobre o recebimento..."
                            />
                        </div>

                        {/* Photo Upload */}
                        <div className="space-y-2">
                            <Label>Fotos (opcional, máx. 10)</Label>
                            <div className="border-2 border-dashed rounded-lg p-4">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePhotoSelect}
                                    className="hidden"
                                    id="photo-upload"
                                    disabled={photos.length >= 10}
                                />
                                <label
                                    htmlFor="photo-upload"
                                    className="flex flex-col items-center gap-2 cursor-pointer"
                                >
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Clique para selecionar fotos
                                    </span>
                                </label>
                            </div>

                            {/* Photo Preview */}
                            {photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {photos.map((photo, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={URL.createObjectURL(photo)}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-20 object-cover rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowReceivedDialog(false)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleMarkAsReceived} disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : 'Confirmar Recebimento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
