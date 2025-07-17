import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { BreadcrumbItem } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Package } from 'lucide-react';
import { CreatePartSheet } from '@/components/parts/CreatePartSheet';
import { PartFormComponent } from '@/components/parts/PartFormComponent';
import { cn } from '@/lib/utils';
import { HeadingMedium } from '@/components/HeadingMedium';
import { StatCard } from '@/components/StatCard';

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
    supplier: string | null;
    manufacturer: string | null;
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
    part: Part;
    statistics: Statistics;
}

export default function PartShow({ part, statistics }: PartShowProps) {
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Peças', href: '/parts' },
        { title: part.name, href: `/parts/${part.id}` },
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const getStockStatus = () => {
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Peça - ${part.name}`} />
            
            <ShowLayout
                title={part.name}
                subtitle={`#${part.part_number}`}
                icon={Package}
                badge={
                    <Badge variant={stockStatusConfig[stockStatus].variant}>
                        {stockStatusConfig[stockStatus].label}
                    </Badge>
                }
                actions={
                    <Button 
                        size="sm" 
                        onClick={() => setIsEditSheetOpen(true)}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                }
            >
                <Tabs defaultValue="general" className="w-full">
                    <TabsList>
                        <TabsTrigger value="general">Informações Gerais</TabsTrigger>
                        <TabsTrigger value="stock">Estoque</TabsTrigger>
                        <TabsTrigger value="work-orders">Ordens de Serviço</TabsTrigger>
                        <TabsTrigger value="history">Histórico</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6">
                        <PartFormComponent
                            part={part}
                            isEditMode={isEditMode}
                            onEditModeChange={setIsEditMode}
                        />
                    </TabsContent>

                    <TabsContent value="stock" className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-4">
                            <StatCard
                                title="Qtd. Disponível"
                                value={part.available_quantity.toString()}
                                description="Em estoque"
                                variant={part.available_quantity < part.minimum_quantity ? 'destructive' : 'default'}
                            />
                            <StatCard
                                title="Qtd. Mínima"
                                value={part.minimum_quantity.toString()}
                                description="Estoque mínimo"
                            />
                            <StatCard
                                title="Qtd. Máxima"
                                value={part.maximum_quantity?.toString() || 'N/A'}
                                description="Estoque máximo"
                            />
                            <StatCard
                                title="Valor em Estoque"
                                value={formatCurrency(part.available_quantity * part.unit_cost)}
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
                    </TabsContent>

                    <TabsContent value="work-orders" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Ordens de Serviço</CardTitle>
                                <CardDescription>
                                    Ordens que utilizam esta peça
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {part.work_order_parts && part.work_order_parts.length > 0 ? (
                                    <div className="space-y-4">
                                        {part.work_order_parts.map((wop) => (
                                            <div key={wop.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div>
                                                    <div className="font-medium">
                                                        #{wop.work_order.id} - {wop.work_order.title}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Estimado: {wop.estimated_quantity} | 
                                                        Reservado: {wop.reserved_quantity} | 
                                                        Usado: {wop.used_quantity}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={
                                                        wop.status === 'used' ? 'default' : 
                                                        wop.status === 'reserved' ? 'secondary' : 'outline'
                                                    }>
                                                        {wop.status}
                                                    </Badge>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {formatCurrency(wop.total_cost)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">
                                        Nenhuma ordem de serviço utilizando esta peça
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Movimentações</CardTitle>
                                <CardDescription>
                                    Todas as movimentações desta peça
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-center py-8">
                                    Histórico de movimentações será implementado em breve
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <CreatePartSheet
                    open={isEditSheetOpen}
                    onOpenChange={setIsEditSheetOpen}
                    part={part}
                    onSuccess={() => {
                        setIsEditSheetOpen(false);
                        router.reload();
                    }}
                />
            </ShowLayout>
        </AppLayout>
    );
}