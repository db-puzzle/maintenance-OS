import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MOStepLabelPrintDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MOStepLabelPrintDialog({ isOpen, onOpenChange }: MOStepLabelPrintDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Print Labels</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                    <p>Label printing functionality coming soon...</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
