import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { ManufacturingOrderTreeNode } from '../types';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: string | number | Record<string, string | number>) => string;

export function useManufacturingOrderActions() {
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [selectedOrderForRoute, setSelectedOrderForRoute] = useState<ManufacturingOrderTreeNode | null>(null);
    const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedOrderForAction, setSelectedOrderForAction] = useState<ManufacturingOrderTreeNode | null>(null);

    const handleApplyTemplate = (order: ManufacturingOrderTreeNode) => {
        setSelectedOrderForRoute(order);
        setTemplateDialogOpen(true);
    };

    const handleTemplateSelect = (templateId: number) => {
        if (!selectedOrderForRoute) return;

        router.post(route('production.orders.apply-template', selectedOrderForRoute.id), {
            template_id: templateId
        }, {
            preserveScroll: false,
            onSuccess: () => {
                toast.success('Template de rota aplicado com sucesso');
                setTemplateDialogOpen(false);
                setSelectedOrderForRoute(null);
            },
            onError: () => {
                toast.error('Erro ao aplicar template de rota');
            }
        });
    };

    const handleCreateCustomRoute = (order: ManufacturingOrderTreeNode) => {
        router.visit(route('production.orders.show', order.id) + '?openRouteBuilder=1');
    };

    const handleRemoveRoute = (order: ManufacturingOrderTreeNode) => {
        if (!order.manufacturing_route) return;

        if (confirm('Tem certeza que deseja remover a rota desta ordem de manufatura?')) {
            router.delete(route('production.routing.destroy', order.manufacturing_route.id), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Rota removida com sucesso');
                },
                onError: () => {
                    toast.error('Erro ao remover rota');
                }
            });
        }
    };

    const handleReleaseOrder = (order: ManufacturingOrderTreeNode) => {
        setSelectedOrderForAction(order);
        setReleaseDialogOpen(true);
    };

    const confirmReleaseOrder = () => {
        if (!selectedOrderForAction) return;

        router.post(route('production.orders.release', selectedOrderForAction.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Ordem de manufatura liberada para produção');
                setReleaseDialogOpen(false);
                setSelectedOrderForAction(null);
            },
            onError: () => {
                toast.error('Erro ao liberar ordem de manufatura');
            }
        });
    };

    const handleCancelOrder = (order: ManufacturingOrderTreeNode) => {
        setSelectedOrderForAction(order);
        setCancelDialogOpen(true);
    };

    const confirmCancelOrder = () => {
        if (!selectedOrderForAction) return;

        router.post(route('production.orders.cancel', selectedOrderForAction.id), {
            reason: 'Cancelled from tree view'
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Ordem de manufatura cancelada');
                setCancelDialogOpen(false);
                setSelectedOrderForAction(null);
            },
            onError: () => {
                toast.error('Erro ao cancelar ordem de manufatura');
            }
        });
    };

    return {
        // State
        templateDialogOpen,
        setTemplateDialogOpen,
        selectedOrderForRoute,
        releaseDialogOpen,
        setReleaseDialogOpen,
        cancelDialogOpen,
        setCancelDialogOpen,
        selectedOrderForAction,

        // Actions
        handleApplyTemplate,
        handleTemplateSelect,
        handleCreateCustomRoute,
        handleRemoveRoute,
        handleReleaseOrder,
        confirmReleaseOrder,
        handleCancelOrder,
        confirmCancelOrder,
    };
}
