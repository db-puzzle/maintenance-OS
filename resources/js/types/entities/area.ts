import { BaseEntity } from '../shared';

export interface Area extends BaseEntity {
    name: string;
    description: string | null;
    plant_id: number | null;
    plant?: {
        id: number;
        name: string;
    } | null;
    asset_count?: number;
    sectors_count?: number;
}

export interface AreaForm {
    name: string;
    description: string;
    plant_id: number | null;
    shift_id: number | null;
}
