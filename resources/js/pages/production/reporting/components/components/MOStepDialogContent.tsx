import React from 'react';
import { ManufacturingOrder } from '@/types/production';
import { Separator } from '@/components/ui/separator';
import { MOStepStateContent } from './MOStepStateContent';
import { MOStepPictureSection } from './MOStepPictureSection';
import { MOStepCurrentStepSection } from './MOStepCurrentStepSection';
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
}

export function MOStepDialogContent({
    stepData,
    stateTransitions,
    quantityReporting,
    photoManagement,
    order
}: MOStepDialogContentProps) {
    const { currentStep, activeExecution, stepStateInfo } = stepData;
    const { 
        selectedPhotoIndex, 
        showingStepPhotos, 
        setSelectedPhotoIndex, 
        setShowingStepPhotos,
        photos 
    } = photoManagement;

    return (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto min-h-0">
            <div className="flex min-h-[600px] gap-6">
                {/* Left - Dynamic State Content */}
                <div className="flex-1 flex flex-col pr-6 border-r">
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

                {/* Right Column - Picture and Current Step */}
                <div className="flex-1 flex flex-col gap-4 pl-6">
                    {/* Top Right - Picture */}
                    <MOStepPictureSection
                        order={order}
                        photos={photos}
                        selectedPhotoIndex={selectedPhotoIndex}
                        showingStepPhotos={showingStepPhotos}
                        onPhotoNavigate={(direction) => {
                            if (direction === 'prev') {
                                const currentIndex = selectedPhotoIndex ?? 0;
                                const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
                                setSelectedPhotoIndex(prevIndex);
                            } else {
                                const currentIndex = selectedPhotoIndex ?? 0;
                                const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
                                setSelectedPhotoIndex(nextIndex);
                            }
                        }}
                        onPhotoSelect={setSelectedPhotoIndex}
                        onToggleStepPhotos={() => {
                            setShowingStepPhotos(!showingStepPhotos);
                            if (!showingStepPhotos && selectedPhotoIndex === null) {
                                setSelectedPhotoIndex(0);
                            }
                        }}
                    />

                    {/* Horizontal Separator */}
                    <Separator className="my-2" />

                    {/* Bottom Right - Current Step */}
                    <MOStepCurrentStepSection currentStep={currentStep} />
                </div>
            </div>
        </div>
    );
}
