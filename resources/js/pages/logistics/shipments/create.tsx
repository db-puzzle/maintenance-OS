import React, { useState } from 'react';
import { Head, Link, router as inertiaRouter } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Manufacturer } from '@/types/asset-hierarchy';
import { ShipmentSuggestion } from '@/types/logistics';
import { ManufacturingOrder, ManufacturingStep } from '@/types/production';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QrScanner } from '@/components/logistics/qr-scanner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Truck, X, CheckCircle } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/number';

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
        title: 'Nova Remessa',
        href: '/logistics/shipments/create',
    },
];

interface Props {
    suggestions: ShipmentSuggestion[];
    manufacturers: Manufacturer[];
}

interface ShipmentItemData {
    manufacturing_order: ManufacturingOrder;
    manufacturing_step?: ManufacturingStep;
    quantity: number;
    package_count?: number;
    package_type?: string;
    notes?: string;
}

/**
 * Create Shipment Page
 *
 * Allows users to create new shipments by scanning QR codes or using suggested bundling.
 * Shows suggested shipments for efficient bundling.
 */
export default function CreateShipment({ suggestions, manufacturers }: Props) {
    const [selectedItems, setSelectedItems] = useState<ShipmentItemData[]>([]);
    const [destinationType, setDestinationType] = useState<string>('manufacturer');
    const [destinationId, setDestinationId] = useState<string>('');
    const [carrierName, setCarrierName] = useState('');
    const [plannedShipDate, setPlannedShipDate] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [shippingNotes, setShippingNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleQrScan = async (moNumber: string) => {
        try {
            const response = await fetch(route('logistics.shipments.find-mo', { mo_number: moNumber }));
            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || 'OM não encontrada');
                return;
            }

            if (!result.has_external_steps_awaiting_shipment) {
                toast.error('Esta OM não possui etapas aguardando envio');
                return;
            }

            // Check if MO already added
            if (selectedItems.some((item) => item.manufacturing_order.id === result.mo.id)) {
                toast.warning('OM já adicionada à remessa');
                return;
            }

            // Add each external step as a separate item
            result.external_steps.forEach((step: ManufacturingStep) => {
                const newItem: ShipmentItemData = {
                    manufacturing_order: result.mo,
                    manufacturing_step: step,
                    quantity: step.remaining_quantity_to_ship || 0,
                };
                setSelectedItems((prev) => [...prev, newItem]);
            });

            toast.success(`OM ${moNumber} adicionada com ${result.external_steps.length} etapa(s)`);
        } catch (error) {
            console.error('Error scanning QR:', error);
            toast.error('Erro ao buscar OM');
        }
    };

    const handleRemoveItem = (index: number) => {
        setSelectedItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUseSuggestion = (suggestion: ShipmentSuggestion) => {
        // Set destination
        setDestinationType('manufacturer');
        setDestinationId(suggestion.manufacturer.id.toString());
        if (suggestion.planned_ship_date) {
            setPlannedShipDate(suggestion.planned_ship_date);
        }

        // Add all steps from suggestion
        const newItems: ShipmentItemData[] = suggestion.steps.map((step) => ({
            manufacturing_order: step.manufacturing_route?.manufacturing_order as ManufacturingOrder,
            manufacturing_step: step,
            quantity: step.remaining_quantity_to_ship || 0,
        }));

        setSelectedItems(newItems);
        toast.success(`${newItems.length} itens adicionados da sugestão`);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const manufacturer = manufacturers.find((m) => m.id === parseInt(destinationId));

        inertiaRouter.post(
            route('logistics.shipments.store'),
            {
                destination_type: destinationType,
                destination_id: parseInt(destinationId) || null,
                destination_name: manufacturer?.name || '',
                destination_address: '',
                carrier_name: carrierName,
                planned_ship_date: plannedShipDate,
                expected_delivery_date: expectedDeliveryDate,
                shipping_notes: shippingNotes,
                items: selectedItems.map((item) => ({
                    manufacturing_order_id: item.manufacturing_order.id,
                    manufacturing_step_id: item.manufacturing_step?.id,
                    quantity: item.quantity,
                    package_count: item.package_count,
                    package_type: item.package_type,
                    notes: item.notes,
                })),
            },
            {
                onSuccess: () => {
                    toast.success('Remessa criada com sucesso');
                },
                onError: () => {
                    toast.error('Erro ao criar remessa');
                    setIsSubmitting(false);
                },
            }
        );
    };

    const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nova Remessa" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Nova Remessa</h1>
                        <p className="text-muted-foreground mt-1">
                            Crie uma nova remessa escaneando OMs ou usando sugestões
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Left Column - QR Scanner & Suggestions */}
                    <div className="space-y-4">
                        {/* QR Scanner */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Escanear OMs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <QrScanner onScan={handleQrScan} />
                            </CardContent>
                        </Card>

                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Sugestões de Agrupamento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-2">
                                            {suggestions.map((suggestion, index) => (
                                                <div
                                                    key={index}
                                                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex-1">
                                                            <p className="font-medium">
                                                                {suggestion.manufacturer.name}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {suggestion.total_orders} OM •{' '}
                                                                {suggestion.steps.length} etapas
                                                            </p>
                                                            {suggestion.planned_ship_date && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    Envio: {new Date(suggestion.planned_ship_date).toLocaleDateString('pt-BR')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleUseSuggestion(suggestion)}
                                                        >
                                                            <Plus className="h-4 w-4 mr-1" />
                                                            Usar
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column - Shipment Form */}
                    <form onSubmit={handleSubmit} className="col-span-2 space-y-4">
                        {/* Selected Items */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Itens Selecionados ({selectedItems.length})</CardTitle>
                                    {totalQuantity > 0 && (
                                        <Badge variant="secondary">
                                            <Package className="h-3 w-3 mr-1" />
                                            {formatNumber(totalQuantity)} unidades
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {selectedItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Package className="h-12 w-12 text-muted-foreground mb-3" />
                                        <p className="text-muted-foreground">
                                            Escaneie OMs ou use as sugestões para adicionar itens
                                        </p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[300px]">
                                        <div className="space-y-2">
                                            {selectedItems.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-start gap-3 p-3 border rounded-lg"
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-medium">
                                                            {item.manufacturing_order.order_number}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {item.manufacturing_order.item?.name}
                                                        </div>
                                                        {item.manufacturing_step && (
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                Etapa: {item.manufacturing_step.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-medium">
                                                            {formatNumber(item.quantity)} un
                                                        </div>
                                                        {item.manufacturing_step?.manufacturer && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {item.manufacturing_step.manufacturer.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveItem(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>

                        {/* Shipment Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Truck className="h-5 w-5" />
                                    Detalhes da Remessa
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo de Destino</Label>
                                        <Select value={destinationType} onValueChange={setDestinationType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manufacturer">Fabricante Externo</SelectItem>
                                                <SelectItem value="customer">Cliente</SelectItem>
                                                <SelectItem value="warehouse">Armazém</SelectItem>
                                                <SelectItem value="work_cell">Célula de Trabalho</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {destinationType === 'manufacturer' && (
                                        <div className="space-y-2">
                                            <Label>Fabricante</Label>
                                            <Select value={destinationId} onValueChange={setDestinationId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {manufacturers.map((m) => (
                                                        <SelectItem key={m.id} value={m.id.toString()}>
                                                            {m.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Data Planejada de Envio</Label>
                                        <Input
                                            type="date"
                                            value={plannedShipDate}
                                            onChange={(e) => setPlannedShipDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data Esperada de Entrega</Label>
                                        <Input
                                            type="date"
                                            value={expectedDeliveryDate}
                                            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Transportadora</Label>
                                    <Input
                                        value={carrierName}
                                        onChange={(e) => setCarrierName(e.target.value)}
                                        placeholder="UPS, FedEx, etc."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Notas de Envio</Label>
                                    <Textarea
                                        value={shippingNotes}
                                        onChange={(e) => setShippingNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Informações adicionais sobre o envio..."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Summary */}
                        {selectedItems.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resumo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Total de OMs:</span>
                                            <p className="text-xl font-bold">{selectedItems.length}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Total de Unidades:</span>
                                            <p className="text-xl font-bold">{formatNumber(totalQuantity)}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Fabricantes:</span>
                                            <p className="text-xl font-bold">
                                                {new Set(
                                                    selectedItems
                                                        .map((i) => i.manufacturing_step?.manufacturer?.name)
                                                        .filter(Boolean)
                                                ).size}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('logistics.shipments.index')}>Cancelar</Link>
                            </Button>
                            <Button type="submit" disabled={isSubmitting || selectedItems.length === 0}>
                                {isSubmitting ? (
                                    <>Criando...</>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Criar Remessa ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'})
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
