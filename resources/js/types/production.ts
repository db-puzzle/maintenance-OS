// Production Module Types

import { User } from '@/types';

export interface Item {
    id: number;
    item_number: string;
    name: string;
    description?: string;
    category: string;
    item_type: 'manufactured' | 'purchased' | 'manufactured-purchased';
    can_be_sold: boolean;
    can_be_purchased: boolean;
    can_be_manufactured: boolean;
    is_active: boolean;
    status: 'active' | 'inactive' | 'prototype' | 'discontinued';
    unit_of_measure: string;
    weight?: number;
    list_price?: number;
    cost?: number;
    lead_time_days: number;
    preferred_vendor?: string;
    vendor_item_number?: string;
    current_bom?: BillOfMaterial;
    current_bom_id?: number;
    created_at: string;
    updated_at: string;
}

export interface BillOfMaterial {
    id: number;
    bom_number: string;
    name: string;
    description?: string;
    external_reference?: string;
    is_active: boolean;
    created_by?: number;
    current_version?: BomVersion;
    versions?: BomVersion[];
    versions_count?: number;
    item_masters_count?: number;
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
    bom_notes?: any;
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
    code: string;
    name: string;
    description?: string;
    capacity: number;
    status: 'active' | 'inactive' | 'maintenance';
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
    production_order_id: number;
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
    can_start_when_dependency?: 'completed' | 'in_progress';
    executions?: ManufacturingStepExecution[];
}

export interface ManufacturingStepExecution {
    id: number;
    manufacturing_step_id: number;
    production_order_id: number;
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