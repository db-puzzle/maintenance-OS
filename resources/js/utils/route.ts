export function route(name: string, params: Record<string, string | number | boolean> = {}): string {
    // Converte o nome da rota em um caminho
    // Exemplo: 'asset-hierarchy.setores' -> '/asset-hierarchy/setores'
    const path = name.replace(/\./g, '/');

    const url = new URL(window.location.origin);
    url.pathname = path;

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.append(key, value.toString());
        }
    });

    return url.toString();
}
