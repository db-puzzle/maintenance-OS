import { BaseEntity } from '@/types/shared';

export interface Plant extends BaseEntity {
    name: string;
    street?: string;
    number?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    gps_coordinates?: string;
    shift_id?: number;
    shift?: {
        id: number;
        name: string;
    };
    areas_count?: number;
    asset_count?: number;
    sectors_count?: number;
    description?: string;
}

export interface PlantForm {
    name: string;
    street: string;
    number: string;
    city: string;
    state: string;
    zip_code: string;
    gps_coordinates: string;
    shift_id: number | null;
} 