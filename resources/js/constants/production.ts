// Production Module Constants

export const EXECUTION_LOCATIONS = {
    internal: 'Internal',
    external: 'External',
} as const;

export const EXTERNAL_STATUSES = {
    awaiting_shipment: 'Awaiting Shipment',
    shipped: 'Shipped',
    in_process: 'In Process at Manufacturer',
} as const;

export const EXTERNAL_STATUS_COLORS = {
    awaiting_shipment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    in_process: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
} as const;

// For step completion status (same for internal and external steps)
export const STEP_STATUSES = {
    pending: 'Pending',
    queued: 'Queued',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    awaiting_quality: 'Awaiting Quality',
    completed: 'Completed',
    skipped: 'Skipped',
    cancelled: 'Cancelled',
} as const;

export const STEP_STATUS_COLORS = {
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    queued: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    awaiting_quality: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    skipped: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
} as const;

