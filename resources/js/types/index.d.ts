import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    activePattern?: RegExp;
    items?: Omit<NavItem, 'icon' | 'items'>[];
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Equipment {
    id: number;
    tag: string;
    serial_number: string | null;
    equipment_type_id: number;
    description: string | null;
    manufacturer: string | null;
    manufacturing_year: number | null;
    area_id: number;
    photo_path: string | null;
    equipment_type: EquipmentType | null;
    area: Area | null;
    created_at: string;
    updated_at: string;
}

export interface EquipmentForm {
    tag: string;
    serial_number: string;
    equipment_type_id: number | string;
    description: string;
    manufacturer: string;
    manufacturing_year: string;
    area_id: number | string;
    photo: File | null;
    photo_path?: string | null;
    [key: string]: string | number | File | null | undefined;
}

export interface EquipmentType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface EquipmentTypeForm {
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
    created_at: string;
    updated_at: string;
}

export interface Sector {
    id: number;
    name: string;
    area_id: number;
    area: Area;
    created_at: string;
    updated_at: string;
}

export interface SectorForm {
    name: string;
    area_id: string;
    [key: string]: string | undefined;
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
