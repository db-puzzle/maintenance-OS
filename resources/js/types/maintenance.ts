export interface Asset {
    id: number;
    tag: string;
    description: string;
}

export interface ExecutionTimelineEvent {
    timestamp: string;
    event: string;
    description: string;
    user?: string;
    task_id?: number;
    task_type?: string;
}

export interface TaskResponse {
    id: number;
    task: FormTask;
    response: FormattedResponse;
    is_completed: boolean;
    responded_at: string | null;
}

export interface FormTask {
    id: number;
    type: string;
    description: string;
    is_required: boolean;
    configuration: Record<string, unknown>;
    instructions: TaskInstruction[];
}

export interface TaskInstruction {
    id: number;
    type: string;
    content: string;
    position: number;
}

export interface FormattedResponse {
    type: string;
    value: string | number | boolean | string[] | Record<string, unknown> | null;
    display_value: string;
    status: 'success' | 'warning' | 'incomplete' | 'error';

    // Measurement-specific
    unit?: string;
    is_within_range?: boolean;
    range_info?: {
        min: number;
        max: number;
        target?: number;
        range_text: string;
    };

    // Choice-specific
    options?: Array<{ value: string; label: string }>;
    selected_count?: number;
    values?: string[];

    // Text-specific
    word_count?: number;
    character_count?: number;

    // Photo/File-specific
    photos?: Photo[];
    files?: FileAttachment[];
    photo_count?: number;
    file_count?: number;

    // Code reader-specific
    code_type?: string;
}

export interface Photo {
    id: number;
    filename: string;
    file_path: string;
    url: string;
    thumbnail_url: string;
    uploaded_at: string;
    file_size: number | null;
}

export interface FileAttachment {
    id: number;
    filename: string;
    file_path: string;
    url: string;
    uploaded_at: string;
    file_size: number | null;
    file_type: string;
}

export interface ExecutionStats {
    total: number;
    completed: number;
    in_progress: number;
    failed: number;
    completion_rate: number;
    trend: {
        direction: 'up' | 'down' | 'stable';
        percentage: number;
    };
}

export interface ExecutionSummary {
    id: number;
    routine_name: string;
    asset_tag: string | null;
    executor_name: string;
    status: string;
    started_at: string;
    duration_minutes: number | null;
    progress: number;
}

export interface DailyTrendData {
    date: string;
    count: number;
    completed: number;
    failed: number;
}

export interface ExecutionFilters {
    search?: string;
    date_from?: string;
    date_to?: string;
    date_preset?: string;
    asset_ids?: number[];
    routine_ids?: number[];
    executor_ids?: number[];
    status?: string[];
}

export interface FilterOption {
    value: string | number;
    label: string;
}

export interface SortOption {
    value: string;
    label: string;
}

export interface ExportOptions {
    format: 'pdf' | 'csv' | 'excel';
    template?: 'standard' | 'summary' | 'detailed';
    include_images?: boolean;
    compress_images?: boolean;
    include_signatures?: boolean;
    paper_size?: 'A4' | 'Letter';
    grouping?: 'none' | 'by_asset' | 'by_routine';
    include_cover_page?: boolean;
    include_index?: boolean;
    separate_files?: boolean;
    delivery: {
        method: 'download' | 'email';
        email?: string;
    };
}

export interface ExecutionExport {
    id: number;
    export_type: 'single' | 'batch';
    export_format: 'pdf' | 'csv' | 'excel';
    execution_count: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    created_at: string;
    completed_at: string | null;
    estimated_size_kb: number;
    can_download: boolean;
}

export interface ExportProgress {
    export_id: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    created_at: string;
    completed_at: string | null;
    download_url: string | null;
    file_size_kb: number | null;
    progress_percentage: number;
}

export interface PerformanceMetrics {
    average_duration_minutes: number;
    median_duration_minutes: number;
    fastest_execution_minutes: number;
    slowest_execution_minutes: number;
    total_execution_time_hours: number;
}

export interface AssetExecutionSummary {
    asset_id: number;
    asset_tag: string;
    asset_description: string;
    total_executions: number;
    completed_executions: number;
    completion_rate: number;
    avg_duration_minutes: number | null;
}

export interface ExecutionIndexPageProps {
    executions: {
        data: ExecutionSummary[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: ExecutionFilters;
    filterOptions: {
        assets: FilterOption[];
        routines: FilterOption[];
        executors: FilterOption[];
        statuses: FilterOption[];
    };
    sortOptions: SortOption[];
    currentSort: {
        column: string;
        direction: 'asc' | 'desc';
    };
}

export interface Part {
    id: number;
    part_number: string;
    name: string;
    description: string | null;
    unit_cost: number;
    available_quantity: number;
    minimum_quantity: number;
    maximum_quantity: number | null;
    location: string | null;
    manufacturer_id: number | null;
    manufacturer?: {
        id: number;
        name: string;
    } | null;
    active: boolean;
    created_at: string;
    updated_at: string;
    work_order_parts?: WorkOrderPart[];
}

export interface WorkOrderPart {
    id: number;
    work_order_id: number;
    part_id: number;
    part?: Part;
    quantity_planned: number;
    quantity_used: number | null;
    notes?: string;
}
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
