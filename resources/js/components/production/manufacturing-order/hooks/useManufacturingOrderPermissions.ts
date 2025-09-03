import { usePage } from '@inertiajs/react';

export function useManufacturingOrderPermissions() {
    const { props } = usePage<{ auth: { permissions?: string[] } }>();
    const auth = props.auth;
    const userPermissions = auth?.permissions || [];

    return {
        canReleaseOrders: userPermissions.includes('production.orders.release'),
        canCancelOrders: userPermissions.includes('production.orders.cancel'),
        canUpdateOrders: userPermissions.includes('production.orders.update'),
        canDeleteOrders: userPermissions.includes('production.orders.delete'),
    };
}
