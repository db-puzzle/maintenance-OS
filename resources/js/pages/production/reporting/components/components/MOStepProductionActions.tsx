import React from 'react';
import { ManufacturingOrder, ManufacturingStep } from '@/types/production';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { ProductionSummary } from '../ProductionSummary';
import { UseMOStepQuantityReportingReturn } from '../hooks/useMOStepQuantityReporting';

interface MOStepProductionActionsProps {
    order: ManufacturingOrder;
    currentStep: ManufacturingStep;
    activeExecution: { id: number } | null;
    quantityReporting: UseMOStepQuantityReportingReturn;
}

export function MOStepProductionActions({ 
    order, 
    currentStep, 
    activeExecution,
    quantityReporting 
}: MOStepProductionActionsProps) {
    const gateQuantity = order?.quantity || 0;
    const totalCompleted = (currentStep?.cumulative_quantity_completed || 0) + quantityReporting.form.data.quantity_completed;
    const canProceed = totalCompleted >= gateQuantity;

    return (
        <>
            {/* Production Summary */}
            <ProductionSummary
                orderQuantity={gateQuantity}
                quantityCompleted={currentStep?.cumulative_quantity_completed || 0}
                quantityScrapped={currentStep?.cumulative_quantity_scrapped || 0}
                currentSessionCompleted={quantityReporting.form.data.quantity_completed}
                currentSessionScrapped={quantityReporting.form.data.quantity_scrapped}
                unitOfMeasure={order?.unit_of_measure}
            />

            {/* Report Buttons */}
            <div className="grid grid-cols-2 gap-4">
                <Button
                    size="lg"
                    className="h-16 text-base font-semibold"
                    onClick={() => quantityReporting.productionDialog.onOpenChange(true)}
                    disabled={quantityReporting.getRemainingQuantity() === 0}
                >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Report Production
                </Button>
                <Button
                    variant="destructive"
                    size="lg"
                    className="h-16 text-base font-semibold"
                    onClick={() => quantityReporting.scrapDialog.onOpenChange(true)}
                    disabled={quantityReporting.getRemainingQuantity() === 0}
                >
                    <XCircle className="h-5 w-5 mr-2" />
                    Report Scrap
                </Button>
            </div>

            {/* Mark Complete Button */}
            {(canProceed || (activeExecution && !currentStep?.next_step)) && (
                <Button
                    variant="outline"
                    className="w-full h-12 text-base font-medium"
                    onClick={() => {
                        quantityReporting.form.setData('mark_complete', true);
                        quantityReporting.handleSubmit();
                    }}
                >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Mark Step Complete
                </Button>
            )}
        </>
    );
}
