import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { formatNumber } from '@/utils/number';

interface MOCompletionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    orderNumber: string;
    totalQuantity: number;
    unitOfMeasure: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function MOCompletionDialog({
    isOpen,
    onOpenChange,
    orderNumber,
    totalQuantity,
    unitOfMeasure,
    onConfirm,
    onCancel,
}: MOCompletionDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <DialogTitle>All Items Produced</DialogTitle>
                            <DialogDescription className="mt-1">
                                All {formatNumber(totalQuantity)} {unitOfMeasure} have been produced for order {orderNumber}.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                        Would you like to mark this manufacturing order as complete?
                    </p>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => {
                            onCancel();
                            onOpenChange(false);
                        }}
                    >
                        Keep Open
                    </Button>
                    <Button
                        variant="default"
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Mark as Complete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
