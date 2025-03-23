export interface Area {
    id: number;
    name: string;
    plant_id: number;
    plant?: Plant;
    sectors: Sector[];
}

export interface EquipmentType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface Equipment {
    id: number;
    tag: string;
    description?: string;
    serial_number?: string;
    manufacturer?: string;
    manufacturing_year?: number;
    photo_path?: string;
    equipment_type_id: number;
    area_id: number;
    sector_id?: number;
    equipment_type?: EquipmentType;
    area?: Area & { plant: Plant };
    sector?: Sector;
}

export interface EquipmentForm {
    tag: string;
    serial_number: string;
    equipment_type_id: string;
    description: string;
    manufacturer: string;
    manufacturing_year: string;
    area_id: string;
    sector_id?: string;
    photo: File | null;
    photo_path?: string | null;
}

export interface Sector {
    id: number;
    name: string;
    description?: string;
    area_id: number;
}

export interface SectorForm {
    name: string;
    description: string;
    area_id: string;
    [key: string]: string;
}

export interface Plant {
    id: number;
    name: string;
    areas: Area[];
}

export interface BreadcrumbItem {
    title: string;
    href: string;
} 