import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { PlayCircle, CheckCircle, AlertCircle, TrendingUp, QrCode, Activity, Settings, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ColumnConfig } from '@/types/shared';
import { ProductionOrder, WorkCell } from '@/types/production';
import { cn } from '@/lib/utils';

interface Props {
    stats: {
        inProduction: number;
        completedToday: number;
        defectRate: number;
        efficiency: number;
    };
    workCells: WorkCell[];
    activeOrders: ProductionOrder[];
}

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
}

function KpiCard({ title, value, icon, trend, trendUp }: KpiCardProps) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            {icon}
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{title}</p>
                            <p className="text-2xl font-bold">{value}</p>
                        </div>
                    </div>
                    {trend && (
                        <div className={cn(
                            "text-sm font-medium",
                            trendUp ? "text-green-600" : "text-red-600"
                        )}>
                            {trend}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function WorkCellCard({
    workCell,
    onClick
}: {
    workCell: WorkCell & {
        currentOrder?: ProductionOrder;
        operator?: { name: string };
        efficiency?: number;
    };
    onClick: () => void;
}) {
    const getStatusColor = () => {
        switch (workCell.status) {
            case 'active':
                return 'bg-green-500';
            case 'maintenance':
                return 'bg-yellow-500';
            case 'inactive':
                return 'bg-gray-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusLabel = () => {
        switch (workCell.status) {
            case 'active':
                return 'Ativa';
            case 'maintenance':
                return 'Manutenção';
            case 'inactive':
                return 'Inativa';
            default:
                return workCell.status;
        }
    };

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h4 className="font-semibold text-lg">{workCell.code}</h4>
                        <p className="text-sm text-muted-foreground">{workCell.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
                        <span className="text-sm">{getStatusLabel()}</span>
                    </div>
                </div>

                {workCell.currentOrder ? (
                    <div className="space-y-2">
                        <div className="text-sm">
                            <span className="text-muted-foreground">Ordem: </span>
                            <span className="font-medium">{workCell.currentOrder.order_number}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted-foreground">Produto: </span>
                            <span>{workCell.currentOrder.item?.name}</span>
                        </div>
                        {workCell.operator && (
                            <div className="text-sm">
                                <span className="text-muted-foreground">Operador: </span>
                                <span>{workCell.operator.name}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between mt-3">
                            <Badge variant="default">Em Produção</Badge>
                            {workCell.efficiency && (
                                <span className="text-sm font-medium">
                                    {workCell.efficiency}% eficiência
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Célula disponível</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function ProductionDashboard({ stats, workCells, activeOrders }: Props) {
    const handleCellClick = (cell: WorkCell) => {
        console.log('Cell clicked:', cell);
        // Navigate to cell details or open modal
    };

    const handleOrderClick = (order: ProductionOrder) => {
        router.visit(route('production.planning.orders.show', order.id));
    };

    const activeOrderColumns: ColumnConfig[] = [
        {
            key: 'order_number',
            label: 'Número',
            sortable: true,
            width: 'w-[150px]',
            render: (value: any) => (
                <Badge variant="outline">{value}</Badge>
            )
        },
        {
            key: 'item',
            label: 'Produto',
            render: (value: any, order: any) => (
                <div>
                    <div className="font-medium">{order.item?.name}</div>
                    <div className="text-sm text-muted-foreground">{order.item?.item_number}</div>
                </div>
            )
        },
        {
            key: 'quantity',
            label: 'Quantidade',
            width: 'w-[120px]',
            headerAlign: 'center',
            render: (value: any, order: any) => (
                <div className="text-center">
                    {value} {order.unit_of_measure}
                </div>
            )
        },
        {
            key: 'progress',
            label: 'Progresso',
            width: 'w-[200px]',
            render: (value: any, order: any) => {
                const progress = order.quantity_completed
                    ? Math.round((order.quantity_completed / order.quantity) * 100)
                    : 0;

                return (
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>{order.quantity_completed || 0}/{order.quantity}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'work_cell',
            label: 'Célula',
            width: 'w-[120px]',
            render: (value: any, order: any) => (
                order.current_work_cell ? (
                    <Badge variant="secondary">
                        {order.current_work_cell.code}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )
            )
        },
        {
            key: 'priority',
            label: 'Prioridade',
            width: 'w-[100px]',
            headerAlign: 'center',
            render: (value: any) => {
                const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
                    'urgent': 'destructive',
                    'high': 'default',
                    'normal': 'secondary',
                    'low': 'outline'
                };

                const labels: Record<string, string> = {
                    'urgent': 'Urgente',
                    'high': 'Alta',
                    'normal': 'Normal',
                    'low': 'Baixa'
                };

                return (
                    <div className="text-center">
                        <Badge variant={variants[value] || 'secondary'}>
                            {labels[value] || value}
                        </Badge>
                    </div>
                );
            }
        }
    ];

    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'Rastreamento', href: '' }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="p-6 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KpiCard
                        title="Em Produção"
                        value={stats.inProduction}
                        icon={<PlayCircle className="h-4 w-4" />}
                        trend="+12%"
                        trendUp
                    />
                    <KpiCard
                        title="Concluídas Hoje"
                        value={stats.completedToday}
                        icon={<CheckCircle className="h-4 w-4" />}
                        trend="+5%"
                        trendUp
                    />
                    <KpiCard
                        title="Taxa de Defeitos"
                        value={`${stats.defectRate}%`}
                        icon={<AlertCircle className="h-4 w-4" />}
                        trend="-0.5%"
                        trendUp
                    />
                    <KpiCard
                        title="Eficiência"
                        value={`${stats.efficiency}%`}
                        icon={<TrendingUp className="h-4 w-4" />}
                        trend="+3%"
                        trendUp
                    />
                </div>

                {/* Work Cell Status Grid */}
                <Card>
                    <CardHeader>
                        <CardTitle>Status das Células de Trabalho</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {workCells.map((cell) => (
                                <WorkCellCard
                                    key={cell.id}
                                    workCell={cell as any}
                                    onClick={() => handleCellClick(cell)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Active Production Orders */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Ordens em Produção</CardTitle>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('production.tracking.scan')}>
                                <QrCode className="h-4 w-4 mr-2" />
                                Scanner QR
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <EntityDataTable
                            data={activeOrders as any}
                            columns={activeOrderColumns}
                            onRowClick={(order: any) => handleOrderClick(order)}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
} 