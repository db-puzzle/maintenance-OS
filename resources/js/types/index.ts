export interface MachineType {
    id: number;
    name: string;
}

export interface Area {
    id: number;
    name: string;
    plant?: Plant;
    sectors?: Sector[];
}

export interface Equipment {
    id: number;
    tag: string;
    serial_number?: string;
    machine_type_id: number;
    description?: string;
    manufacturer?: string;
    manufacturing_year?: number;
    area_id: number;
    sector_id?: number;
    photo_path?: string;
    machine_type?: MachineType;
    area?: Area;
    sector?: Sector;
}

export interface EquipmentForm {
    tag: string;
    serial_number: string;
    machine_type_id: string;
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
    description: string | null;
    area_id: number;
    area: Area & {
        plant: Plant;
    };
    equipment_count?: number;
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
    description?: string;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
} 