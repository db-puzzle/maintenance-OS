import { BaseEntity } from '@/types/shared';

export interface Manufacturer extends BaseEntity {
    name: string;
    website?: string;
    email?: string;
    phone?: string;
    country?: string;
    notes?: string;
    asset_count?: number;
}

export interface ManufacturerForm {
    name: string;
    website: string;
    email: string;
    phone: string;
    country: string;
    notes: string;
}
