import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface EntityDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityLabel: string;
    onConfirm: () => Promise<void>;
    confirmationValue?: string;
    confirmationLabel?: string;
}

export function EntityDeleteDialog({
    open,
    onOpenChange,
    entityLabel,
    onConfirm,
    confirmationValue = 'EXCLUIR',
    confirmationLabel
}: EntityDeleteDialogProps) {
    const [loading, setLoading] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            setConfirmationText('');
            onOpenChange(false);
        } catch {
            // Error is handled by the parent component
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setConfirmationText('');
        }
        onOpenChange(newOpen);
    };

    const isConfirmationValid = confirmationText === confirmationValue;

    const defaultLabel = confirmationValue === 'EXCLUIR'
        ? 'Digite EXCLUIR para confirmar'
        : `Digite ${confirmationValue} para confirmar`;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogTitle>Confirmar exclusão</DialogTitle>
                <DialogDescription>Tem certeza que deseja excluir {entityLabel}? Esta ação não pode ser desfeita.</DialogDescription>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="confirmation">{confirmationLabel || defaultLabel}</Label>
                        <Input
                            id="confirmation"
                            variant="destructive"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && isConfirmationValid && !loading) {
                                    handleConfirm();
                                }
                            }}
                            disabled={loading}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary" disabled={loading}>
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={handleConfirm} disabled={!isConfirmationValid || loading}>
                        {loading ? 'Excluindo...' : 'Excluir'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
