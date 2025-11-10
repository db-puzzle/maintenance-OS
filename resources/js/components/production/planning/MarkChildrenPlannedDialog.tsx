import React, { useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { ManufacturingOrder } from '@/types/production';

interface MarkChildrenPlannedDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (includeChildren: boolean) => void;
    parentOrder: ManufacturingOrder;
    childrenCount: number;
}

// Helper function to get all children recursively
const getAllChildrenFlat = (order: ManufacturingOrder): ManufacturingOrder[] => {
    const result: ManufacturingOrder[] = [];

    const collectChildren = (currentOrder: ManufacturingOrder) => {
        if (currentOrder.children && currentOrder.children.length > 0) {
            currentOrder.children.forEach(child => {
                result.push(child);
                collectChildren(child);
            });
        }
    };

    collectChildren(order);
    return result;
};

export function MarkChildrenPlannedDialog({
    open,
    onOpenChange,
    onConfirm,
    parentOrder,
    childrenCount,
}: MarkChildrenPlannedDialogProps) {
    // Get all children recursively
    const allChildren = useMemo(() => getAllChildrenFlat(parentOrder), [parentOrder]);

    // Check if a child has no route steps
    const hasNoRouteSteps = (order: ManufacturingOrder): boolean => {
        return !order.manufacturing_route?.steps || order.manufacturing_route.steps.length === 0;
    };

    // Count how many children cannot be planned
    const childrenWithNoSteps = useMemo(() => {
        return allChildren.filter(child => hasNoRouteSteps(child));
    }, [allChildren]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex flex-col overflow-hidden"
                style={{
                    maxHeight: '90vh',
                    width: '95vw',
                    maxWidth: '48rem' // 768px = 48rem
                }}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-primary" />
                        Marcar Ordens Filhas como Planejadas?
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-3 pt-2">
                            <p>
                                A ordem de fabricação <strong>{parentOrder.order_number}</strong>
                                {parentOrder.item?.name && (
                                    <span className="text-muted-foreground"> ({parentOrder.item.name})</span>
                                )}
                                {' '}possui {childrenCount} {childrenCount === 1 ? 'ordem filha' : 'ordens filhas'}.
                            </p>
                            <p>
                                Deseja marcar {childrenCount === 1 ? 'a ordem filha' : 'as ordens filhas'} como planejadas também?
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                {allChildren.length > 0 && (
                    <div className="my-4 space-y-4">
                        <div className="space-y-3">
                            <div className="rounded-lg border">
                                {allChildren.length <= 5 ? (
                                    <div className="space-y-2 p-3">
                                        {allChildren.map((child) => (
                                            <Card key={child.id} className="p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-1 items-center">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium">
                                                                    {child.order_number}
                                                                </span>
                                                                {child.item?.name && (
                                                                    <span className="text-sm text-muted-foreground">
                                                                        - {child.item.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {hasNoRouteSteps(child) && (
                                                        <div className="flex items-center gap-1">
                                                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                            <span className="text-xs text-yellow-600">Sem etapas de rota</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <ScrollArea className="h-[300px]">
                                            <div className="space-y-2 p-3">
                                                {allChildren.map((child) => (
                                                    <Card key={child.id} className="p-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-1 items-center">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium">
                                                                            {child.order_number}
                                                                        </span>
                                                                        {child.item?.name && (
                                                                            <span className="text-sm text-muted-foreground">
                                                                                - {child.item.name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {hasNoRouteSteps(child) && (
                                                                <div className="flex items-center gap-1">
                                                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                                    <span className="text-xs text-yellow-600">Sem etapas de rota</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                        {allChildren.length > 10 && (
                                            <div className="text-regular border-t p-2 text-center text-xs">
                                                {allChildren.length} Ordens Filhas
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {childrenWithNoSteps.length > 0 && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                            <div className="flex-1 space-y-2">
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    Aviso: Ordens sem etapas de rota
                                </p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    {childrenWithNoSteps.length === 1
                                        ? '1 ordem filha não possui etapas de rota definidas e será ignorada.'
                                        : `${childrenWithNoSteps.length} ordens filhas não possuem etapas de rota definidas e serão ignoradas.`}
                                </p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                    Apenas ordens com rotas completas serão marcadas como planejadas.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                onConfirm(false);
                                onOpenChange(false);
                            }}
                        >
                            Não, apenas a ordem selecionada
                        </Button>
                        <Button
                            onClick={() => {
                                onConfirm(true);
                                onOpenChange(false);
                            }}
                            variant={childrenWithNoSteps.length > 0 ? 'outline' : 'default'}
                        >
                            {childrenWithNoSteps.length > 0
                                ? `Sim, apenas ordens válidas (${allChildren.length - childrenWithNoSteps.length})`
                                : 'Sim, incluir ordens filhas'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
