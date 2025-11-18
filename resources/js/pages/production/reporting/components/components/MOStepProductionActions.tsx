import React, { useState } from 'react';
import { ManufacturingOrder, ManufacturingStep } from '@/types/production';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { ProductionSummary } from '../ProductionSummary';
import { MOStepQuantityInput } from './MOStepQuantityInput';
import { UseMOStepQuantityReportingReturn } from '../hooks/useMOStepQuantityReporting';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface MOStepProductionActionsProps {
    order: ManufacturingOrder;
    currentStep: ManufacturingStep;
    activeExecution: { id: number } | null;
    quantityReporting: UseMOStepQuantityReportingReturn;
}

export function MOStepProductionActions({ 
    order, 
    currentStep, 
    activeExecution: _activeExecution,
    quantityReporting 
}: MOStepProductionActionsProps) {
    const gateQuantity = order?.quantity || 0;
    const totalCompleted = currentStep?.cumulative_quantity_completed || 0;
    const totalScrapped = currentStep?.cumulative_quantity_scrapped || 0;
    const remaining = gateQuantity - (totalCompleted + totalScrapped);
    const canProceed = remaining <= 0;

    // State for Mark Complete warning dialog
    const [showCompleteWarning, setShowCompleteWarning] = useState(false);

    // State for preview quantities (for real-time summary updates)
    const [previewCompleted, setPreviewCompleted] = useState(0);
    const [previewScrapped, setPreviewScrapped] = useState(0);

    // Handle preview changes from quantity input
    // Note: This receives updates for BOTH production and scrap independently
    const handlePreviewChange = (mode: 'production' | 'scrap', quantity: number) => {
        if (mode === 'production') {
            setPreviewCompleted(quantity);
        } else {
            setPreviewScrapped(quantity);
        }
    };

    // Handle mark complete with warning if quantity not met
    const handleMarkCompleteClick = () => {
        if (!canProceed) {
            setShowCompleteWarning(true);
        } else {
            quantityReporting.handleComplete();
        }
    };

    // Confirm mark complete even with incomplete quantity
    const confirmMarkComplete = () => {
        setShowCompleteWarning(false);
        quantityReporting.handleComplete();
    };

    return (
        <>
            {/* Production Summary */}
            <ProductionSummary
                orderQuantity={gateQuantity}
                quantityCompleted={totalCompleted}
                quantityScrapped={totalScrapped}
                currentSessionCompleted={previewCompleted}
                currentSessionScrapped={previewScrapped}
                unitOfMeasure={order?.unit_of_measure}
            />

            {/* Quantity Input Component */}
            <MOStepQuantityInput
                currentCompleted={totalCompleted}
                currentScrapped={totalScrapped}
                onSubmitProduction={(quantity) => quantityReporting.productionDialog.onSubmit(quantity)}
                onSubmitScrap={(quantity) => quantityReporting.scrapDialog.onSubmit(quantity)}
                onPreviewChange={handlePreviewChange}
                disabled={quantityReporting.isReporting}
                unitOfMeasure={order?.unit_of_measure}
            />

            {/* Mark Complete Button */}
            <Button
                variant="outline"
                className="w-full h-12 text-base font-medium"
                onClick={handleMarkCompleteClick}
                disabled={quantityReporting.isReporting}
            >
                <CheckCircle className="h-5 w-5 mr-2" />
                Mark Step Complete
            </Button>

            {/* Incomplete Quantity Warning Dialog */}
            <Dialog open={showCompleteWarning} onOpenChange={setShowCompleteWarning}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Incomplete Quantity</DialogTitle>
                        <DialogDescription>
                            The full order quantity has not been reached.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-2">
                        <p className="text-sm">
                            <span className="font-semibold">Order Quantity:</span> {gateQuantity} {order?.unit_of_measure}
                        </p>
                        <p className="text-sm">
                            <span className="font-semibold">Completed:</span> {totalCompleted} {order?.unit_of_measure}
                        </p>
                        <p className="text-sm">
                            <span className="font-semibold">Scrapped:</span> {totalScrapped} {order?.unit_of_measure}
                        </p>
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                            <span className="font-semibold">Remaining:</span> {remaining} {order?.unit_of_measure}
                        </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to mark this step as complete?
                    </p>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCompleteWarning(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmMarkComplete}>
                            Mark Complete Anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
