import { type ReactNode } from 'react';

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
    plant_id: number;
    area_id?: number;
    sector_id?: number;
    equipment_type?: EquipmentType;
    plant?: Plant;
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
    plant_id: string;
    area_id: string;
    sector_id?: string;
    photo: File | null;
    photo_path?: string | null;
    [key: string]: string | File | null | undefined;
}

export interface Sector {
    id: number;
    name: string;
    area_id: number;
    area?: Area & { plant: Plant };
}

export interface SectorForm {
    name: string;
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
    href?: string;
}

export interface NavItem {
    title: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }> | (() => ReactNode);
    activePattern?: RegExp;
} 