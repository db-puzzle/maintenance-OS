import React from 'react';
import { ManufacturingStep } from '@/types/production';

interface MOStepCurrentStepSectionProps {
    currentStep: ManufacturingStep | null;
}

export function MOStepCurrentStepSection({ currentStep }: MOStepCurrentStepSectionProps) {
    return (
        <div className="flex flex-col flex-1">
            <h3 className="text-base font-semibold uppercase mb-2">CURRENT STEP</h3>

            <div className="flex-1 flex flex-col justify-center">
                {currentStep && (
                    <div className="space-y-6">
                        <div className="text-center p-6 bg-background rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">GATE</p>
                            <p className="text-3xl font-bold">{currentStep.name}</p>
                            {currentStep.description && (
                                <p className="text-sm text-muted-foreground mt-2">{currentStep.description}</p>
                            )}
                        </div>

                        {currentStep.next_step && (
                            <div className="text-center p-6 bg-background/50 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-2">NEXT STEP</p>
                                <p className="text-xl font-medium">{currentStep.next_step.name}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
