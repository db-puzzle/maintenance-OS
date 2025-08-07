import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
interface StepDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stepName: string;
    onConfirm: () => Promise<void>;
}
export function StepDeleteDialog({
    open,
    onOpenChange,
    stepName,
    onConfirm
}: StepDeleteDialogProps) {
    const [loading, setLoading] = useState(false);
    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch {
            // Error is handled by the parent component
        } finally {
            setLoading(false);
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Confirmar exclusão</DialogTitle>
                <DialogDescription>
                    Tem certeza que deseja excluir a etapa "{stepName}"? Esta ação não pode ser desfeita.
                </DialogDescription>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary" disabled={loading}>
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
                        {loading ? 'Excluindo...' : 'Excluir'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}