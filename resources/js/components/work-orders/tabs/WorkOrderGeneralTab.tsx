import React from 'react';
import { router } from '@inertiajs/react';
import { WorkOrderFormComponent } from '@/components/work-orders';
import { toast } from 'sonner';
import type { WorkOrder, WorkOrderCategory, WorkOrderType } from '@/types/work-order';
import type { Plant } from '@/types/entities/plant';
import type { Area } from '@/types/entities/area';
import type { Sector } from '@/types/entities/sector';
import type { Asset } from '@/types/asset-hierarchy';
import type { Form } from '@/types/work-order';

interface WorkOrderGeneralTabProps {
    workOrder?: WorkOrder;
    categories: WorkOrderCategory[];
    workOrderTypes: WorkOrderType[];
    plants: Plant[];
    areas: Area[];
    sectors: Sector[];
    assets: Asset[];
    forms: Form[];
    discipline: 'maintenance' | 'quality';
    isCreating?: boolean;
    preselectedAssetId?: string | number;
    preselectedAsset?: Asset;
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
                workOrderTypes={workOrderTypes.map(type => ({
                    ...type,
                    category: type.work_order_category?.name || ''
                }))}
                plants={plants}
                areas={areas.filter(area => area.plant_id !== null).map(area => ({
                    id: area.id,
                    name: area.name,
                    plant_id: area.plant_id as number
                }))}
                sectors={sectors}
                assets={assets.map(asset => ({
                    id: asset.id,
                    tag: asset.tag,
                    name: asset.description || asset.tag,
                    plant_id: asset.plant_id || 0,
                    area_id: asset.area_id || 0,
                    sector_id: asset.sector_id ?? undefined
                }))}
                forms={forms}
                discipline={discipline}
                initialMode={isCreating ? "edit" : "view"}
                onSuccess={isCreating ? handleWorkOrderCreated : handleWorkOrderUpdated}
                preselectedAssetId={isCreating ? preselectedAssetId : undefined}
                preselectedAsset={isCreating && preselectedAsset ? {
                    id: preselectedAsset.id,
                    tag: preselectedAsset.tag,
                    name: preselectedAsset.description || preselectedAsset.tag,
                    plant_id: preselectedAsset.plant_id || 0,
                    area_id: preselectedAsset.area_id || 0,
                    sector_id: preselectedAsset.sector_id ?? undefined
                } : undefined}
            />
        </div>
    );
} 