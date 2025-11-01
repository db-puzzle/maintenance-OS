import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/number';
import { Plus, Minus, CheckCircle, XCircle } from 'lucide-react';

interface QuantityReportDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    type: 'production' | 'scrap';
    maxQuantity: number;
    currentQuantity: number;
    onSubmit: (quantity: number, reason?: string) => void;
    unitOfMeasure?: string;
}

export function QuantityReportDialog({
    isOpen,
    onOpenChange,
    type,
    maxQuantity,
    currentQuantity,
    onSubmit,
    unitOfMeasure = 'EA'
}: QuantityReportDialogProps) {
    const [quantity, setQuantity] = useState(0);
    const [scrapReason, setScrapReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isScrap = type === 'scrap';
    const title = isScrap ? 'Report Scrap' : 'Report Production';
    const icon = isScrap ? XCircle : CheckCircle;
    const colorClass = isScrap ? 'text-destructive' : 'text-green-600 dark:text-green-400';

    const handleQuantityChange = (delta: number) => {
        const newQuantity = Math.max(0, Math.min(quantity + delta, maxQuantity));
        setQuantity(newQuantity);
    };

    const handleSubmit = async () => {
        if (quantity === 0) return;
        
        if (isScrap && !scrapReason.trim()) {
            alert('Please provide a reason for scrap');
            return;
        }

        setSubmitting(true);
        await onSubmit(quantity, isScrap ? scrapReason : undefined);
        setSubmitting(false);
        
        // Reset form
        setQuantity(0);
        setScrapReason('');
        onOpenChange(false);
    };

    const handleClose = () => {
        setQuantity(0);
        setScrapReason('');
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {React.createElement(icon, { className: `h-5 w-5 ${colorClass}` })}
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {isScrap 
                            ? 'Report scrapped quantity for this step'
                            : 'Report completed quantity for this step'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Current Status */}
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Currently {isScrap ? 'Scrapped' : 'Completed'}</p>
                        <p className="text-2xl font-bold">{formatNumber(currentQuantity)} {unitOfMeasure}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Maximum additional: {formatNumber(maxQuantity)} {unitOfMeasure}
                        </p>
                    </div>

                    {/* Quantity Input */}
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-16 w-16 text-2xl"
                            onClick={() => handleQuantityChange(-1)}
                            disabled={quantity === 0}
                        >
                            <Minus className="h-8 w-8" />
                        </Button>

                        <div className="text-center">
                            <div className={`text-6xl font-bold tabular-nums ${colorClass}`}>
                                {formatNumber(quantity)}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                {unitOfMeasure}
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="lg"
                            className="h-16 w-16 text-2xl"
                            onClick={() => handleQuantityChange(1)}
                            disabled={quantity >= maxQuantity}
                        >
                            <Plus className="h-8 w-8" />
                        </Button>
                    </div>

                    {/* Quick Quantity Buttons */}
                    <div className="flex gap-2 justify-center">
                        {[1, 5, 10, 25].map((qty) => (
                            <Button
                                key={qty}
                                variant="outline"
                                size="sm"
                                onClick={() => setQuantity(Math.min(qty, maxQuantity))}
                                disabled={qty > maxQuantity}
                            >
                                {qty}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuantity(maxQuantity)}
                        >
                            MAX
                        </Button>
                    </div>

                    {/* Scrap Reason (only for scrap) */}
                    {isScrap && quantity > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Scrap Reason</label>
                            <textarea
                                value={scrapReason}
                                onChange={(e) => setScrapReason(e.target.value)}
                                placeholder="Enter reason for scrap..."
                                rows={3}
                                className="w-full p-2 border rounded-md"
                                required
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSubmit}
                            disabled={quantity === 0 || submitting || (isScrap && quantity > 0 && !scrapReason.trim())}
                        >
                            {submitting ? 'Submitting...' : 'Submit'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
