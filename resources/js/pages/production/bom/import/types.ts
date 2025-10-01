export interface BomImportSession {
    sessionId: string;
    status: 'initialized' | 'file_uploaded' | 'validated' | 'processing' | 'completed' | 'failed';
    file_info?: {
        original_name: string;
        type: 'csv' | 'json' | 'txt';
        size: number;
        path?: string;
    };
    bom_info?: {
        name: string;
        description?: string;
        external_reference?: string;
    };
    mapping?: Record<string, string>;
    csv_headers?: string[];
    validation?: ValidationResult;
    data?: Record<string, unknown>[];
    result?: {
        bom_id: number;
        bom_number: string;
        items_created: number;
        errors: string[];
    };
    created_at: string;
    started_at?: string;
    completed_at?: string;
}

export interface BomImportFile {
    file: File;
    filename: string;
    size: number;
    type: string;
}

export interface BomInfo {
    name: string;
    description: string;
    external_reference: string;
}

export interface CsvMapping {
    [csvHeader: string]: string; // maps to: item_number, name, quantity, unit_of_measure, level, parent, etc.
}

export interface ValidationResult {
    total_items: number;
    valid_items: number;
    invalid_items: number;
    missing_items: Array<{
        item_number: string;
        name: string;
        row_index: number;
    }>;
    errors: string[];
}

export interface CsvField {
    value: string;
    label: string;
    required: boolean;
}

export const CSV_FIELDS: CsvField[] = [
    { value: 'item_number', label: 'Código do Item', required: true },
    { value: 'name', label: 'Nome/Descrição', required: true },
    { value: 'quantity', label: 'Quantidade', required: true },
    { value: 'unit_of_measure', label: 'Unidade de Medida', required: true },
    { value: 'level', label: 'Nível', required: false },
    { value: 'parent', label: 'Item Pai', required: false },
    { value: 'description', label: 'Descrição Detalhada', required: false },
    { value: 'reference_designators', label: 'Designadores de Referência', required: false },
];

export type StepType = 'selection' | 'mapping' | 'validation' | 'processing' | 'results';

export interface StepInfo {
    id: StepType;
    title: string;
}
