import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ManufacturingOrderTreeNode } from './types';

interface ReleaseOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: ManufacturingOrderTreeNode | null;
    onConfirm: () => void;
}

export function ReleaseOrderDialog({
    open,
    onOpenChange,
    order,
    onConfirm
}: ReleaseOrderDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Liberar Ordem para Produção</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja liberar a ordem <strong>{order?.order_number}</strong> para produção?
                        <br /><br />
                        Esta ação irá disponibilizar a ordem para execução no chão de fábrica.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>
                        Liberar Ordem
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
