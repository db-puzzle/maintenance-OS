import { ManufacturingOrder, ManufacturingStep } from './production';
import { User } from './user';
import { Manufacturer } from './asset-hierarchy';

/**
 * Shipment status types.
 */
export type ShipmentStatus =
    | 'planned'
    | 'packed'
    | 'shipped'
    | 'in_transit'
    | 'delivered'
    | 'received';

/**
 * Destination type for shipments.
 */
export type DestinationType =
    | 'manufacturer'
    | 'customer'
    | 'warehouse'
    | 'work_cell';

/**
 * Shipping method types.
 */
export type ShippingMethod =
    | 'courier'
    | 'freight'
    | 'pickup'
    | 'internal'
    | 'other';

/**
 * Package type for shipment items.
 */
export type PackageType =
    | 'box'
    | 'pallet'
    | 'crate'
    | 'bag'
    | 'other';

/**
 * Shipment model interface.
 */
export interface Shipment {
    id: number;
    shipment_number: string;

    destination_type: DestinationType;
    destination_id: number | null;
    destination_name: string | null;
    destination_address: string | null;
    destination?: Manufacturer | unknown; // Polymorphic

    shipping_method: ShippingMethod;
    carrier_name: string | null;
    tracking_number: string | null;

    planned_ship_date: string | null;
    actual_ship_date: string | null;
    expected_delivery_date: string | null;
    actual_delivery_date: string | null;

    status: ShipmentStatus;

    packing_list_generated: boolean;
    packing_list_path: string | null;

    shipping_notes: string | null;
    receiving_notes: string | null;

    created_by: number | null;
    shipped_by: number | null;
    received_by: number | null;

    createdBy?: User;
    shipper?: User;
    receiver?: User;

    items?: ShipmentItem[];
    photos?: ShipmentPhoto[];

    total_items: number;
    is_overdue: boolean;

    created_at: string;
    updated_at: string;
}

/**
 * Shipment item model interface.
 */
export interface ShipmentItem {
    id: number;
    shipment_id: number;

    manufacturing_order_id: number;
    manufacturing_order?: ManufacturingOrder;

    manufacturing_step_id: number | null;
    manufacturing_step?: ManufacturingStep;

    quantity_shipped: number;
    quantity_received: number;
    quantity_rejected: number;

    item_code: string | null;
    item_name: string | null;
    item_description: string | null;

    package_count: number | null;
    package_type: PackageType | null;

    notes: string | null;
    rejection_reason: string | null;

    is_fully_received: boolean;
    quantity_pending: number;

    created_at: string;
    updated_at: string;
}

/**
 * Shipment photo interface.
 */
export interface ShipmentPhoto {
    id: number;
    shipment_id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    custom_properties?: {
        type?: 'pre_shipment' | 'post_receipt';
        taken_by?: number;
        notes?: string;
    };
    created_at: string;
}

/**
 * Shipment suggestion interface for smart bundling.
 */
export interface ShipmentSuggestion {
    manufacturer_id: number;
    manufacturer: Manufacturer;
    planned_ship_date: string | null;
    steps: ManufacturingStep[];
    total_orders: number;
}

/**
 * Data for creating a new shipment.
 */
export interface CreateShipmentData {
    destination_type: DestinationType;
    destination_id?: number;
    destination_name?: string;
    destination_address?: string;
    shipping_method?: ShippingMethod;
    carrier_name?: string;
    planned_ship_date?: string;
    expected_delivery_date?: string;
    shipping_notes?: string;
    items: CreateShipmentItem[];
}

/**
 * Shipment item data for creation.
 */
export interface CreateShipmentItem {
    manufacturing_order_id: number;
    manufacturing_step_id?: number;
    quantity: number;
    package_count?: number;
    package_type?: PackageType;
    notes?: string;
}

/**
 * Data for marking shipment as shipped.
 */
export interface MarkShippedData {
    tracking_number?: string;
    carrier_name?: string;
    photo_notes?: string;
    photos?: File[];
}

/**
 * Data for marking shipment as received.
 */
export interface MarkReceivedData {
    receiving_notes?: string;
    items: ReceiptItem[];
    photos?: File[];
}

/**
 * Receipt data for individual items.
 */
export interface ReceiptItem {
    item_id: number;
    quantity_received: number;
    quantity_rejected?: number;
    rejection_reason?: string;
}

/**
 * MO details for shipment creation.
 */
export interface MoForShipment {
    id: number;
    order_number: string;
    item_name: string;
    quantity: number;
    has_external_steps_awaiting_shipment: boolean;
    external_steps?: ManufacturingStep[];
}
