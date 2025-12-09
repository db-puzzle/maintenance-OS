import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Manufacturer } from '@/types/asset-hierarchy';
import { ManufacturingOrder, ManufacturingStep } from '@/types/production';
import { CreateShipmentItem, ShipmentSuggestion } from '@/types/logistics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TextInput } from '@/components/TextInput';
import { createFormAdapter } from '@/utils/form-adapters';
import { QrScanner } from '@/components/logistics/qr-scanner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, Trash2, Plus, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';
import { DESTINATION_TYPES, SHIPPING_METHODS, PACKAGE_TYPES } from '@/constants/logistics';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';

/**
 * Props for shipments create page.
 */
interface Props {
    suggestions?: ShipmentSuggestion[];
    manufacturers: Manufacturer[];
}

/**
 * Selected MO with verification status.
 */
interface SelectedMo extends ManufacturingOrder {
    verified: boolean;
    external_steps?: ManufacturingStep[];
    selected_step_id?: number;
    quantity?: number;
}

/**
 * Shipments Create Page
 *
 * Create new shipments with MO selection and QR verification.
 */
export default function ShipmentsCreate({ suggestions = [], manufacturers }: Props) {
    const [selectedMos, setSelectedMos] = useState<SelectedMo[]>([]);
    const [loadingMo, setLoadingMo] = useState(false);

    const form = useForm({
        destination_type: 'manufacturer' as const,
        destination_id: '',
        destination_name: '',
        destination_address: '',
        shipping_method: 'courier' as const,
        carrier_name: '',
        planned_ship_date: '',
        expected_delivery_date: '',
        shipping_notes: '',
    });

    const { data, setData, post, processing, errors, clearErrors } = form;
    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Remessas', href: route('logistics.shipments.index') },
        { title: 'Nova Remessa', href: '' },
    ];

    /**
     * Handle QR scan - fetch MO details.
     */
    const handleQrScan = async (moNumber: string) => {
        // Check if already added
        if (selectedMos.some((mo) => mo.order_number === moNumber)) {
            toast.warning('Esta OM já foi adicionada');
                return;
            }

        setLoadingMo(true);
        try {
            const response = await axios.get(
                route('logistics.shipments.find-mo', { mo_number: moNumber })
            );

            const moData = response.data.mo;
            const hasExternalSteps = response.data.has_external_steps_awaiting_shipment;
            const externalSteps = response.data.external_steps;

            if (!hasExternalSteps) {
                toast.error('Esta OM não possui etapas externas aguardando envio');
                return;
            }

            // Add MO to list with verified status
            setSelectedMos([
                ...selectedMos,
                {
                    ...moData,
                    verified: true,
                    external_steps: externalSteps,
                    selected_step_id: externalSteps[0]?.id,
                    quantity: moData.quantity_to_produce || moData.quantity,
                },
            ]);

            toast.success(`OM ${moNumber} verificada e adicionada!`);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                toast.error('OM não encontrada');
            } else {
            toast.error('Erro ao buscar OM');
            }
        } finally {
            setLoadingMo(false);
        }
    };

    /**
     * Remove MO from list.
     */
    const handleRemoveMo = (orderNumber: string) => {
        setSelectedMos(selectedMos.filter((mo) => mo.order_number !== orderNumber));
    };

    /**
     * Update MO quantity.
     */
    const handleUpdateQuantity = (orderNumber: string, quantity: number) => {
        setSelectedMos(
            selectedMos.map((mo) =>
                mo.order_number === orderNumber ? { ...mo, quantity } : mo
            )
        );
    };

    /**
     * Update selected step for MO.
     */
    const handleUpdateStep = (orderNumber: string, stepId: number) => {
        setSelectedMos(
            selectedMos.map((mo) =>
                mo.order_number === orderNumber ? { ...mo, selected_step_id: stepId } : mo
            )
        );
    };

    /**
     * Handle form submission.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedMos.length === 0) {
            toast.error('Adicione pelo menos uma OM à remessa');
            return;
        }

        // Build items array
        const items: CreateShipmentItem[] = selectedMos.map((mo) => ({
            manufacturing_order_id: mo.id,
            manufacturing_step_id: mo.selected_step_id,
            quantity: mo.quantity || 0,
        }));

        // Submit via Inertia
        post(route('logistics.shipments.store'), {
            data: {
                ...data,
                items,
                },
                onError: () => {
                    toast.error('Erro ao criar remessa');
            },
        });
    };

    /**
     * Get selected manufacturer details.
     */
    const selectedManufacturer = manufacturers.find(
        (m) => m.id.toString() === data.destination_id
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nova Remessa" />

            <div className="space-y-6">
                {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold">Nova Remessa</h1>
                        <p className="text-muted-foreground mt-1">
                        Crie uma remessa escaneando OMs ou selecionando da lista
                        </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Destination Information */}
                        <Card>
                            <CardHeader>
                            <CardTitle>Informações de Destino</CardTitle>
                            <CardDescription>
                                Defina para onde a remessa será enviada
                            </CardDescription>
                            </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                    <Label htmlFor="destination_type">Tipo de Destino *</Label>
                                    <Select
                                        value={data.destination_type}
                                        onValueChange={(value) =>
                                            setData('destination_type', value as any)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(DESTINATION_TYPES).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.destination_type && (
                                        <p className="text-sm text-destructive">
                                            {errors.destination_type}
                                        </p>
                                    )}
                                </div>

                                {data.destination_type === 'manufacturer' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="destination_id">Fabricante *</Label>
                                        <Select
                                            value={data.destination_id}
                                            onValueChange={(value) => {
                                                const manufacturer = manufacturers.find(
                                                    (m) => m.id.toString() === value
                                                );
                                                setData({
                                                    ...data,
                                                    destination_id: value,
                                                    destination_name: manufacturer?.name || '',
                                                    destination_address: manufacturer
                                                        ? `${manufacturer.address || ''}, ${manufacturer.city || ''}, ${manufacturer.state || ''}`
                                                        : '',
                                                });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o fabricante" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {manufacturers.map((manufacturer) => (
                                                    <SelectItem
                                                        key={manufacturer.id}
                                                        value={manufacturer.id.toString()}
                                                    >
                                                        {manufacturer.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.destination_id && (
                                            <p className="text-sm text-destructive">
                                                {errors.destination_id}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedManufacturer && (
                                <Alert>
                                    <Package className="h-4 w-4" />
                                    <AlertTitle>Endereço do Fabricante</AlertTitle>
                                    <AlertDescription>
                                        {selectedManufacturer.address && (
                                            <div>{selectedManufacturer.address}</div>
                                        )}
                                        {selectedManufacturer.city && selectedManufacturer.state && (
                                            <div>
                                                {selectedManufacturer.city},{' '}
                                                {selectedManufacturer.state}
                                            </div>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                    <Label>Método de Envio</Label>
                                    <Select
                                        value={data.shipping_method}
                                        onValueChange={(value) =>
                                            setData('shipping_method', value as any)
                                        }
                                    >
                                                <SelectTrigger>
                                            <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                            {Object.entries(SHIPPING_METHODS).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>
                                                    {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                </div>

                                <TextInput
                                    form={formAdapter}
                                    name="carrier_name"
                                    label="Transportadora"
                                    placeholder="Nome da transportadora"
                                        />
                                    </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextInput
                                    form={formAdapter}
                                    name="planned_ship_date"
                                    label="Data Planejada de Envio"
                                            type="date"
                                />

                                <TextInput
                                    form={formAdapter}
                                    name="expected_delivery_date"
                                    label="Data Prevista de Entrega"
                                    type="date"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Notas de Envio</Label>
                                    <Textarea
                                    value={data.shipping_notes}
                                    onChange={(e) => setData('shipping_notes', e.target.value)}
                                    placeholder="Instruções especiais de envio..."
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                    {/* QR Scanner Section */}
                            <Card>
                                <CardHeader>
                            <CardTitle>Adicionar Ordens de Manufatura</CardTitle>
                            <CardDescription>
                                Escaneie o QR Code das OMs ou digite manualmente
                            </CardDescription>
                                </CardHeader>
                                <CardContent>
                            <QrScanner onScan={handleQrScan} />

                            {loadingMo && (
                                <div className="mt-4 text-center text-sm text-muted-foreground">
                                    Buscando OM...
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Selected MOs List */}
                    {selectedMos.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    OMs Selecionadas ({selectedMos.length})
                                    {selectedMos.every((mo) => mo.verified) && (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedMos.map((mo) => (
                                    <div
                                        key={mo.order_number}
                                        className="flex items-start gap-4 p-4 border rounded-lg"
                                    >
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">
                                                    {mo.order_number}
                                                </span>
                                                {mo.verified ? (
                                                    <Badge variant="default" className="gap-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Verificada
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Não Verificada
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                Item: {mo.item?.name || 'N/A'}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">
                                                        Etapa Externa *
                                                    </Label>
                                                    <Select
                                                        value={mo.selected_step_id?.toString() || ''}
                                                        onValueChange={(value) =>
                                                            handleUpdateStep(
                                                                mo.order_number,
                                                                parseInt(value)
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Selecione a etapa" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {mo.external_steps?.map((step) => (
                                                                <SelectItem
                                                                    key={step.id}
                                                                    value={step.id.toString()}
                                                                >
                                                                    {step.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs">Quantidade *</Label>
                                                    <input
                                                        type="number"
                                                        value={mo.quantity || 0}
                                                        onChange={(e) =>
                                                            handleUpdateQuantity(
                                                                mo.order_number,
                                                                parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                        </div>
                                        </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveMo(mo.order_number)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                </CardContent>
                            </Card>
                        )}

                    {/* Tips */}
                    <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>Dica</AlertTitle>
                        <AlertDescription>
                            Use o scanner de QR Code para verificar rapidamente as OMs. OMs
                            verificadas garantem que as etapas externas estão aguardando envio.
                        </AlertDescription>
                    </Alert>

                    {/* Submit Actions */}
                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit(route('logistics.shipments.index'))}
                            disabled={processing}
                        >
                            Cancelar
                            </Button>
                        <Button type="submit" disabled={processing || selectedMos.length === 0}>
                            {processing ? 'Criando...' : 'Criar Remessa'}
                            </Button>
                        </div>
                    </form>
            </div>
        </AppLayout>
    );
}
