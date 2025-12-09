import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { Shipment, ShipmentItem } from '@/types/logistics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShipmentStatusBadge } from '@/components/logistics/shipment-status-badge';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TextInput } from '@/components/TextInput';
import { createFormAdapter } from '@/utils/form-adapters';
import {
    Package,
    Truck,
    PackageCheck,
    Calendar,
    MapPin,
    User,
    FileText,
    Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/number';
import { ColumnConfig } from '@/types/shared';

/**
 * Props for shipments show page.
 */
interface Props {
    shipment: Shipment;
    can?: {
        update: boolean;
        delete: boolean;
    };
}

/**
 * Shipments Show Page
 *
 * Display shipment details with actions for shipping and receiving.
 */
export default function ShipmentsShow({ shipment, can = { update: false, delete: false } }: Props) {
    const [markAsShippedOpen, setMarkAsShippedOpen] = useState(false);
    const [markAsReceivedOpen, setMarkAsReceivedOpen] = useState(false);

    // Form for marking as shipped
    const shippedForm = useForm({
        tracking_number: shipment.tracking_number || '',
        carrier_name: shipment.carrier_name || '',
        photo_notes: '',
    });

    const shippedFormAdapter = createFormAdapter({
        data: shippedForm.data,
        setData: shippedForm.setData,
        errors: shippedForm.errors,
        clearErrors: shippedForm.clearErrors,
    });

    // Form for marking as received with item receipts
    const receivedForm = useForm<{
        receiving_notes: string;
        items: Array<{
            item_id: number;
            quantity_received: number;
            quantity_rejected: number;
            rejection_reason: string;
        }>;
    }>({
        receiving_notes: '',
        items:
            shipment.items?.map((item) => ({
                item_id: item.id,
                quantity_received: item.quantity_pending,
                quantity_rejected: 0,
                rejection_reason: '',
            })) || [],
    });

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Remessas', href: route('logistics.shipments.index') },
        { title: shipment.shipment_number, href: '' },
    ];

    /**
     * Handle mark as shipped.
     */
    const handleMarkAsShipped = () => {
        shippedForm.post(route('logistics.shipments.mark-as-shipped', shipment.id), {
            onSuccess: () => {
                setMarkAsShippedOpen(false);
                toast.success('Remessa marcada como enviada!');
            },
            onError: () => {
                toast.error('Erro ao marcar como enviada');
            },
        });
    };

    /**
     * Handle mark as received.
     */
    const handleMarkAsReceived = () => {
        receivedForm.post(route('logistics.shipments.mark-as-received', shipment.id), {
                onSuccess: () => {
                setMarkAsReceivedOpen(false);
                toast.success('Remessa marcada como recebida!');
                },
                onError: () => {
                toast.error('Erro ao marcar como recebida');
            },
        });
    };

    /**
     * Update receipt quantity for item.
     */
    const updateReceiptQuantity = (itemId: number, field: string, value: number) => {
        const items = [...receivedForm.data.items];
        const index = items.findIndex((i) => i.item_id === itemId);
        if (index !== -1) {
            items[index] = { ...items[index], [field]: value };
            receivedForm.setData('items', items);
        }
    };

    /**
     * Generate packing list PDF.
     */
    const handleGeneratePackingList = () => {
        window.open(route('logistics.shipments.packing-list', shipment.id), '_blank');
        toast.success('Gerando lista de embalagem...');
    };

    // Table columns for shipment items
    const itemColumns: ColumnConfig<ShipmentItem>[] = [
        {
            key: 'manufacturing_order',
            label: 'Ordem',
            width: 'w-[150px]',
            render: (_value, item) => (
                <div className="font-medium">{item.manufacturing_order?.order_number || '-'}</div>
            ),
        },
        {
            key: 'item_name',
            label: 'Item',
            width: 'w-[250px]',
            render: (_value, item) => (
                        <div>
                    <div className="font-medium">{item.item_name || '-'}</div>
                    <div className="text-sm text-muted-foreground">{item.item_code || ''}</div>
                </div>
            ),
        },
        {
            key: 'manufacturing_step',
            label: 'Etapa',
            width: 'w-[180px]',
            render: (_value, item) => (
                <div className="text-sm">
                    {item.manufacturing_step?.name || 'Produto Final'}
                </div>
            ),
        },
        {
            key: 'quantity_shipped',
            label: 'Qtd Enviada',
            width: 'w-[120px]',
            headerAlign: 'right',
            render: (_value, item) => (
                <div className="text-right font-medium">
                    {formatNumber(item.quantity_shipped)}
                </div>
            ),
        },
        {
            key: 'quantity_received',
            label: 'Qtd Recebida',
            width: 'w-[120px]',
            headerAlign: 'right',
            render: (_value, item) => (
                <div className="text-right">
                    <div>{formatNumber(item.quantity_received)}</div>
                    {item.quantity_pending > 0 && (
                        <div className="text-xs text-muted-foreground">
                            Pendente: {formatNumber(item.quantity_pending)}
                        </div>
                    )}
                    </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            width: 'w-[120px]',
            render: (_value, item) => (
                <div className="flex justify-center">
                    {item.is_fully_received ? (
                        <Badge variant="default" className="gap-1">
                            <PackageCheck className="h-3 w-3" />
                            Completo
                            </Badge>
                    ) : (
                        <Badge variant="secondary">Pendente</Badge>
                    )}
                </div>
            ),
        },
    ];

    const tabs = [
        {
            id: 'details',
            label: 'Detalhes',
            content: (
                <div className="py-6 space-y-6">
                    {/* Status and Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Status da Remessa</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                        <ShipmentStatusBadge status={shipment.status} />
                                {shipment.is_overdue && (
                                    <Badge variant="destructive">Atrasada</Badge>
                                )}
                </div>

                            {/* Action Buttons */}
                <div className="flex gap-2">
                                {shipment.canShip?.() && can.update && (
                                    <Button onClick={() => setMarkAsShippedOpen(true)}>
                                        <Truck className="mr-2 h-4 w-4" />
                                        Marcar como Enviada
                        </Button>
                    )}

                                {shipment.canReceive?.() && can.update && (
                                    <Button onClick={() => setMarkAsReceivedOpen(true)}>
                                        <PackageCheck className="mr-2 h-4 w-4" />
                                        Marcar como Recebida
                        </Button>
                    )}

                                <Button
                                    variant="outline"
                                    onClick={handleGeneratePackingList}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Lista de Embalagem
                            </Button>
                </div>
                        </CardContent>
                    </Card>

                    {/* Shipment Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Destino
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div>
                                    <div className="font-medium">
                                        {shipment.destination_name || '-'}
                                </div>
                                    <div className="text-muted-foreground">
                                        {shipment.destination_address || 'Endereço não fornecido'}
                                </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Transporte
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="text-muted-foreground">Método:</div>
                                    <div className="font-medium">
                                        {shipment.shipping_method || '-'}
                                    </div>

                                    {shipment.carrier_name && (
                                        <>
                                            <div className="text-muted-foreground">
                                                Transportadora:
                                            </div>
                                            <div className="font-medium">
                                                {shipment.carrier_name}
                                </div>
                                        </>
                                    )}

                                    {shipment.tracking_number && (
                                        <>
                                            <div className="text-muted-foreground">Rastreio:</div>
                                            <div className="font-medium">
                                                {shipment.tracking_number}
                                </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Datas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    {shipment.planned_ship_date && (
                                        <>
                                            <div className="text-muted-foreground">
                                                Envio Planejado:
                                            </div>
                                    <div>
                                                {new Date(
                                                    shipment.planned_ship_date
                                                ).toLocaleDateString('pt-BR')}
                                            </div>
                                        </>
                                    )}

                                    {shipment.actual_ship_date && (
                                        <>
                                            <div className="text-muted-foreground">
                                                Enviado em:
                                            </div>
                                            <div className="font-medium">
                                                {new Date(
                                                    shipment.actual_ship_date
                                                ).toLocaleDateString('pt-BR')}
                                    </div>
                                        </>
                                    )}

                                    {shipment.expected_delivery_date && (
                                        <>
                                            <div className="text-muted-foreground">
                                                Entrega Prevista:
                                            </div>
                                    <div>
                                                {new Date(
                                                    shipment.expected_delivery_date
                                                ).toLocaleDateString('pt-BR')}
                                    </div>
                                        </>
                                    )}

                                    {shipment.actual_delivery_date && (
                                        <>
                                            <div className="text-muted-foreground">
                                                Recebido em:
                                            </div>
                                            <div className="font-medium">
                                                {new Date(
                                                    shipment.actual_delivery_date
                                                ).toLocaleDateString('pt-BR')}
                                    </div>
                                        </>
                                )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Responsáveis
                                    </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="text-muted-foreground">Criado por:</div>
                                    <div>{shipment.createdBy?.name || '-'}</div>

                                    {shipment.shipper && (
                                        <>
                                            <div className="text-muted-foreground">Enviado por:</div>
                                            <div>{shipment.shipper.name}</div>
                                        </>
                                    )}

                                    {shipment.receiver && (
                                        <>
                                            <div className="text-muted-foreground">Recebido por:</div>
                                            <div>{shipment.receiver.name}</div>
                                        </>
                                                    )}
                                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Notes */}
                        {(shipment.shipping_notes || shipment.receiving_notes) && (
                        <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Notas
                                    </CardTitle>
                                </CardHeader>
                            <CardContent className="space-y-4">
                                    {shipment.shipping_notes && (
                                        <div>
                                        <div className="text-sm font-medium mb-1">
                                            Notas de Envio:
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                                {shipment.shipping_notes}
                                        </div>
                                        </div>
                                    )}

                                    {shipment.receiving_notes && (
                                        <div>
                                        <div className="text-sm font-medium mb-1">
                                            Notas de Recebimento:
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                                {shipment.receiving_notes}
                                        </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
            ),
        },
        {
            id: 'items',
            label: `Itens (${shipment.total_items})`,
            content: (
                <div className="py-6">
                    <EntityDataTable
                        data={shipment.items as unknown as Array<Record<string, unknown>>}
                        columns={itemColumns}
                        emptyMessage="Nenhum item nesta remessa."
                    />
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Remessa ${shipment.shipment_number}`} />

            <ShowLayout
                title={shipment.shipment_number}
                subtitle={`${shipment.destination_type} • ${shipment.total_items} itens`}
                editRoute=""
                tabs={tabs}
            />

            {/* Mark as Shipped Dialog */}
            <Dialog open={markAsShippedOpen} onOpenChange={setMarkAsShippedOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Marcar como Enviada</DialogTitle>
                        <DialogDescription>
                            Registre as informações de envio da remessa
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <TextInput
                            form={shippedFormAdapter}
                            name="tracking_number"
                            label="Número de Rastreio"
                            placeholder="ABC123456"
                        />

                        <TextInput
                            form={shippedFormAdapter}
                            name="carrier_name"
                            label="Transportadora"
                            placeholder="Nome da transportadora"
                        />

                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Textarea
                                value={shippedForm.data.photo_notes}
                                onChange={(e) =>
                                    shippedForm.setData('photo_notes', e.target.value)
                                }
                                placeholder="Notas adicionais sobre o envio..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setMarkAsShippedOpen(false)}
                            disabled={shippedForm.processing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleMarkAsShipped}
                            disabled={shippedForm.processing}
                        >
                            {shippedForm.processing ? 'Salvando...' : 'Confirmar Envio'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mark as Received Dialog */}
            <Dialog open={markAsReceivedOpen} onOpenChange={setMarkAsReceivedOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Marcar como Recebida</DialogTitle>
                        <DialogDescription>
                            Registre as quantidades recebidas para cada item
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Items Receipt Table */}
                        <div className="space-y-3">
                            {shipment.items?.map((item, index) => (
                                <Card key={item.id}>
                                    <CardContent className="pt-4">
                                        <div className="space-y-3">
                                            <div>
                                                <div className="font-medium">{item.item_name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {item.manufacturing_order?.order_number}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <Label className="text-xs">
                                                        Qtd Recebida *
                                                    </Label>
                                                    <input
                                                        type="number"
                                                        value={
                                                            receivedForm.data.items[index]
                                                                ?.quantity_received || 0
                                                        }
                                                        onChange={(e) =>
                                                            updateReceiptQuantity(
                                                                item.id,
                                                                'quantity_received',
                                                                parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        Enviado: {formatNumber(item.quantity_shipped)}
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label className="text-xs">Qtd Rejeitada</Label>
                                                    <input
                                                        type="number"
                                                        value={
                                                            receivedForm.data.items[index]
                                                                ?.quantity_rejected || 0
                                                        }
                                                        onChange={(e) =>
                                                            updateReceiptQuantity(
                                                                item.id,
                                                                'quantity_rejected',
                                                                parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            </div>

                                            {(receivedForm.data.items[index]?.quantity_rejected || 0) >
                                                0 && (
                                                <div>
                                                    <Label className="text-xs">
                                                        Motivo da Rejeição
                                                    </Label>
                                                    <Textarea
                                                        value={
                                                            receivedForm.data.items[index]
                                                                ?.rejection_reason || ''
                                                        }
                                                        onChange={(e) => {
                                                            const items = [...receivedForm.data.items];
                                                            items[index] = {
                                                                ...items[index],
                                                                rejection_reason: e.target.value,
                                                            };
                                                            receivedForm.setData('items', items);
                                                        }}
                                                        rows={2}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label>Notas de Recebimento</Label>
                            <Textarea
                                value={receivedForm.data.receiving_notes}
                                onChange={(e) =>
                                    receivedForm.setData('receiving_notes', e.target.value)
                                }
                                placeholder="Condição dos itens, problemas encontrados, etc..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setMarkAsReceivedOpen(false)}
                            disabled={receivedForm.processing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleMarkAsReceived}
                            disabled={receivedForm.processing}
                        >
                            {receivedForm.processing ? 'Salvando...' : 'Confirmar Recebimento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
