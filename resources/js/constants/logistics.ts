import { ShipmentStatus, DestinationType, ShippingMethod, PackageType } from '../types/logistics';

/**
 * Shipment status configuration with labels and colors.
 */
export const SHIPMENT_STATUSES: Record<ShipmentStatus, { label: string; color: string }> = {
    planned: {
        label: 'Planejado',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    },
    packed: {
        label: 'Embalado',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    shipped: {
        label: 'Enviado',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    },
    in_transit: {
        label: 'Em Trânsito',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    delivered: {
        label: 'Entregue',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    received: {
        label: 'Recebido',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
};

/**
 * Destination type labels.
 */
export const DESTINATION_TYPES: Record<DestinationType, string> = {
    manufacturer: 'Fabricante Externo',
    customer: 'Cliente',
    warehouse: 'Armazém',
    work_cell: 'Célula de Trabalho',
};

/**
 * Shipping method labels.
 */
export const SHIPPING_METHODS: Record<ShippingMethod, string> = {
    courier: 'Correio/Transportadora',
    freight: 'Frete',
    pickup: 'Retirada',
    internal: 'Transferência Interna',
    other: 'Outro',
};

/**
 * Package type labels.
 */
export const PACKAGE_TYPES: Record<PackageType, string> = {
    box: 'Caixa',
    pallet: 'Palete',
    crate: 'Engradado',
    bag: 'Saco',
    other: 'Outro',
};

/**
 * External step status configuration.
 */
export const EXTERNAL_STEP_STATUSES = {
    awaiting_shipment: {
        label: 'Aguardando Envio',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
    at_manufacturer: {
        label: 'No Fabricante',
        color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    },
};
