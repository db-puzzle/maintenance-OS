import { Head, router, Link } from '@inertiajs/react';

import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PartFormComponent } from '@/components/parts/PartFormComponent';
import { StatCard } from '@/components/StatCard';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { Package, AlertTriangle, Factory } from 'lucide-react';
interface Manufacturer {
    id: number;
    name: string;
    website?: string;
    email?: string;
    phone?: string;
    country?: string;
    notes?: string;
}
interface Part {
    id: number;
    part_number: string;
    name: string;
    description: string | null;
    unit_cost: number;
    available_quantity: number;
    minimum_quantity: number;
    maximum_quantity: number | null;
    location: string | null;
    manufacturer_id: number | null;
    manufacturer?: Manufacturer | null;
    active: boolean;
    created_at: string;
    updated_at: string;
    work_order_parts?: WorkOrderPart[];
}
interface WorkOrderPart {
    id: number;
    work_order_id: number;
    part_id: number;
    part_number: string;
    part_name: string;
    estimated_quantity: number;
    reserved_quantity: number;
    used_quantity: number;
    unit_cost: number;
    total_cost: number;
    status: string;
    work_order: {
        id: number;
        title: string;
        status: string;
    };
}
interface Statistics {
    total_used: number;
    total_reserved: number;
    work_order_count: number;
}
interface PartShowProps {
    part?: Part | null;
    statistics: Statistics;
    isCreating?: boolean;
    manufacturers?: Manufacturer[];
}
export default function PartShow({ part, statistics, isCreating = false, manufacturers = [] }: PartShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Peças',
            href: '/parts',
        },
        {
            title: isCreating ? 'Nova Peça' : (part?.part_number || ''),
            href: isCreating ? '#' : `/parts/${part?.id}`
        }
    ];
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };
    const getStockStatus = () => {
        if (!part) return 'in-stock';
        if (!part.active) return 'inactive';
        if (part.available_quantity === 0) return 'out-of-stock';
        if (part.available_quantity < part.minimum_quantity) return 'low-stock';
        return 'in-stock';
    };
    const stockStatus = getStockStatus();
    const stockStatusConfig = {
        'in-stock': { label: 'Em Estoque', variant: 'default' as const },
        'low-stock': { label: 'Estoque Baixo', variant: 'destructive' as const },
        'out-of-stock': { label: 'Sem Estoque', variant: 'secondary' as const },
        'inactive': { label: 'Inativo', variant: 'secondary' as const },
    };
    const handleEditSuccess = () => {
        if (isCreating && part) {
            // Redirect to the part show page after creation
            router.get(route('parts.show', part.id));
        } else {
            // Reload the page to refresh the data
            router.reload();
        }
    };
    const handleCreateSuccess = () => {
        // The PartFormComponent will handle the redirect after creation
        // since it knows the new part ID from the response
    };
    const subtitle = isCreating ? (
        <span className="text-muted-foreground text-sm">Criação de nova peça</span>
    ) : (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                <span>{part?.name}</span>
            </span>
            {part?.manufacturer && (
                <>
                    <span className="text-muted-foreground">•</span>
                    <span className="flex items-center gap-1">
                        <Factory className="h-4 w-4" />
                        <Link
                            href={route('asset-hierarchy.manufacturers.show', part.manufacturer.id)}
                            className="hover:underline"
                        >
                            {part.manufacturer.name}
                        </Link>
                    </span>
                </>
            )}
            <span className="text-muted-foreground">•</span>
            <Badge variant={stockStatusConfig[stockStatus].variant}>
                {stockStatusConfig[stockStatus].label}
            </Badge>
            {part && part.available_quantity < part.minimum_quantity && part.active && (
                <>
                    <span className="text-muted-foreground">•</span>
                    <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Estoque abaixo do mínimo</span>
                    </span>
                </>
            )}
        </span>
    );
    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <PartFormComponent
                        part={part || {
                            id: 0,
                            part_number: '',
                            name: '',
                            description: null,
                            unit_cost: 0,
                            available_quantity: 0,
                            minimum_quantity: 0,
                            maximum_quantity: null,
                            location: null,
                            manufacturer_id: null,
                            manufacturer: null,
                            active: true,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }}
                        initialMode={isCreating ? 'edit' : 'view'}
                        onSuccess={isCreating ? handleCreateSuccess : handleEditSuccess}
                        manufacturers={manufacturers}
                    />
                </div>
            ),
        },
        ...(isCreating ? [] : [
            {
                id: 'estoque',
                label: 'Estoque',
                content: (
                    <div className="space-y-6 py-8">
                        <div className="grid gap-4 md:grid-cols-4">
                            <StatCard
                                title="Qtd. Disponível"
                                value={part?.available_quantity.toString() || '0'}
                                description="Em estoque"
                                variant={part && part.available_quantity < part.minimum_quantity ? 'destructive' : 'default'}
                            />
                            <StatCard
                                title="Qtd. Mínima"
                                value={part?.minimum_quantity.toString() || '0'}
                                description="Estoque mínimo"
                            />
                            <StatCard
                                title="Qtd. Máxima"
                                value={part?.maximum_quantity?.toString() || 'N/A'}
                                description="Estoque máximo"
                            />
                            <StatCard
                                title="Valor em Estoque"
                                value={formatCurrency((part?.available_quantity || 0) * (part?.unit_cost || 0))}
                                description="Valor total"
                            />
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Movimentação de Estoque</CardTitle>
                                <CardDescription>
                                    Resumo das movimentações de estoque
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-muted-foreground">Total Usado</span>
                                        <span className="font-medium">{statistics.total_used}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-muted-foreground">Total Reservado</span>
                                        <span className="font-medium">{statistics.total_reserved}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-muted-foreground">Ordens de Serviço</span>
                                        <span className="font-medium">{statistics.work_order_count}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ),
            },
            {
                id: 'ordens-servico',
                label: 'Ordens de Serviço',
                content: (
                    <div className="space-y-6 py-8">
                        {part?.work_order_parts && part.work_order_parts.length > 0 ? (
                            <EntityDataTable
                                data={part.work_order_parts.map(wop => ({
                                    ...wop,
                                    _type: 'WorkOrderPart' // Add a type marker for identification
                                }))}
                                columns={[
                                    {
                                        key: 'work_order',
                                        label: 'Ordem de Serviço',
                                        sortable: false,
                                        width: 'w-[300px]',
                                        render: (value, row) => {
                                            const wop = row as unknown as WorkOrderPart;
                                            return (
                                                <div>
                                                    <div className="font-medium">
                                                        #{wop.work_order.id} - {wop.work_order.title}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Status: {wop.work_order.status}
                                                    </div>
                                                </div>
                                            );
                                        },
                                    },
                                    {
                                        key: 'quantities',
                                        label: 'Quantidades',
                                        sortable: false,
                                        width: 'w-[200px]',
                                        render: (value, row) => {
                                            const wop = row as unknown as WorkOrderPart;
                                            return (
                                                <div className="text-sm">
                                                    <div>Estimado: {wop.estimated_quantity}</div>
                                                    <div>Reservado: {wop.reserved_quantity}</div>
                                                    <div>Usado: {wop.used_quantity}</div>
                                                </div>
                                            );
                                        },
                                    },
                                    {
                                        key: 'status',
                                        label: 'Status',
                                        sortable: false,
                                        width: 'w-[150px]',
                                        render: (value, row) => {
                                            const wop = row as unknown as WorkOrderPart;
                                            return (
                                                <Badge variant={
                                                    wop.status === 'used' ? 'default' :
                                                        wop.status === 'reserved' ? 'secondary' : 'outline'
                                                }>
                                                    {wop.status}
                                                </Badge>
                                            );
                                        },
                                    },
                                    {
                                        key: 'total_cost',
                                        label: 'Custo Total',
                                        sortable: false,
                                        width: 'w-[150px]',
                                        render: (value, row) => {
                                            const wop = row as unknown as WorkOrderPart;
                                            return <span className="font-medium">{formatCurrency(wop.total_cost)}</span>;
                                        },
                                    },
                                ]}
                                onRowClick={(row) => {
                                    const wop = row as unknown as WorkOrderPart;
                                    router.get(route('maintenance.work-orders.show', wop.work_order_id));
                                }}
                            />
                        ) : (
                            <Card>
                                <CardContent className="flex items-center justify-center py-8">
                                    <p className="text-muted-foreground">
                                        Nenhuma ordem de serviço utilizando esta peça
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ),
            },
            {
                id: 'historico',
                label: 'Histórico',
                content: (
                    <div className="space-y-6 py-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Movimentações</CardTitle>
                                <CardDescription>
                                    Todas as movimentações desta peça
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center py-8">
                                <p className="text-muted-foreground">
                                    Histórico de movimentações será implementado em breve
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                ),
            },
        ]),
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreating ? 'Nova Peça' : `Peça - ${part?.part_number || ''}`} />
            <ShowLayout
                title={isCreating ? 'Nova Peça' : (part?.part_number || '')}
                subtitle={subtitle}
                editRoute=""
                tabs={tabs}
            />
        </AppLayout>
    );
}