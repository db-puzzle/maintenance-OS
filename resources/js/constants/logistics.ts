// Logistics Module Constants

export const SHIPMENT_STATUSES = {
    planned: 'Planned',
    packed: 'Packed',
    shipped: 'Shipped',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    received: 'Received',
} as const;

export const SHIPMENT_STATUS_COLORS = {
    planned: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    packed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    in_transit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    received: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
} as const;

export const DESTINATION_TYPES = {
    manufacturer: 'External Manufacturer',
    customer: 'Customer',
    warehouse: 'Warehouse',
    work_cell: 'Work Cell',
} as const;

export const SHIPPING_METHODS = {
    courier: 'Courier',
    freight: 'Freight',
    pickup: 'Pickup',
    internal: 'Internal Transfer',
    other: 'Other',
} as const;

export const PACKAGE_TYPES = {
    box: 'Box',
    pallet: 'Pallet',
    crate: 'Crate',
    bag: 'Bag',
    other: 'Other',
} as const;

