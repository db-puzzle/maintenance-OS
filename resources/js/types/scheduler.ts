export interface ScheduleVersion {
    id: number;
    version_number: number;
    status: 'draft' | 'published';
    published_by?: number;
    published_at?: string;
    created_by: number;
    last_algorithm_used?: string;
    last_scheduled_at?: string;
    algorithm_metrics?: Record<string, number | string>;
    algorithm_execution_time?: number;
    scheduling_job_id?: string;
    scheduling_status: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
    scheduling_error?: string;
    created_at: string;
    updated_at: string;
}

export interface ProductionSchedule {
    id: number;
    manufacturing_step_id: number;
    scheduled_start: string;
    scheduled_end: string;
    work_cell_id: number;
    is_locked: boolean;
    locked_by?: number;
    locked_at?: string;
    schedule_version_id: number;
    conflicts?: string[];
    created_at: string;
    updated_at: string;
    // Relations
    manufacturing_step: {
        id: number;
        name: string;
        description?: string;
        setup_time_minutes: number;
        cycle_time_minutes: number;
        status: string;
        manufacturing_route: {
            id: number;
            manufacturing_order_id: number;
            manufacturing_order: {
                id: number;
                order_number: string;
                quantity: number;
                status: string;
                priority: number;
                requested_date?: string;
                item?: {
                    id: number;
                    name: string;
                    item_number: string;
                };
            };
        };
        dependency?: {
            id: number;
            name: string;
        };
    };
    work_cell?: {
        id: number;
        name: string;
        code: string;
    };
    locked_by_user?: {
        id: number;
        name: string;
    };
}

export interface ScheduleAlert {
    id: number;
    schedule_version_id: number;
    alert_type: 'capacity_overrun' | 'dependency_violation' | 'late_delivery';
    severity: 'warning' | 'error';
    manufacturing_order_id?: number;
    manufacturing_step_id?: number;
    work_cell_id?: number;
    message: string;
    resolved: boolean;
    created_at: string;
    // Relations
    manufacturing_order?: {
        id: number;
        order_number: string;
    };
    manufacturing_step?: {
        id: number;
        name: string;
    };
    work_cell?: {
        id: number;
        name: string;
    };
}

export interface ScheduleSnapshot {
    id: number;
    schedule_version_id: number;
    snapshot_data: {
        version_info: {
            version_number: number;
            status: string;
            created_at: string;
            published_at?: string;
        };
        schedules: ProductionSchedule[];
        alerts: ScheduleAlert[];
    };
    created_by: number;
    reason?: string;
    created_at: string;
    // Relations
    created_by_user?: {
        id: number;
        name: string;
    };
}
