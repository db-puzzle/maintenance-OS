// Production Module Types

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
    currentVersion?: BomVersion;
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

export interface ProductionRouting {
    id: number;
    item_id: number;
    item?: Item;
    name: string;
    description?: string;
    version: number;
    status: 'active' | 'inactive' | 'draft';
    steps?: RoutingStep[];
    created_at: string;
    updated_at: string;
}

export interface RoutingStep {
    id: number;
    routing_id: number;
    step_number: number;
    operation_code: string;
    name: string;
    description?: string;
    work_cell_id?: number;
    work_cell?: WorkCell;
    setup_time_minutes: number;
    cycle_time_minutes: number;
    notes?: string;
}

export interface ProductionOrder {
    id: number;
    order_number: string;
    item_id: number;
    item?: Item;
    quantity: number;
    unit_of_measure: string;
    status: 'planned' | 'released' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date?: string;
    actual_end_date?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ProductionExecution {
    id: number;
    order_id: number;
    order?: ProductionOrder;
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