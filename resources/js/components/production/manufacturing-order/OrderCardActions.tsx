import React from 'react';
import { Link, router } from '@inertiajs/react';
import {
    MoreVertical,
    Trash2,
    Play,
    XCircle,
    Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ManufacturingOrderTreeNode } from './types';
import { canBeReleased, canBeCancelled, canBeDeleted } from './utils';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: string | number | Record<string, string | number>) => string;

interface OrderCardActionsProps {
    order: ManufacturingOrderTreeNode;
    permissions: {
        canRelease: boolean;
        canCancel: boolean;
        canUpdate: boolean;
        canDelete: boolean;
    };
    onReleaseOrder: (order: ManufacturingOrderTreeNode) => void;
    onCancelOrder: (order: ManufacturingOrderTreeNode) => void;
    className?: string;
    size?: 'default' | 'sm';
}

export function OrderCardActions({
    order,
    permissions,
    onReleaseOrder,
    onCancelOrder,
    className,
    size = 'default'
}: OrderCardActionsProps) {
    const hasAnyPermission = permissions.canRelease ||
        permissions.canCancel || permissions.canUpdate || permissions.canDelete;

    if (!hasAnyPermission) {
        return null;
    }

    const handleDelete = () => {
        if (confirm('Tem certeza que deseja excluir esta ordem de manufatura em rascunho?')) {
            router.delete(route('production.orders.destroy', order.id), {
                onSuccess: () => toast.success('Ordem excluída com sucesso'),
                onError: () => toast.error('Erro ao excluir ordem')
            });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={className || (size === 'sm' ? "h-6 w-6" : "h-8 w-8")}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MoreVertical className={size === 'sm' ? "h-3 w-3" : "h-4 w-4"} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-55">
                {/* View Details */}
                <DropdownMenuItem asChild>
                    <Link href={route('production.orders.show', order.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                    </Link>
                </DropdownMenuItem>

                {/* Status Change Actions */}
                {(permissions.canRelease || permissions.canCancel || permissions.canDelete) && (
                    <>
                        {permissions.canRelease && canBeReleased(order) && (
                            <DropdownMenuItem onClick={() => onReleaseOrder(order)}>
                                <Play className="h-4 w-4 mr-2" />
                                Liberar para Produção
                            </DropdownMenuItem>
                        )}
                        {permissions.canDelete && canBeDeleted(order) && (
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={handleDelete}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir Ordem
                            </DropdownMenuItem>
                        )}
                        {permissions.canCancel && canBeCancelled(order) && (
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => onCancelOrder(order)}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar Ordem
                            </DropdownMenuItem>
                        )}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
