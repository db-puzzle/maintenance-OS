import React from 'react';
import { Head } from '@inertiajs/react';
import { ManufacturingOrder } from '@/types/production';
import { MOStepActionDialog } from '@/pages/production/reporting/components/MOStepActionDialog';
import { router } from '@inertiajs/react';
import '@/../../css/qr-mobile.css';

interface Props {
    order: ManufacturingOrder;
    activeStepId?: number;
    canExecuteSteps: boolean;
    isMobile: boolean;
}

export default function ManufacturingOrderMobile({ order, activeStepId, canExecuteSteps }: Props) {
    const handleStateChanged = () => {
        // Reload the page to get updated order data
        router.reload({ only: ['order'] });
    };

    const handleDialogClose = () => {
        // On mobile, closing the dialog doesn't make sense as it's the entire page
        // Instead, we could redirect to home or show a different view
        // For now, we'll keep it open
    };

    return (
        <>
            <Head title={`MO: ${order.order_number}`} />
            
            {/* Mobile optimized wrapper - no navigation or sidebars */}
            <div className="min-h-screen bg-background qr-mobile-page">
                {/* The dialog will render in "standalone" mode taking full viewport */}
                <MOStepActionDialog
                    order={order}
                    isOpen={true}
                    onOpenChange={handleDialogClose}
                    activeStepId={activeStepId}
                    onStateChanged={handleStateChanged}
                />
            </div>
        </>
    );
}
