import React from 'react';
import { ManufacturingOrder } from '@/types/production';
import { Separator } from '@/components/ui/separator';
import { MOStepStateContent } from './MOStepStateContent';
import { MOStepPictureSection } from './MOStepPictureSection';
import { StepNavigator } from '@/components/production/reporting/StepNavigator';
import { UseMOStepDataReturn } from '../hooks/useMOStepData';
import { UseMOStepStateTransitionsReturn } from '../hooks/useMOStepStateTransitions';
import { UseMOStepQuantityReportingReturn } from '../hooks/useMOStepQuantityReporting';
import { UseMOStepPhotoManagementReturn } from '../hooks/useMOStepPhotoManagement';

interface MOStepDialogContentProps {
    stepData: UseMOStepDataReturn;
    stateTransitions: UseMOStepStateTransitionsReturn;
    quantityReporting: UseMOStepQuantityReportingReturn;
    photoManagement: UseMOStepPhotoManagementReturn;
    order: ManufacturingOrder;
    onStepChange?: (stepId: number) => void;
}

export function MOStepDialogContent({
    stepData,
    stateTransitions,
    quantityReporting,
    photoManagement,
    order,
    onStepChange
}: MOStepDialogContentProps) {
    const { currentStep, activeExecution, stepStateInfo, loading } = stepData;
    const { 
        selectedPhotoIndex, 
        showingStepPhotos, 
        setSelectedPhotoIndex, 
        setShowingStepPhotos,
        photos 
    } = photoManagement;

    return (
        <div className="relative flex-1 flex flex-col p-6 min-h-0 overflow-hidden">
            <div className="flex h-full gap-6 min-h-0">
                {/* Left - Dynamic State Content */}
                <div className="flex-1 flex flex-col pr-6 border-r min-h-0 overflow-hidden">
                    <MOStepStateContent
                        stepStateInfo={stepStateInfo}
                        currentStep={currentStep}
                        activeExecution={activeExecution}
                        order={order}
                        quantityReporting={quantityReporting}
                        photoManagement={photoManagement}
                        stateTransitions={stateTransitions}
                    />
                </div>

                {/* Right Column - Picture and Step Navigator */}
                <div className="flex-1 flex flex-col pl-6 min-h-0 overflow-hidden">
                    {/* Top Right - Picture (50% height) */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <MOStepPictureSection
                            order={order}
                            photos={photos}
                            selectedPhotoIndex={selectedPhotoIndex}
                            showingStepPhotos={showingStepPhotos}
                            onPhotoSelect={setSelectedPhotoIndex}
                            onToggleStepPhotos={() => {
                                setShowingStepPhotos(!showingStepPhotos);
                                if (!showingStepPhotos && selectedPhotoIndex === null) {
                                    setSelectedPhotoIndex(0);
                                }
                            }}
                        />
                    </div>

                    {/* Horizontal Separator */}
                    <Separator className="my-2 flex-shrink-0" />

                    {/* Bottom Right - Step Navigator (50% height with internal scrolling) */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {currentStep && (
                            <StepNavigator
                                order={order}
                                currentStepId={currentStep.id}
                                onStepChange={(stepId) => {
                                    if (onStepChange) {
                                        onStepChange(stepId);
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Loading overlay when data is refreshing */}
            {loading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm font-medium">Refreshing data...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
