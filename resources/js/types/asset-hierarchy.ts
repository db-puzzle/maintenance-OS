export interface Manufacturer {
    id: number;
    name: string;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    country?: string | null;
    notes?: string | null;
}

export interface Asset {
    id: number;
    tag: string;
    serial_number: string | null;
    part_number: string | null;
    description: string | null;
    manufacturing_year: number | null;
    photo_path: string | null;
    manufacturer: Manufacturer | null;
    manufacturer_id: number | null;
    asset_type: AssetType | null;
    asset_type_id: number | null;
    area: Area | null;
    area_id: number | null;
    sector?: Sector | null;
    sector_id?: number | null;
    plant?: Plant | null;
    plant_id?: number | null;
    shift?: Shift | null;
    shift_id?: number | null;
    routines_count?: number;
    created_at: string;
    updated_at: string;
}

export interface AssetForm {
    tag: string;
    serial_number: string;
    part_number: string;
    asset_type_id: number | string;
    description: string;
    manufacturer: string;
    manufacturer_id: number | string;
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

export interface Shift {
    id: number;
    name: string;
    timezone?: string;
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
    [key: string]: string | unknown[] | undefined;
}
