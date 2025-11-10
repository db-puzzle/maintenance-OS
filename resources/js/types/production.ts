// Production Module Types

import { User } from '@/types/index';
import { Shift, Manufacturer } from './asset-hierarchy';
import { Plant } from './entities/plant';
import { Area } from './entities/area';
import { Sector } from './entities/sector';
import { Form } from './work-order';
import { Media } from './media';

export interface ItemCategory {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    items_count?: number;
    has_route_template?: boolean;
    route_templates_count?: number;
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
    hash?: string;
    blurhash?: string;
    alt_text?: string;
    caption?: string;
    metadata?: Record<string, unknown>;
    uploaded_by: string;
    created_at: string;
    updated_at: string;
    is_primary?: boolean;
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
    image?: ItemImage;  // Single image instead of array
    media?: Array<{
        uuid: string;
        name: string;
        file_name: string;
        mime_type: string;
        size: number;
        blurhash?: string;
        responsive_images?: {
            preview?: {
                urls: string[];
            };
            thumb?: {
                urls: string[];
            };
        };
        original_url: string;
        preview_url?: string;
    }>;
    primary_image_id?: string;
    primary_image_url?: string;
    primary_image_data?: { url: string; blurhash?: string | null };
    primary_image_thumbnail_url?: string;
    thumbnail_url?: string; // Generic thumbnail URL fallback
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

export interface UnitOfMeasure {
    id: number;
    code: string;
    name: string;
    symbol?: string;
    uom_type: 'COUNT' | 'MASS' | 'LENGTH' | 'AREA' | 'VOLUME' | 'TIME';
    is_base_unit: boolean;
    base_unit_id?: number;
    base_unit?: UnitOfMeasure;
    conversion_to_base: number;
    decimal_places: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkCell {
    id: number;
    name: string;
    description?: string;
    cell_type: 'internal' | 'external';
    has_finite_capacity: boolean;
    default_production_rate_per_hour?: number;
    default_unit_of_measure: string;
    default_setup_time_minutes: number;
    max_parallel_executions: number;
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
    item_rates?: WorkCellItemRate[];
    constraints?: WorkCellConstraint[];
    capacity_bookings?: WorkCellCapacityBooking[];
    parallel_resources?: WorkCellParallelResource[];
    created_at: string;
    updated_at: string;
}

export interface WorkCellItemRate {
    id: number;
    work_cell_id: number;
    work_cell?: WorkCell;
    item_id: number;
    item?: Item;
    setup_time_minutes: number;
    production_rate_per_hour: number;
    unit_of_measure: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkCellConstraint {
    id: number;
    work_cell_id: number;
    work_cell?: WorkCell;
    constraint_type: 'maintenance' | 'training' | 'audit' | 'holiday' | 'other';
    start_datetime: string;
    end_datetime: string;
    is_recurring: boolean;
    recurrence_pattern?: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkCellCapacityBooking {
    id: number;
    work_cell_id: number;
    work_cell?: WorkCell;
    manufacturing_step_id: number;
    manufacturing_step?: ManufacturingStep;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    time_minutes: number;
    parallel_slot: number;
    quantity?: number;
    unit_of_measure?: string;
    status: 'reserved' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
}

export interface WorkCellParallelResource {
    id: number;
    work_cell_id: number;
    work_cell?: WorkCell;
    shift_id?: number;
    shift?: Shift;
    resource_date: string;
    available_count: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkUnitsBreakdown {
    order_id: number;
    order_number: string;
    expected_units: number;
    completed_units: number;
    step_count?: number;
    progress: number;
    children: WorkUnitsBreakdown[];
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
    unit_of_measure_code?: string;
    status: 'draft' | 'planned' | 'scheduled' | 'released' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    canRevertStatus?: boolean;
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

    // Progressive flow fields
    dependency_type?: 'none' | 'all_children_released' | 'children_quantity' | 'children_percentage' | 'progressive';
    dependency_minimum_quantity?: number;
    dependency_minimum_percentage?: number;
    can_release_before_children?: boolean;
    cumulative_children_quantity_completed?: number;
    cumulative_children_quantity_required?: number;
    work_in_progress_quantity?: number;

    // Smart progress fields
    smart_progress_percentage?: number;
    progress_calculated_at?: string;
    smart_progress?: number; // Alias for convenience
    work_units_breakdown?: WorkUnitsBreakdown;

    children?: ManufacturingOrder[];
    manufacturing_route?: ManufacturingRoute;
    route?: ManufacturingRoute;
    has_route?: boolean;
    activeExecution?: ManufacturingStepExecution;
    current_step?: ManufacturingStep;
    progress_percentage?: number;
    quantity_remaining?: number;
    created_by?: number;
    created_by_user?: User;
    createdBy?: User;
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
    display_position?: number; // Add computed field
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
    // Child order dependency fields
    child_order_dependency_type?: 'none' | 'all_children_completed' | 'children_quantity';
    child_order_minimum_quantity?: number;
    depends_on_step_id?: number;
}

export interface ManufacturingRoute {
    id: number;
    manufacturing_order_id?: number | null;
    manufacturing_order?: ManufacturingOrder;
    item_id?: number | null;
    item?: Item;
    route_template_id?: number;
    route_template?: RouteTemplate;
    template_source_id?: number | null;
    template_source?: ManufacturingRoute;
    name: string;
    description?: string;
    is_active: boolean;
    is_template?: boolean;
    item_category_id?: number | null;
    item_category?: ItemCategory;
    template_metadata?: {
        tags?: string[];
        [key: string]: unknown;
    };
    steps?: ManufacturingStep[];
    steps_count?: number;
    usage_count?: number;
    derived_routes_count?: number;
    current_active_step?: ManufacturingStep;
    created_by?: number;
    created_by_user?: User;
    created_at: string;
    updated_at: string;
}

export interface ManufacturingStep {
    id: number;
    manufacturing_route_id: number;
    display_position?: number; // Add computed field
    step_type: 'standard' | 'quality_check' | 'rework';
    name: string;
    description?: string;
    work_cell_id?: number;
    work_cell?: WorkCell;
    status: 'pending' | 'queued' | 'in_progress' | 'on_hold' | 'completed' | 'skipped' | 'failed';
    form_id?: number;
    form?: Form;
    form_version_id?: number;
    setup_time_minutes: number;
    cycle_time_minutes: number;
    setup_time_seconds?: number;
    cycle_time_seconds?: number;
    use_workcell_throughput?: boolean;
    actual_start_time?: string;
    actual_end_time?: string;
    actual_duration_minutes?: number;
    quality_result?: 'pending' | 'passed' | 'failed';
    failure_action?: 'scrap' | 'rework';
    quality_check_mode?: 'every_part' | 'entire_lot' | 'sampling';
    sampling_size?: number;
    depends_on_step_id?: number;
    can_start_when_dependency?: 'completed';
    // Progressive flow fields
    dependency_start_condition?: 'completed' | 'quantity_based' | 'percentage_based' | 'immediate';
    dependency_minimum_quantity?: number;
    dependency_minimum_percentage?: number;
    cumulative_quantity_completed?: number;
    cumulative_quantity_scrapped?: number;
    // Child order dependency fields
    child_order_dependency_type?: 'none' | 'all_children_completed' | 'children_quantity';
    child_order_minimum_quantity?: number;
    dependencies?: ManufacturingStep[];
    executions?: ManufacturingStepExecution[];
    current_execution?: ManufacturingStepExecution;
    // Scheduling fields
    scheduled_start?: string;
    scheduled_end?: string;
    manufacturing_route?: ManufacturingRoute;
    next_step?: ManufacturingStep;
    // Runtime properties for UI
    can_start?: boolean;
    cannot_start_reason?: string;
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
    progress_percentage?: number;
    actual_duration_minutes?: number;
    // Progressive flow fields
    quantity_completed?: number;
    quantity_scrapped?: number;
    // New fields for enhanced tracking
    production_notes?: string;
    scrap_reason?: string;
    time_spent_minutes?: number;
    photo_count?: number;
    last_photo_at?: string;
    hold_reason?: string;
    hold_notes?: string;
    media?: Media[];
    manufacturingStep?: ManufacturingStep;
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
