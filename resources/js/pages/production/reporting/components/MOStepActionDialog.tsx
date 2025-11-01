import React from 'react';
import { ManufacturingOrder } from '@/types/production';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Import hooks
import { useMOStepData } from './hooks/useMOStepData';
import { useMOStepStateTransitions } from './hooks/useMOStepStateTransitions';
import { useMOStepQuantityReporting } from './hooks/useMOStepQuantityReporting';
import { useMOStepPhotoManagement } from './hooks/useMOStepPhotoManagement';

// Import components
import { MOStepDialogHeader } from './components/MOStepDialogHeader';
import { MOStepDialogContent } from './components/MOStepDialogContent';
import { MOStepReasonDialog } from './dialogs/MOStepReasonDialog';
import { MOStepLabelPrintDialog } from './dialogs/MOStepLabelPrintDialog';
import { QuantityReportDialog } from './QuantityReportDialog';
import { StepPhotoCapture } from './StepPhotoCapture';
import { StepPhotoViewer } from './StepPhotoViewer';

interface MOStepActionDialogProps {
    order: ManufacturingOrder | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeStepId?: number;
    onStateChanged?: () => void;
}

/**
 * Manufacturing Order Details Dialog
 * Displays detailed execution information for routed orders with full state management
 */
export function MOStepActionDialog({
    order,
    isOpen,
    onOpenChange,
    activeStepId,
    onStateChanged
}: MOStepActionDialogProps) {
    // Use custom hooks - note the order and dependencies
    const stepData = useMOStepData(order, isOpen, activeStepId);

    const stateTransitions = useMOStepStateTransitions({
        stepData,
        order,
        onStateChanged
    });

    const quantityReporting = useMOStepQuantityReporting({
        stepData,
        order,
        onStateChanged
    });

    const photoManagement = useMOStepPhotoManagement({ stepData });

    if (!order || stepData.loading) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="!max-w-[90vw] w-[80vw] max-h-[90vh] p-0 gap-0 sm:!max-w-[90vw] flex flex-col">
                    <MOStepDialogHeader
                        order={order}
                        currentStep={stepData.currentStep}
                    />
                    <MOStepDialogContent
                        stepData={stepData}
                        stateTransitions={stateTransitions}
                        quantityReporting={quantityReporting}
                        photoManagement={photoManagement}
                        order={order}
                    />
                </DialogContent>
            </Dialog>

            {/* Sub-dialogs */}
            <MOStepReasonDialog {...stateTransitions.reasonDialog} />

            <MOStepLabelPrintDialog {...stateTransitions.labelDialog} />

            {/* Production Report Dialog */}
            <QuantityReportDialog
                isOpen={quantityReporting.productionDialog.isOpen}
                onOpenChange={quantityReporting.productionDialog.onOpenChange}
                type="production"
                maxQuantity={quantityReporting.productionDialog.maxQuantity}
                currentQuantity={quantityReporting.productionDialog.currentQuantity}
                onSubmit={quantityReporting.productionDialog.onSubmit}
                unitOfMeasure={quantityReporting.productionDialog.unitOfMeasure}
            />

            {/* Scrap Report Dialog */}
            <QuantityReportDialog
                isOpen={quantityReporting.scrapDialog.isOpen}
                onOpenChange={quantityReporting.scrapDialog.onOpenChange}
                type="scrap"
                maxQuantity={quantityReporting.scrapDialog.maxQuantity}
                currentQuantity={quantityReporting.scrapDialog.currentQuantity}
                onSubmit={quantityReporting.scrapDialog.onSubmit}
                unitOfMeasure={quantityReporting.scrapDialog.unitOfMeasure}
            />

            {/* Photo Capture Dialog */}
            {photoManagement.captureDialog.isOpen && (
                <StepPhotoCapture
                    isOpen={photoManagement.captureDialog.isOpen}
                    onClose={photoManagement.captureDialog.onClose}
                    onPhotoAdded={photoManagement.captureDialog.onPhotoAdded}
                />
            )}

            {/* Photo Viewer */}
            {photoManagement.selectedPhotoIndex !== null && photoManagement.showingStepPhotos && (
                <StepPhotoViewer
                    photos={photoManagement.photos.map(photo => ({
                        id: parseInt(photo.id) || 0,
                        url: photo.url,
                        display_url: photo.url,
                        uploaded_at: photo.uploaded_at
                    }))}
                    selectedIndex={photoManagement.selectedPhotoIndex}
                    onIndexChange={photoManagement.setSelectedPhotoIndex}
                    onDelete={(photoId) => {
                        const photo = photoManagement.photos.find(p => parseInt(p.id) === photoId);
                        if (photo) {
                            photoManagement.handleDeletePhoto(photo);
                        }
                    }}
                />
            )}
        </>
    );
}