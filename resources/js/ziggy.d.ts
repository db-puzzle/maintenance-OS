import type { Config } from 'ziggy-js';

declare module '@/ziggy' {
    export const Ziggy: Config & { location: string };
    export { route } from 'ziggy-js';
    export type RouteName = string;
}
