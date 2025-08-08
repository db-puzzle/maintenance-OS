import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Package,
    Factory,
    ChevronRight,
    Calendar,
    Eye,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface ItemCategory {
    id: number;
    name: string;
}
interface BillOfMaterial {
    id: number;
    name: string;
    version: string;
}
interface Item {
    id: number;
    item_number: string;
    name: string;
    description: string | null;
    category: ItemCategory | null;
    primaryBom: BillOfMaterial | null;
    unit_of_measure: string;
    created_at: string;
}
interface Action {
    label: string;
    route: string;
    icon: string;
    primary?: boolean;
}
interface Props {
    item: Item;
    can: {
        view: boolean;
        update: boolean;
        execute_steps: boolean;
    };
    actions: Action[];
}
const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ElementType> = {
        Factory,
        Package,
        Eye,
        Plus,
    };
    return icons[iconName] || ChevronRight;
};
export default function ItemScan({ item, can, actions }: Props) {
    return (
        <>
            <Head title={`Item - ${item.item_number}`} />
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-lg mx-auto space-y-4">
                    {/* Header Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Item Escaneado</CardTitle>
                                <Badge variant="secondary">{item.item_number}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <h2 className="text-xl font-semibold">{item.name}</h2>
                                    {item.description && (
                                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-500">Categoria:</span>
                                        <p className="font-medium">{item.category?.name || 'Sem categoria'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Unidade:</span>
                                        <p className="font-medium">{item.unit_of_measure}</p>
                                    </div>
                                    {item.primaryBom && (
                                        <div className="col-span-2">
                                            <span className="text-gray-500">BOM Atual:</span>
                                            <p className="font-medium">
                                                {item.primaryBom.name} (v{item.primaryBom.version})
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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
                    {/* Quick Info */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center text-sm text-gray-500">
                                <Calendar className="mr-2 h-4 w-4" />
                                Criado em {format(new Date(item.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </div>
                        </CardContent>
                    </Card>
                    {/* View Details Link */}
                    {can.view && (
                        <div className="text-center">
                            <Link
                                href={route('production.items.show', item.id)}
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