/**
 * Work Cell Import Types
 */

export interface ImportFile {
    file: File;
    name: string;
    size: number;
    type: string;
    preview?: string[];
}

export interface FieldMapping {
    [field: string]: string | null;
}

export interface ImportOptions {
    updateExisting: boolean;
    skipDuplicates: boolean;
}

export interface ImportError {
    row: number;
    field?: string;
    message: string;
}

export interface ImportSession {
    id: string;
    status: 'pending' | 'validating' | 'processing' | 'completed' | 'failed';
    totalRows: number;
    processedRows: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: ImportError[];
}

export interface ValidationResult {
    valid: boolean;
    totalRows: number;
    validRows: number;
    errors: ImportError[];
    warnings: ImportError[];
    preview: WorkCellPreview[];
}

export interface WorkCellPreview {
    row: number;
    name: string;
    description?: string;
    cell_type: 'internal' | 'external';
    plant_name?: string;
    area_name?: string;
    sector_name?: string;
    shift_name?: string;
    manufacturer_name?: string;
    has_finite_capacity: boolean;
    default_production_rate_per_hour?: number;
    default_unit_of_measure?: string;
    is_active: boolean;
    exists?: boolean;
}
