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

interface CancelOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: ManufacturingOrderTreeNode | null;
    onConfirm: () => void;
}

export function CancelOrderDialog({
    open,
    onOpenChange,
    order,
    onConfirm
}: CancelOrderDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar Ordem de Manufatura</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja cancelar a ordem <strong>{order?.order_number}</strong> (Status: {order?.status})?
                        <br /><br />
                        Esta ação é usada para ordens que já foram iniciadas mas precisam ser interrompidas.
                        A ordem não poderá mais ser executada após o cancelamento.
                        <br /><br />
                        <strong>Nota:</strong> Ordens em rascunho devem ser excluídas, não canceladas.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Cancelar Ordem
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
