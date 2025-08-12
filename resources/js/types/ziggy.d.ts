/* This file provides type definitions for Laravel Ziggy routes */

import type { Config } from 'ziggy-js';

export interface Ziggy extends Config {
    location: string;
}

// Define all available route names
export type RouteName =
    // Production routes
    | 'production.orders.index'
    | 'production.orders.show'
    | 'production.orders.create'
    | 'production.orders.store'
    | 'production.orders.edit'
    | 'production.orders.update'
    | 'production.orders.destroy'
    | 'production.orders.release'
    | 'production.routing.index'
    | 'production.routing.show'
    | 'production.routing.create'
    | 'production.routing.edit'
    | 'production.routing.builder'
    | 'production.shipments.index'
    | 'production.shipments.show'
    | 'production.shipments.create'
    | 'production.items.index'
    | 'production.items.show'
    | 'production.items.create'
    | 'production.items.edit'
    | 'production.bom.index'
    | 'production.bom.show'
    // Add more routes as needed
    | string; // Allow any string for flexibility

declare global {
    interface Window {
        Ziggy: Ziggy;
    }

    // Route function with proper overloads
    function route(name: RouteName, params?: any, absolute?: boolean, config?: Config): string;
}
