import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Factory,
    Play,
    CheckCircle,
    Package,
    Hash,
    Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
interface Item {
    id: number;
    item_number: string;
    name: string;
}
interface Step {
    id: number;
    step_number: number;
    name: string;
    status: string;
    step_type: string;
}
interface Route {
    id: number;
    name: string;
    steps: Step[];
}
interface ManufacturingOrder {
    id: number;
    order_number: string;
    quantity: number;
    quantity_completed: number;
    status: string;
    item: Item;
    route: Route | null;
    planned_end_date?: string;
    children: ManufacturingOrder[];
}
interface CurrentStep {
    id: number;
    name: string;
    status: string;
    step_number: number;
}
interface Action {
    label: string;
    route: string;
    icon: string;
    primary?: boolean;
}
interface Props {
    order: ManufacturingOrder;
    currentStep: CurrentStep | null;
    can: {
        view: boolean;
        execute_steps: boolean;
        update_quality: boolean;
    };
    actions: Action[];
}
const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
        draft: 'secondary',
        planned: 'outline',
        released: 'default',
        in_progress: 'default',
        completed: 'secondary',
        cancelled: 'destructive',
    };
    return colors[status] || 'secondary';
};
const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ElementType> = {
        Play,
        CheckCircle,
        Factory,
        Package,
    };
    return icons[iconName] || Play;
};
export default function OrderScan({ order, currentStep, can, actions }: Props) {
    const progress = order.quantity > 0
        ? (order.quantity_completed / order.quantity) * 100
        : 0;
    return (
        <>
            <Head title={`Ordem - ${order.order_number}`} />
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-lg mx-auto space-y-4">
                    {/* Header Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Ordem de Manufatura</CardTitle>
                                <Badge variant={getStatusColor(order.status)}>
                                    {order.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Hash className="h-4 w-4 text-gray-400" />
                                        <span className="font-mono font-semibold">{order.order_number}</span>
                                    </div>
                                    <h2 className="text-lg font-medium">{order.item.name}</h2>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Progresso:</span>
                                        <span className="font-medium">
                                            {order.quantity_completed} / {order.quantity}
                                        </span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-500">Entrega:</span>
                                        <p className="font-medium">
                                            {order.planned_end_date ? format(new Date(order.planned_end_date), 'dd/MM/yyyy') : 'N/A'}
                                        </p>
                                    </div>
                                    {order.route && (
                                        <div>
                                            <span className="text-gray-500">Rota:</span>
                                            <p className="font-medium">{order.route.name}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {/* Current Step */}
                    {currentStep && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center">
                                    <Clock className="mr-2 h-4 w-4" />
                                    Etapa Atual
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">
                                            {currentStep.step_number}. {currentStep.name}
                                        </p>
                                        <Badge variant="outline" className="mt-1">
                                            {currentStep.status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {/* Actions */}
                    {actions.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Ações Disponíveis</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {actions.map((action, index) => {
                                    const Icon = getIconComponent(action.icon);
                                    return (
                                        <Link
                                            key={index}
                                            href={action.route}
                                            className="block"
                                        >
                                            <Button
                                                variant={action.primary ? 'default' : 'outline'}
                                                className="w-full justify-start"
                                            >
                                                <Icon className="mr-2 h-4 w-4" />
                                                {action.label}
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}
                    {/* Child Orders */}
                    {order.children && order.children.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Ordens Filhas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {order.children.slice(0, 3).map((child) => (
                                        <div
                                            key={child.id}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <span className="font-mono">{child.order_number}</span>
                                            <Badge variant={getStatusColor(child.status)}>
                                                {child.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {order.children.length > 3 && (
                                        <p className="text-sm text-gray-500 text-center">
                                            +{order.children.length - 3} mais...
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {/* View Details Link */}
                    {can.view && (
                        <div className="text-center">
                            <Link
                                href={route('production.orders.show', order.id)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                Ver todos os detalhes →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}