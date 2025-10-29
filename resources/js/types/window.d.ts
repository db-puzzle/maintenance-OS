interface Window {
    Echo: unknown;
    route: (name: string, params?: Record<string, string | number | boolean | (string | number | boolean)[]>) => string;
}
