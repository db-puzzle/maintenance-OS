import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User | null;
    permissions: string[];
    roles: string[];
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
    flash?: {
        success?: string;
        error?: string;
        warning?: string;
        info?: string;
    };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    timezone?: string | null;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    permissions?: string[]; // Array of permission names
    roles?: Array<{ id: number; name: string }>; // User roles
    [key: string]: unknown; // This allows for additional properties...
}

export interface PageProps {
    auth: Auth;
    [key: string]: unknown;
}

export interface WorkCell {
    id: number;
    name: string;
    code?: string;
    description?: string;
    type?: string;
    capacity?: number;
    is_active: boolean;
    utilization?: number;
}

export interface ManufacturingOrder {
    id: number;
    order_number: string;
    source_reference?: string;
    quantity: number;
    unit_of_measure: string;
    status: string;
    planned_start_date?: string;
    actual_start_date?: string;
    parent_order_id?: number | null;
    item_id?: number;
    item?: {
        id: number;
        name: string;
        item_number: string;
        primary_image_url?: string;
        primary_image_thumbnail_url?: string;
        images?: { id: number; item_id: number; image_url: string }[];
        sector?: {
            id: number;
            name: string;
            area: {
                id: number;
                name: string;
                plant: {
                    id: number;
                    name: string;
                };
            };
        };
    };
    manufacturing_route?: {
        id: number;
        name: string;
        steps?: Array<{
            id: number;
            sequence: number;
            name: string;
            work_cell_id?: number | null;
            is_required?: boolean;
            setup_time_minutes?: number;
            cycle_time_minutes?: number;
        }>;
    };
    manufacturingRoute?: {
        id: number;
        name: string;
        steps?: Array<{
            id: number;
            sequence: number;
            name: string;
            work_cell_id?: number | null;
            is_required?: boolean;
            setup_time_minutes?: number;
            cycle_time_minutes?: number;
        }>;
    };
    children?: ManufacturingOrder[];
}
