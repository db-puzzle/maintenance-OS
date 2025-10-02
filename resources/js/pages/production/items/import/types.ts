export interface ImportFile {
    file: File;
    headers?: string[];
    data?: Record<string, unknown>[];
    totalRows?: number;
}

export interface FieldMapping {
    [csvHeader: string]: string;
}

export interface ImportOptions {
    updateExisting: boolean;
    skipDuplicates: boolean;
}

export interface ImportSession {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    errors?: ImportError[];
    // Additional detailed counts
    importedCount?: number;
    updatedCount?: number;
    skippedCount?: number;
}

export interface ImportError {
    row: number;
    field?: string;
    message: string;
    data?: Record<string, unknown>;
}

export interface ImportResult {
    success: boolean;
    message: string;
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    errors?: ImportError[];
}

// CSV field definitions
export const csvFields = [
    { value: 'item_number', label: 'Número do Item', required: true },
    { value: 'name', label: 'Nome', required: true },
    { value: 'description', label: 'Descrição', required: false },
    { value: 'category_name', label: 'Categoria', required: false },
    { value: 'unit_of_measure', label: 'Unidade de Medida', required: true },
    { value: 'can_be_sold', label: 'Pode Ser Vendido', required: false },
    { value: 'can_be_purchased', label: 'Pode Ser Comprado', required: false },
    { value: 'can_be_manufactured', label: 'Pode Ser Fabricado', required: false },
    { value: 'is_phantom', label: 'É Fantasma', required: false },
    { value: 'is_active', label: 'Está Ativo', required: false },
    { value: 'weight', label: 'Peso', required: false },
    { value: 'list_price', label: 'Preço de Lista', required: false },
    { value: 'manufacturing_cost', label: 'Custo de Fabricação', required: false },
    { value: 'manufacturing_lead_time_days', label: 'Lead Time de Fabricação (Dias)', required: false },
    { value: 'purchase_price', label: 'Preço de Compra', required: false },
    { value: 'purchase_lead_time_days', label: 'Lead Time de Compra (Dias)', required: false },
    { value: 'track_inventory', label: 'Rastrear Estoque', required: false },
    { value: 'min_stock_level', label: 'Nível Mín. de Estoque', required: false },
    { value: 'max_stock_level', label: 'Nível Máx. de Estoque', required: false },
    { value: 'reorder_point', label: 'Ponto de Reposição', required: false },
    { value: 'preferred_vendor', label: 'Fornecedor Preferido', required: false },
    { value: 'vendor_item_number', label: 'Número do Item do Fornecedor', required: false },
    { value: 'tags', label: 'Tags', required: false },
];

// Helper functions
export const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/\s+/g, '').trim();
};

export const findBestMatch = (header: string): string => {
    const normalizedHeader = normalizeString(header);

    // Direct matches
    for (const field of csvFields) {
        const normalizedFieldLabel = normalizeString(field.label);
        if (normalizedHeader === normalizedFieldLabel) {
            return field.value;
        }
    }

    // Common variations
    if (normalizedHeader.includes('number') || normalizedHeader.includes('code')) return 'item_number';
    if (normalizedHeader.includes('name') || normalizedHeader.includes('title')) return 'name';
    if (normalizedHeader.includes('description') || normalizedHeader.includes('desc')) return 'description';
    if (normalizedHeader.includes('category') || normalizedHeader.includes('cat')) return 'category_name';
    if (normalizedHeader.includes('unit') || normalizedHeader.includes('measure')) return 'unit_of_measure';
    if (normalizedHeader.includes('weight')) return 'weight';
    if (normalizedHeader.includes('price') && normalizedHeader.includes('list')) return 'list_price';
    if (normalizedHeader.includes('price') && normalizedHeader.includes('purchase')) return 'purchase_price';
    if (normalizedHeader.includes('cost')) return 'manufacturing_cost';
    if (normalizedHeader.includes('vendor') && !normalizedHeader.includes('number')) return 'preferred_vendor';
    if (normalizedHeader.includes('vendor') && normalizedHeader.includes('number')) return 'vendor_item_number';
    if (normalizedHeader.includes('tags')) return 'tags';

    return '';
};
