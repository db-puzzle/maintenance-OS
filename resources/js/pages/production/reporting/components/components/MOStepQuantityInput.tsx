import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Minus, Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatNumber } from '@/utils/number';

interface MOStepQuantityInputProps {
    currentCompleted: number;
    currentScrapped: number;
    onSubmitProduction: (quantity: number) => void;
    onSubmitScrap: (quantity: number) => void;
    onPreviewChange?: (mode: 'production' | 'scrap', quantity: number) => void;
    disabled?: boolean;
    unitOfMeasure?: string;
}

export function MOStepQuantityInput({
    currentCompleted,
    currentScrapped,
    onSubmitProduction,
    onSubmitScrap,
    onPreviewChange,
    disabled = false,
    unitOfMeasure = 'EA'
}: MOStepQuantityInputProps) {
    // State for tab selection (production or scrap)
    const [mode, setMode] = useState<'production' | 'scrap'>('production');
    
    // Separate state for production and scrap quantities
    const [productionQuantity, setProductionQuantity] = useState(0);
    const [scrapQuantity, setScrapQuantity] = useState(0);
    
    // Confirmation dialog state
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Get the current quantity based on mode
    const getCurrentQuantity = () => {
        return mode === 'production' ? productionQuantity : scrapQuantity;
    };

    // Set quantity based on current mode
    const setCurrentQuantity = (value: number) => {
        if (mode === 'production') {
            setProductionQuantity(value);
        } else {
            setScrapQuantity(value);
        }
    };

    // Notify parent of preview changes for real-time summary updates
    useEffect(() => {
        if (onPreviewChange) {
            onPreviewChange('production', productionQuantity);
        }
    }, [productionQuantity, onPreviewChange]);

    useEffect(() => {
        if (onPreviewChange) {
            onPreviewChange('scrap', scrapQuantity);
        }
    }, [scrapQuantity, onPreviewChange]);

    // Handle quantity change
    const handleQuantityChange = (value: number) => {
        setCurrentQuantity(value);
    };

    // Increment/decrement handlers
    const increment = (amount: number) => {
        setCurrentQuantity(getCurrentQuantity() + amount);
    };

    const decrement = () => {
        setCurrentQuantity(getCurrentQuantity() - 1);
    };

    // Calculate new total based on mode
    const calculateNewTotal = () => {
        const quantity = getCurrentQuantity();
        if (mode === 'production') {
            return Math.max(0, currentCompleted + quantity);
        } else {
            return Math.max(0, currentScrapped + quantity);
        }
    };

    // Handle submit button click
    const handleSubmitClick = () => {
        const quantity = getCurrentQuantity();
        if (quantity === 0) return;
        
        // Validate that new total won't be negative
        const newTotal = calculateNewTotal();
        if (newTotal < 0) {
            alert('Cannot reduce total below zero');
            return;
        }

        setShowConfirmation(true);
    };

    // Confirm and submit
    const handleConfirm = () => {
        const quantity = getCurrentQuantity();
        if (mode === 'production') {
            onSubmitProduction(quantity);
            setProductionQuantity(0);
        } else {
            onSubmitScrap(quantity);
            setScrapQuantity(0);
        }
        
        // Close dialog
        setShowConfirmation(false);
    };

    // Get button label based on mode
    const getSubmitButtonLabel = () => {
        if (mode === 'production') {
            return 'Submit Production';
        } else {
            return 'Submit Scrap';
        }
    };

    return (
        <>
            <div className="space-y-4">
                {/* Mode Toggle */}
                <Tabs value={mode} onValueChange={(value) => setMode(value as 'production' | 'scrap')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="production">Production</TabsTrigger>
                        <TabsTrigger value="scrap">Scrap</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Quantity Input with Large +/- Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="lg"
                        className="h-14 w-14 flex-shrink-0"
                        onClick={decrement}
                        disabled={disabled}
                    >
                        <Minus className="h-6 w-6" />
                    </Button>

                    <input
                        type="number"
                        value={getCurrentQuantity()}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                        className="flex-1 h-14 text-center text-2xl font-bold border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={disabled}
                    />

                    <Button
                        variant="outline"
                        size="lg"
                        className="h-14 w-14 flex-shrink-0"
                        onClick={() => increment(1)}
                        disabled={disabled}
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>

                {/* Quick Add Buttons */}
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        variant="secondary"
                        size="lg"
                        className="h-12"
                        onClick={() => increment(1)}
                        disabled={disabled}
                    >
                        +1
                    </Button>
                    <Button
                        variant="secondary"
                        size="lg"
                        className="h-12"
                        onClick={() => increment(5)}
                        disabled={disabled}
                    >
                        +5
                    </Button>
                    <Button
                        variant="secondary"
                        size="lg"
                        className="h-12"
                        onClick={() => increment(10)}
                        disabled={disabled}
                    >
                        +10
                    </Button>
                </div>

                {/* Submit Button */}
                <Button
                    className="w-full h-12 text-base font-semibold"
                    variant={mode === 'production' ? 'default' : 'destructive'}
                    onClick={handleSubmitClick}
                    disabled={disabled || getCurrentQuantity() === 0}
                >
                    {getSubmitButtonLabel()}
                </Button>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Confirm {mode === 'production' ? 'Production' : 'Scrap'} Report
                        </DialogTitle>
                        <DialogDescription>
                            Please confirm the following change:
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <div className="text-center space-y-2">
                            <div className="text-sm text-muted-foreground">
                                Reporting {getCurrentQuantity() > 0 ? '+' : ''}{formatNumber(getCurrentQuantity())} {unitOfMeasure}
                            </div>
                            <div className="text-lg font-semibold">
                                New Total: {formatNumber(calculateNewTotal())} {unitOfMeasure}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant={mode === 'production' ? 'default' : 'destructive'}
                            onClick={handleConfirm}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

