import { BaseEntity } from '@/types/shared';

export interface AssetType extends BaseEntity {
    name: string;
    description?: string;
    asset_count?: number;
}

export interface AssetTypeForm {
    name: string;
    description: string;
} 