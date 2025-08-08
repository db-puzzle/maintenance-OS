// Production Module Types

import { User } from '@/types';
import { Shift, Manufacturer } from './asset-hierarchy';
import { Plant } from './entities/plant';
import { Area } from './entities/area';
import { Sector } from './entities/sector';

export interface ItemCategory {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    items_count?: number;
    created_by?: number;
    createdBy?: User;
    created_at: string;
    updated_at: string;
}

export interface ItemImage {
    id: string;
    item_id: number;
    filename: string;
    storage_path: string;
    url: string;
    thumbnail_url?: string;
    medium_url?: string;
    large_url?: string;
    mime_type: string;
    file_size: number;
    width: number;
    height: number;
    is_primary: boolean;
    display_order: number;
    alt_text?: string;
    caption?: string;
    metadata?: Record<string, unknown>;
    uploaded_by: string;
    created_at: string;
    updated_at: string;
}

export interface Item {
    id: number;
    code: string;
    item_number: string;
    name: string;
    description?: string;
    item_category_id?: number;
    category?: ItemCategory;
    unit_id?: number;
    unit?: {
        id: number;
        name: string;
        abbreviation: string;
    };
    // item_type: 'manufactured' | 'purchased' | 'manufactured-purchased' | 'phantom' | 'service'; // DEPRECATED - now determined by capabilities
    can_be_sold: boolean;
    can_be_purchased: boolean;
    can_be_manufactured: boolean;
    is_phantom: boolean;
    is_active: boolean;
    status: 'active' | 'inactive' | 'prototype' | 'discontinued';
    unit_of_measure: string;
    weight?: number;
    list_price?: number;
    manufacturing_cost?: number;
    manufacturing_lead_time_days: number;
    purchase_price?: number;
    purchase_lead_time_days: number;
    preferred_vendor?: string;
    vendor_item_number?: string;
    primary_bom?: BillOfMaterial;
    images?: ItemImage[];
    images_count?: number;
    primary_image_url?: string;
    primary_image_thumbnail_url?: string;
    created_by?: User;
    created_at: string;
    updated_at: string;
}

export interface BillOfMaterial {
    id: number;
    bom_number: string;
    name: string;
    description?: string;
    external_reference?: string;
    output_item_id: number;
    output_item?: Item;
    is_active: boolean;
    created_by?: number;
    current_version?: BomVersion;
    versions?: BomVersion[];
    versions_count?: number;
    created_at: string;
    updated_at: string;
}

export interface BomVersion {
    id: number;
    bill_of_material_id: number;
    version_number: number;
    revision_notes?: string;
    published_at: string;
    published_by?: number;
    is_current: boolean;
    items?: BomItem[];
    created_at: string;
    updated_at: string;
}

export interface BomItem {
    id: number;
    bom_version_id: number;
    parent_item_id?: number;
    item_id: number;
    item?: Item;
    quantity: number;
    unit_of_measure: string;
    level: number;
    sequence_number?: number;
    reference_designators?: string;
    bom_notes?: string;
    thumbnail_path?: string;
    model_file_path?: string;
    qr_code?: string;
    qr_generated_at?: string;
    children?: BomItem[];
    created_at: string;
    updated_at: string;
}

export interface WorkCell {
    id: number;
    name: string;
    code?: string;
    description?: string;
    cell_type: 'internal' | 'external';
    status?: 'active' | 'maintenance' | 'inactive';
    available_hours_per_day: number;
    efficiency_percentage: number;
    shift_id?: number;
    shift?: Shift;
    plant_id?: number;
    plant?: Plant;
    area_id?: number;
    area?: Area;
    sector_id?: number;
    sector?: Sector;
    manufacturer_id?: number;
    manufacturer?: Manufacturer;
    is_active: boolean;
    routing_steps_count?: number;
    production_schedules_count?: number;
    created_at: string;
    updated_at: string;
}

export interface ManufacturingOrder {
    id: number;
    order_number: string;
    parent_id?: number;
    parent?: ManufacturingOrder;
    item_id: number;
    item?: Item;
    bill_of_material_id?: number;
    bill_of_material?: BillOfMaterial;
    quantity: number;
    quantity_completed: number;
    quantity_scrapped: number;
    unit_of_measure: string;
    status: 'draft' | 'planned' | 'released' | 'in_progress' | 'completed' | 'cancelled';
    priority: number;
    child_orders_count: number;
    completed_child_orders_count: number;
    auto_complete_on_children: boolean;
    requested_date?: string;
    planned_start_date?: string;
    planned_end_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;

    source_type?: 'manual' | 'sales_order' | 'forecast';
    source_reference?: string;
    children?: ManufacturingOrder[];
    manufacturing_route?: ManufacturingRoute;
    route?: ManufacturingRoute;
    has_route?: boolean;
    created_by?: number;
    created_by_user?: User;
    created_at: string;
    updated_at: string;
}

export interface RouteTemplate {
    id: number;
    name: string;
    description?: string;
    item_category?: string;
    is_active: boolean;
    steps?: RouteTemplateStep[];
    steps_count: number;
    estimated_time: number;
    usage_count: number;
    last_used_at?: string;
    created_by?: number;
    created_by_user?: User;
    created_at: string;
    updated_at: string;
}

export interface RouteTemplateStep {
    id: number;
    route_template_id: number;
    step_number: number;
    step_type: 'standard' | 'quality_check' | 'rework';
    name: string;
    description?: string;
    setup_time_minutes: number;
    cycle_time_minutes: number;
    work_cell_id?: number;
    work_cell?: WorkCell;
    form_id?: number;
    quality_check_mode?: 'every_part' | 'entire_lot' | 'sampling';
    sampling_size?: number;
}

export interface ManufacturingRoute {
    id: number;
    manufacturing_order_id: number;
    manufacturing_order?: ManufacturingOrder;
    item_id: number;
    item?: Item;
    route_template_id?: number;
    route_template?: RouteTemplate;
    name: string;
    description?: string;
    is_active: boolean;
    steps?: ManufacturingStep[];
    steps_count?: number;
    created_by?: number;
    created_by_user?: User;
    created_at: string;
    updated_at: string;
}

export interface ManufacturingStep {
    id: number;
    manufacturing_route_id: number;
    step_number: number;
    step_type: 'standard' | 'quality_check' | 'rework';
    name: string;
    description?: string;
    work_cell_id?: number;
    work_cell?: WorkCell;
    status: 'pending' | 'queued' | 'in_progress' | 'on_hold' | 'completed' | 'skipped';
    form_id?: number;
    form_version_id?: number;
    setup_time_minutes: number;
    cycle_time_minutes: number;
    actual_start_time?: string;
    actual_end_time?: string;
    quality_result?: 'pending' | 'passed' | 'failed';
    failure_action?: 'scrap' | 'rework';
    quality_check_mode?: 'every_part' | 'entire_lot' | 'sampling';
    sampling_size?: number;
    depends_on_step_id?: number;
    can_start_when_dependency?: 'completed';
    executions?: ManufacturingStepExecution[];
}

export interface ProductionSchedule {
    id: number;
    manufacturing_order_id: number;
    manufacturing_order?: ManufacturingOrder;
    manufacturing_step_id: number;
    manufacturing_step?: ManufacturingStep;
    work_cell_id: number;
    work_cell?: WorkCell;
    scheduled_start: string;
    scheduled_end: string;
    actual_start?: string;
    actual_end?: string;
    status: 'scheduled' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
}

export interface ManufacturingStepExecution {
    id: number;
    manufacturing_step_id: number;
    manufacturing_order_id: number;
    part_number?: number;
    total_parts?: number;
    status: 'queued' | 'in_progress' | 'on_hold' | 'completed';
    started_at?: string;
    completed_at?: string;
    on_hold_at?: string;
    resumed_at?: string;
    total_hold_duration: number;
    executed_by?: number;
    executed_by_user?: User;
    work_cell_id?: number;
    work_cell?: WorkCell;
    quality_result?: 'passed' | 'failed';
    quality_notes?: string;
    failure_action?: 'scrap' | 'rework';
    form_execution_id?: number;
}

export interface ProductionExecution {
    id: number;
    order_id: number;
    order?: ManufacturingOrder;
    work_cell_id: number;
    work_cell?: WorkCell;
    operator_id?: number;
    quantity_completed: number;
    quantity_rejected: number;
    started_at: string;
    completed_at?: string;
    status: 'in_progress' | 'paused' | 'completed' | 'cancelled';
}

export interface Shipment {
    id: number;
    shipment_number: string;
    destination_name: string;
    destination_address: string;
    carrier?: string;
    tracking_number?: string;
    status: 'preparing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
    shipped_at?: string;
    delivered_at?: string;
    items?: ShipmentItem[];
    photos?: ShipmentPhoto[];
    created_at: string;
    updated_at: string;
}

export interface ShipmentItem {
    id: number;
    shipment_id: number;
    item_id: number;
    item?: Item;
    quantity: number;
    unit_of_measure: string;
}

export interface ShipmentPhoto {
    id: number;
    shipment_id: number;
    path: string;
    caption?: string;
    uploaded_at: string;
}

// Alias for backward compatibility - Routing is now RouteTemplate
export type Routing = RouteTemplate;
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
