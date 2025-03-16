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

interface Machine {
    id: number;
    tag: string;
    machine_type_id: number;
    description: string | null;
    nickname: string | null;
    manufacturer: string | null;
    manufacturing_year: number | null;
    area_id: number;
    photo_path: string | null;
    machine_type: MachineType | null;
    area: Area | null;
    created_at: string;
    updated_at: string;
}

interface MachineForm {
    tag: string;
    machine_type_id: number | string;
    description: string;
    nickname: string;
    manufacturer: string;
    manufacturing_year: string;
    area_id: number | string;
    photo: File | null;
    photo_path?: string | null;
    [key: string]: string | number | File | null | undefined;
}

interface MachineType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface Area {
    id: number;
    name: string;
    factory_id: number | null;
    parent_area_id: number | null;
    factory?: Factory;
    parentArea?: Area;
    created_at: string;
    updated_at: string;
}
