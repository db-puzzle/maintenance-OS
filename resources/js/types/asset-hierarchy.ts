export interface Asset {
    id: number;
    tag: string;
    serial_number: string | null;
    asset_type_id: number;
    description: string | null;
    manufacturer: string | null;
    manufacturing_year: number | null;
    area_id: number;
    photo_path: string | null;
    asset_type: AssetType | null;
    area: Area | null;
    sector?: Sector | null;
    plant?: Plant | null;
    sector_id?: number;
    plant_id?: number;
    created_at: string;
    updated_at: string;
}

export interface AssetForm {
    tag: string;
    serial_number: string;
    asset_type_id: number | string;
    description: string;
    manufacturer: string;
    manufacturing_year: string;
    area_id: number | string;
    plant_id?: number | string;
    sector_id?: number | string;
    photo: File | null;
    photo_path?: string | null;
    [key: string]: string | number | File | null | undefined;
}

export interface AssetType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface AssetTypeForm {
    name: string;
    description: string;
    [key: string]: string | undefined;
}

export interface Area {
    id: number;
    name: string;
    factory_id: number | null;
    parent_area_id: number | null;
    factory?: Factory;
    parentArea?: Area;
    sectors?: Sector[];
    plant?: Plant;
    created_at: string;
    updated_at: string;
}

export interface Sector {
    id: number;
    name: string;
    area_id: number;
    area: Area;
    plant?: Plant;
    created_at: string;
    updated_at: string;
}

export interface SectorForm {
    name: string;
    area_id: string;
    [key: string]: string | undefined;
}

export interface Plant {
    id: number;
    name: string;
    description?: string | null;
    areas?: Area[];
    created_at?: string;
    updated_at?: string;
}

export interface Factory {
    id: number;
    name: string;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface ShiftForm {
    name: string;
    plant_id: string;
    schedules: {
        weekday: string;
        shifts: {
            start_time: string;
            end_time: string;
            active: boolean;
            breaks: {
                start_time: string;
                end_time: string;
            }[];
        }[];
    }[];
    [key: string]: any;
} 