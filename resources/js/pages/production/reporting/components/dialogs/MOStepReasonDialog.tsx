import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StateTransitionAction } from '@/types/production-states';

interface MOStepReasonDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    pendingAction: StateTransitionAction | null;
    reason: string;
    onReasonChange: (reason: string) => void;
    onConfirm: () => void;
}

export function MOStepReasonDialog({
    isOpen,
    onOpenChange,
    pendingAction,
    reason,
    onReasonChange,
    onConfirm
}: MOStepReasonDialogProps) {
    const handleClose = () => {
        onOpenChange(false);
        onReasonChange('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{pendingAction?.label}</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for this action.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <textarea
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                        placeholder="Enter reason..."
                        rows={3}
                        className="w-full p-2 border rounded-md"
                    />
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={!reason.trim()}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
