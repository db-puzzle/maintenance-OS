import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ManufacturingStep } from '@/types/production';
import { Manufacturer } from '@/types/asset-hierarchy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalStepBadge } from '@/components/production/external-step-badge';
import { ExternalStepStatusDialog } from '@/components/production/external-step-status-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Package,
    Truck,
    Factory,
    Calendar,
    AlertCircle,
    TrendingUp,
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { formatNumber } from '@/utils/number';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Produção',
        href: '/production/planning',
    },
    {
        title: 'Etapas Externas',
        href: '/production/external-steps',
    },
];

interface Props {
    awaitingShipment: ManufacturingStep[];
    atManufacturers: ManufacturingStep[];
    manufacturers: Manufacturer[];
}

/**
 * External Steps Dashboard Page
 *
 * Displays steps awaiting shipment and steps currently at external manufacturers.
 * Allows users to update step status and track external manufacturing progress.
 */
export default function ExternalStepsIndex({ awaitingShipment, atManufacturers }: Props) {
    const [selectedStep, setSelectedStep] = useState<ManufacturingStep | null>(null);
    const [dialogAction, setDialogAction] = useState<
        'ship' | 'in-process' | 'record-receipt' | null
    >(null);

    const openDialog = (step: ManufacturingStep, action: typeof dialogAction) => {
        setSelectedStep(step);
        setDialogAction(action);
    };

    const closeDialog = () => {
        setSelectedStep(null);
        setDialogAction(null);
    };

    const totalAtManufacturers = atManufacturers.reduce(
        (sum, step) => sum + (step.quantity_shipped || 0),
        0
    );
    const totalAwaitingShipment = awaitingShipment.reduce(
        (sum, step) =>
            sum + (step.remaining_quantity_to_ship || 0),
        0
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Etapas Externas" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Etapas Externas</h1>
                        <p className="text-muted-foreground mt-1">
                            Monitore e gerencie etapas executadas por fabricantes terceirizados
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aguardando Envio</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{awaitingShipment.length}</div>
                            <p className="text-xs text-muted-foreground">
                                {formatNumber(totalAwaitingShipment)} unidades para enviar
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">No Fabricante</CardTitle>
                            <Factory className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{atManufacturers.length}</div>
                            <p className="text-xs text-muted-foreground">
                                {formatNumber(totalAtManufacturers)} unidades em processamento
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <Tabs defaultValue="awaiting" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="awaiting" className="gap-2">
                            <Package className="h-4 w-4" />
                            Aguardando Envio ({awaitingShipment.length})
                        </TabsTrigger>
                        <TabsTrigger value="at-manufacturer" className="gap-2">
                            <Factory className="h-4 w-4" />
                            No Fabricante ({atManufacturers.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Awaiting Shipment Tab */}
                    <TabsContent value="awaiting" className="space-y-4">
                        <ScrollArea className="h-[calc(100vh-400px)]">
                            <div className="space-y-3">
                                {awaitingShipment.length === 0 ? (
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center py-12">
                                            <Package className="h-12 w-12 text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground">
                                                Nenhuma etapa aguardando envio
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Etapas externas aparecerão aqui quando estiverem prontas para serem enviadas
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    awaitingShipment.map((step) => (
                                        <Card
                                            key={step.id}
                                            className="hover:shadow-md transition-shadow"
                                        >
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 space-y-1">
                                                        <CardTitle className="text-lg flex items-center gap-2">
                                                            {step.name}
                                                            {!step.manufacturer_id && (
                                                                <Badge variant="outline" className="ml-2">
                                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                                    Fabricante não atribuído
                                                                </Badge>
                                                            )}
                                                        </CardTitle>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <span>
                                                                OM:{' '}
                                                                {step.manufacturing_route?.manufacturing_order
                                                                    ?.order_number}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                Item:{' '}
                                                                {step.manufacturing_route?.manufacturing_order?.item
                                                                    ?.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {step.external_status && (
                                                        <ExternalStepBadge status={step.external_status} />
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Fabricante:
                                                            </span>
                                                            <p className="font-medium">
                                                                {step.manufacturer?.name || 'Não atribuído'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Quantidade:
                                                            </span>
                                                            <p className="font-medium">
                                                                {formatNumber(
                                                                    step.remaining_quantity_to_ship || 0
                                                                )}{' '}
                                                                unidades
                                                            </p>
                                                        </div>
                                                        {step.scheduled_start && (
                                                            <div>
                                                                <span className="text-muted-foreground">
                                                                    Início Agendado:
                                                                </span>
                                                                <p className="font-medium">
                                                                    {new Date(
                                                                        step.scheduled_start
                                                                    ).toLocaleDateString('pt-BR')}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {step.expected_lead_time_days && (
                                                            <div>
                                                                <span className="text-muted-foreground">
                                                                    Lead Time:
                                                                </span>
                                                                <p className="font-medium">
                                                                    {step.expected_lead_time_days} dias
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            onClick={() => openDialog(step, 'ship')}
                                                            disabled={!step.manufacturer_id}
                                                            size="sm"
                                                        >
                                                            <Truck className="h-4 w-4 mr-2" />
                                                            Marcar como Enviado
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* At Manufacturer Tab */}
                    <TabsContent value="at-manufacturer" className="space-y-4">
                        <ScrollArea className="h-[calc(100vh-400px)]">
                            <div className="space-y-3">
                                {atManufacturers.length === 0 ? (
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center py-12">
                                            <Factory className="h-12 w-12 text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground">
                                                Nenhuma etapa no fabricante
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Etapas enviadas aparecerão aqui durante o processamento externo
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    atManufacturers.map((step) => (
                                        <Card
                                            key={step.id}
                                            className="hover:shadow-md transition-shadow"
                                        >
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 space-y-1">
                                                        <CardTitle className="text-lg">{step.name}</CardTitle>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <span>
                                                                OM:{' '}
                                                                {step.manufacturing_route?.manufacturing_order
                                                                    ?.order_number}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                Item:{' '}
                                                                {step.manufacturing_route?.manufacturing_order?.item
                                                                    ?.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {step.external_status && (
                                                        <ExternalStepBadge status={step.external_status} />
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground flex items-center gap-1">
                                                                <Factory className="h-3 w-3" />
                                                                Fabricante:
                                                            </span>
                                                            <p className="font-medium">
                                                                {step.manufacturer?.name}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                Enviado em:
                                                            </span>
                                                            <p className="font-medium">
                                                                {step.shipped_date
                                                                    ? new Date(
                                                                        step.shipped_date
                                                                    ).toLocaleDateString('pt-BR')
                                                                    : '-'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground flex items-center gap-1">
                                                                <TrendingUp className="h-3 w-3" />
                                                                Progresso:
                                                            </span>
                                                            <p className="font-medium">
                                                                {formatNumber(step.quantity_received || 0)} /{' '}
                                                                {formatNumber(step.quantity_shipped || 0)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {step.remaining_quantity_to_receive !== undefined &&
                                                        step.remaining_quantity_to_receive > 0 && (
                                                            <div className="bg-muted rounded-lg p-3">
                                                                <p className="text-sm">
                                                                    <span className="text-muted-foreground">
                                                                        Aguardando recebimento:
                                                                    </span>{' '}
                                                                    <span className="font-medium">
                                                                        {formatNumber(
                                                                            step.remaining_quantity_to_receive
                                                                        )}{' '}
                                                                        unidades
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        )}

                                                    <div className="flex justify-end gap-2">
                                                        {step.external_status === 'shipped' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openDialog(step, 'in-process')}
                                                            >
                                                                Marcar Em Processamento
                                                            </Button>
                                                        )}
                                                        {step.external_status === 'in_process' && (
                                                            <div className="flex flex-col items-end gap-2">
                                                                <Button
                                                                    onClick={() =>
                                                                        openDialog(step, 'record-receipt')
                                                                    }
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    <Package className="h-4 w-4 mr-2" />
                                                                    Registrar Recebimento Direto
                                                                </Button>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Normalmente, use o Módulo de Logística
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Status Update Dialog */}
            {selectedStep && dialogAction && (
                <ExternalStepStatusDialog
                    step={selectedStep}
                    action={dialogAction}
                    isOpen={!!dialogAction}
                    onClose={closeDialog}
                />
            )}
        </AppLayout>
    );
}
