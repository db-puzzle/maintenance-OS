import { BaseEntity } from '../shared';

export interface Sector extends BaseEntity {
    name: string;
    description?: string | null;
    area_id: number;
    area?: {
        id: number;
        name: string;
        plant?: {
            id: number;
            name: string;
        };
    };
    asset_count?: number;
}

export interface SectorForm {
    name: string;
    area_id: number | null;
    shift_id: number | null;
}
