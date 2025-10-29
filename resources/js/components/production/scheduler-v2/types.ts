// Common types for scheduler-v2 components

export interface SchedulerStep {
    id: number;
    order_id: number;
    order_number: string;
    step_id: number;
    step_name: string;
    workcell_id: number;
    scheduled_start: string;
    scheduled_end: string;
    duration: number;
    is_locked: boolean;
}

export interface SchedulerOrder {
    id: number;
    order_number: string;
    family_id?: number;
    family_name?: string;
    item_number?: string;
    item_name?: string;
    quantity: number;
    scheduled_start?: string;
    scheduled_end?: string;
    steps: SchedulerStep[];
    is_expanded?: boolean;
}

export interface AlertStats {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
}

export interface SchedulerFilters {
    search?: string;
    family_ids?: number[];
    workcell_ids?: number[];
    start_date?: string;
    end_date?: string;
}

export interface TimelineLayout {
    startTime: Date;
    endTime: Date;
    totalMinutes: number;
    pixelsPerMinute: number;
    width: number;
}

export interface ViewportInfo {
    scrollLeft: number;
    scrollTop: number;
    clientWidth: number;
    clientHeight: number;
}

export interface DragState {
    stepId: number;
    initialX: number;
    initialY: number;
    offsetX: number;
    offsetY: number;
}
