import React from 'react';
import { router } from '@inertiajs/react';
import { WorkOrderFormComponent } from '../WorkOrderFormComponent';
import { toast } from 'sonner';

interface WorkOrderGeneralTabProps {
    workOrder?: any;
    categories: any[];
    workOrderTypes: any[];
    plants: any[];
    areas: any[];
    sectors: any[];
    assets: any[];
    forms: any[];
    discipline: 'maintenance' | 'quality';
    isCreating?: boolean;
    preselectedAssetId?: string | number;
    preselectedAsset?: any;
    onWorkOrderCreated?: () => void;
}

export default function WorkOrderGeneralTab({
    workOrder,
    categories,
    workOrderTypes,
    plants,
    areas,
    sectors,
    assets,
    forms,
    discipline,
    isCreating = false,
    preselectedAssetId,
    preselectedAsset,
    onWorkOrderCreated
}: WorkOrderGeneralTabProps) {
    const handleWorkOrderCreated = () => {
        if (onWorkOrderCreated) {
            onWorkOrderCreated();
        }
    };

    const handleWorkOrderUpdated = () => {
        toast.success('Ordem de serviço atualizada com sucesso!');
        router.reload();
    };

    return (
        <div className="py-8">
            <WorkOrderFormComponent
                workOrder={isCreating ? undefined : workOrder}
                categories={categories}
                workOrderTypes={workOrderTypes}
                plants={plants}
                areas={areas}
                sectors={sectors}
                assets={assets}
                forms={forms}
                discipline={discipline}
                initialMode={isCreating ? "edit" : "view"}
                onSuccess={isCreating ? handleWorkOrderCreated : handleWorkOrderUpdated}
                preselectedAssetId={isCreating ? preselectedAssetId : undefined}
                preselectedAsset={isCreating ? preselectedAsset : undefined}
            />
        </div>
    );
} 