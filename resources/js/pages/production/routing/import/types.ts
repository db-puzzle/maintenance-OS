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
    totalTemplates: number;
    processedTemplates: number;
    successfulTemplates: number;
    failedTemplates: number;
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

// CSV field definitions with all database fields
export const csvFields = [
    // Template fields
    { value: 'template_name', label: 'Template Name', required: true },
    { value: 'template_description', label: 'Template Description', required: false },
    { value: 'item_category_name', label: 'Category', required: false },
    { value: 'version', label: 'Version', required: false },
    { value: 'is_active', label: 'Is Active', required: false },
    { value: 'template_metadata', label: 'Template Metadata (JSON)', required: false },

    // Step basic fields
    { value: 'step_number', label: 'Step Number', required: true },
    { value: 'name', label: 'Step Name', required: true },
    { value: 'description', label: 'Step Description', required: false },
    { value: 'step_type', label: 'Step Type', required: false },
    { value: 'work_cell_name', label: 'Work Cell', required: false },

    // Time fields
    { value: 'setup_time_minutes', label: 'Setup Time (Minutes)', required: false },
    { value: 'cycle_time_minutes', label: 'Cycle Time (Minutes)', required: false },
    { value: 'use_workcell_throughput', label: 'Use Work Cell Default Times', required: false },

    // Quality check fields
    { value: 'quality_check_mode', label: 'Quality Check Mode', required: false },
    { value: 'sampling_size', label: 'Sampling Size', required: false },

    // Form fields
    { value: 'form_id', label: 'Form ID', required: false },

    // Dependency fields
    { value: 'depends_on_step_id', label: 'Depends on Step ID', required: false },
    { value: 'can_start_when_dependency', label: 'Can Start When Dependency', required: false },
    { value: 'dependency_start_condition', label: 'Dependency Start Condition', required: false },
    { value: 'dependency_minimum_quantity', label: 'Dependency Minimum Quantity', required: false },
    { value: 'dependency_minimum_percentage', label: 'Dependency Minimum Percentage', required: false },

    // Child order dependency fields
    { value: 'child_order_dependency_type', label: 'Child Order Dependency Type', required: false },
    { value: 'child_order_minimum_quantity', label: 'Child Order Minimum Quantity', required: false },
];

// Enum value mappings for validation
export const STEP_TYPES = ['standard', 'quality_check', 'rework'];
export const QUALITY_CHECK_MODES = ['every_part', 'entire_lot', 'sampling'];
export const DEPENDENCY_CONDITIONS = ['completed', 'in_progress'];
export const DEPENDENCY_START_CONDITIONS = ['completed', 'quantity_based', 'percentage_based', 'immediate'];
export const CHILD_ORDER_DEPENDENCY_TYPES = ['none', 'all_children_completed', 'children_quantity'];

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

    // Common variations for template fields
    if (normalizedHeader.includes('template') && normalizedHeader.includes('name')) return 'template_name';
    if (normalizedHeader.includes('template') && normalizedHeader.includes('desc')) return 'template_description';
    if (normalizedHeader.includes('category')) return 'item_category_name';
    if (normalizedHeader.includes('version')) return 'version';
    if (normalizedHeader.includes('active')) return 'is_active';
    if (normalizedHeader.includes('metadata')) return 'template_metadata';

    // Step fields
    if (normalizedHeader.includes('step') && normalizedHeader.includes('number')) return 'step_number';
    if (normalizedHeader.includes('step') && normalizedHeader.includes('name')) return 'name';
    if (normalizedHeader.includes('step') && normalizedHeader.includes('desc')) return 'description';
    if (normalizedHeader.includes('type') && !normalizedHeader.includes('dependency')) return 'step_type';
    if (normalizedHeader.includes('work') && normalizedHeader.includes('cell')) return 'work_cell_name';

    // Time fields
    if (normalizedHeader.includes('setup')) return 'setup_time_minutes';
    if (normalizedHeader.includes('cycle')) return 'cycle_time_minutes';
    if (normalizedHeader.includes('workcell') && normalizedHeader.includes('throughput')) return 'use_workcell_throughput';
    if (normalizedHeader.includes('default') && normalizedHeader.includes('time')) return 'use_workcell_throughput';

    // Quality fields
    if (normalizedHeader.includes('quality') && normalizedHeader.includes('mode')) return 'quality_check_mode';
    if (normalizedHeader.includes('sampling')) return 'sampling_size';

    // Form fields
    if (normalizedHeader.includes('form') && normalizedHeader.includes('id')) return 'form_id';

    // Dependency fields
    if (normalizedHeader.includes('depends') && normalizedHeader.includes('step')) return 'depends_on_step_id';
    if (normalizedHeader.includes('start') && normalizedHeader.includes('when')) return 'can_start_when_dependency';
    if (normalizedHeader.includes('dependency') && normalizedHeader.includes('condition')) return 'dependency_start_condition';
    if (normalizedHeader.includes('dependency') && normalizedHeader.includes('quantity')) return 'dependency_minimum_quantity';
    if (normalizedHeader.includes('dependency') && normalizedHeader.includes('percentage')) return 'dependency_minimum_percentage';

    // Child order fields
    if (normalizedHeader.includes('child') && normalizedHeader.includes('dependency') && normalizedHeader.includes('type')) return 'child_order_dependency_type';
    if (normalizedHeader.includes('child') && normalizedHeader.includes('quantity')) return 'child_order_minimum_quantity';

    return '';
};

// Validation helpers
export const validateEnumValue = (value: string, validValues: string[]): boolean => {
    return validValues.includes(value.toLowerCase());
};

export const parseBooleanValue = (value: string | boolean): boolean => {
    if (typeof value === 'boolean') return value;
    const normalizedValue = value.toLowerCase().trim();
    return ['true', '1', 'yes', 'sim', 'y', 's'].includes(normalizedValue);
};

export const parseJsonValue = (value: string): any => {
    if (!value || value.trim() === '') return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};
