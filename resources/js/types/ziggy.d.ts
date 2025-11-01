// Type definitions for Ziggy route helper
export interface Config {
    url: string;
    port: number | null;
    defaults: Record<string, unknown>;
    routes: Record<string, {
        uri: string;
        methods: string[];
        parameters?: string[];
        bindings?: Record<string, string>;
        wheres?: Record<string, string>;
    }>;
    location?: string;
}

declare module 'ziggy-js' {
    export type RouteName = string;
    export type RouteParams = Record<string, string | number | boolean | null | undefined | string[] | number[] | boolean[] | unknown> | number | string | null | undefined | string[] | number[] | unknown;

    export interface Route {
        (name: RouteName, params?: RouteParams, absolute?: boolean, config?: Partial<Config>): string;
        (name: RouteName, absolute?: boolean, config?: Partial<Config>): string;
        has(name: RouteName): boolean;
        current(name?: RouteName): boolean;
        params(name?: RouteName): RouteParams;
        check(name: RouteName): boolean;
        url(name: RouteName, params?: RouteParams, absolute?: boolean, config?: Partial<Config>): string;
    }

    export const route: Route;
    export default route;
    export type { Config };
}

declare global {
    var route: typeof import('ziggy-js').route;
}

export { };
