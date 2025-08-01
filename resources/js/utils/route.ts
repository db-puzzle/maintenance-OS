export function route(name: string, params: Record<string, string | number | boolean> = {}): string {
    // Define route patterns for different routes
    const routePatterns: Record<string, string> = {
        // Parts routes
        'parts.index': '/parts',
        'parts.store': '/parts',
        'parts.show': '/parts/{part}',
        'parts.update': '/parts/{part}',
        'parts.destroy': '/parts/{part}',
        'parts.check-dependencies': '/parts/{part}/check-dependencies',
        'parts.substitute-and-delete': '/parts/{part}/substitute-and-delete',
        'parts.import': '/parts/import',
        'parts.import.analyze': '/parts/import/analyze',
        'parts.import.data': '/parts/import/data',
        'parts.export': '/parts/export',
        'parts.export.data': '/parts/export/data',

        // Work order routes
        'maintenance.work-orders.show': '/maintenance/work-orders/{work_order}',

        // Fallback: convert dots to slashes
        'default': name.replace(/\./g, '/')
    };

    let path = routePatterns[name] || routePatterns['default'];
    const queryParams: Record<string, string> = {};

    // Replace route parameters and collect query parameters
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            const paramPattern = `{${key}}`;
            if (path.includes(paramPattern)) {
                path = path.replace(paramPattern, value.toString());
            } else {
                // Collect parameters that don't match route patterns for query string
                queryParams[key] = value.toString();
            }
        }
    });

    // Add query parameters if any
    if (Object.keys(queryParams).length > 0) {
        // Note: window.location.origin is acceptable here as this is a utility function
        // that builds absolute URLs for various purposes
        const url = new URL(window.location.origin);
        url.pathname = path;
        Object.entries(queryParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        return url.toString();
    }

    return path;
}
