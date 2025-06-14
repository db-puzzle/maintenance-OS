import React, { useState } from 'react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EntityDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityName: string;
    entityLabel: string;
    onConfirm: () => Promise<void>;
}

export function EntityDeleteDialog({
    open,
    onOpenChange,
    entityName,
    entityLabel,
    onConfirm,
}: EntityDeleteDialogProps) {
    const [loading, setLoading] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            setConfirmationText('');
            onOpenChange(false);
        } catch (err: any) {
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

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogTitle>Confirmar exclusão</DialogTitle>
                <DialogDescription>
                    Tem certeza que deseja excluir {entityLabel}? Esta ação não pode ser desfeita.
                </DialogDescription>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="confirmation">Digite EXCLUIR para confirmar</Label>
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
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!isConfirmationValid || loading}
                    >
                        {loading ? 'Excluindo...' : 'Excluir'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 