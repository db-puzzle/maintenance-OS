// Work Order Types and Interfaces

export interface WorkOrder {
    id: number;
    work_order_number: string;
    discipline: 'maintenance' | 'quality';
    title: string;
    description?: string;
    work_order_type_id: number;
    work_order_category_id: number;
    work_order_category_obj?: WorkOrderCategory;
    priority_score: number;
    status: WorkOrderStatus;

    // Asset relationship (maintenance discipline)
    asset_id?: number;
    asset?: Asset;

    // Instrument relationship (quality discipline - future)
    instrument_id?: number;
    instrument?: Instrument;

    // Form/Task configuration
    form_id?: number;
    form?: Form;
    form_version_id?: number;
    form_version?: FormVersion;
    custom_tasks?: CustomTask[];

    // Planning fields
    estimated_hours?: number;
    estimated_parts_cost?: number;
    estimated_labor_cost?: number;
    estimated_total_cost?: number;
    downtime_required: boolean;
    other_requirements?: string[];
    number_of_people?: number;

    // Scheduling
    requested_due_date?: string;
    scheduled_start_date?: string;
    scheduled_end_date?: string;

    // Assignment
    assigned_team_id?: number;
    assigned_technician_id?: number;
    assigned_team?: Team;
    assigned_technician?: User;
    required_skills?: string[];
    required_certifications?: string[];

    // Execution tracking
    actual_start_date?: string;
    actual_end_date?: string;
    actual_hours?: number;
    actual_parts_cost?: number;
    actual_labor_cost?: number;
    actual_total_cost?: number;

    // Source tracking
    source_type: 'manual' | 'routine' | 'sensor' | 'inspection' |
    'calibration_schedule' | 'quality_alert' | 'audit' | 'complaint';
    source_id?: number;
    source_routine?: {
        id: number;
        name: string;
        trigger_type: 'runtime_hours' | 'calendar_days';
        trigger_runtime_hours?: number;
        trigger_calendar_days?: number;
        execution_mode: 'automatic' | 'manual';
        last_execution_completed_at?: string;
        last_execution_runtime_hours?: number;
        advance_generation_days: number;
        auto_approve_work_orders: boolean;
    };

    // Relationships
    related_work_order_id?: number;
    relationship_type?: 'follow_up' | 'prerequisite' | 'related';

    // People tracking
    requested_by: number;
    approved_by?: number;
    planned_by?: number;
    verified_by?: number;
    closed_by?: number;

    requester?: User;
    approver?: User;
    planner?: User;
    verifier?: User;
    closer?: User;

    // Timestamps
    requested_at: string;
    approved_at?: string;
    planned_at?: string;
    verified_at?: string;
    closed_at?: string;
    created_at: string;
    updated_at: string;

    // Metadata
    external_reference?: string;
    warranty_claim: boolean;
    attachments?: Attachment[];
    tags?: string[];

    // Quality-specific fields (sparse)
    calibration_due_date?: string;
    certificate_number?: string;
    compliance_standard?: string;
    tolerance_specs?: Record<string, unknown>;

    // Related data
    type?: WorkOrderType;
    execution?: WorkOrderExecution;
    parts?: WorkOrderPart[];
    status_history?: WorkOrderStatusHistory[];
    failure_analysis?: WorkOrderFailureAnalysis;
}

export type WorkOrderStatus =
    | 'requested'
    | 'approved'
    | 'rejected'
    | 'planned'
    | 'scheduled'
    | 'in_progress'
    | 'on_hold'
    | 'completed'
    | 'verified'
    | 'closed'
    | 'cancelled';

export interface WorkOrderCategory {
    id: number;
    discipline: 'maintenance' | 'quality';
    name: string;
    code: string;
    description?: string;
    color?: string;
    icon?: string;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkOrderType {
    id: number;
    name: string;
    work_order_category_id: number;
    work_order_category?: WorkOrderCategory;
    description?: string;
    color?: string;
    icon?: string;
    default_priority_score: number;
    sla_hours?: number;
    requires_approval: boolean;
    auto_approve_from_routine: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkOrderExecution {
    id: number;
    work_order_id: number;
    work_order?: WorkOrder;
    started_at: string;
    completed_at?: string;
    paused_at?: string;
    resumed_at?: string;
    execution_time_minutes: number;
    pause_time_minutes: number;
    status: 'in_progress' | 'paused' | 'completed';
    executed_by: number;
    executor?: User;
    completion_notes?: string;
    task_responses?: TaskResponse[];
    created_at: string;
    updated_at: string;
}

export interface WorkOrderPart {
    id: number;
    work_order_id: number;
    part_id?: number;
    part_number?: string;
    part_name: string;
    estimated_quantity: number;
    reserved_quantity?: number;
    used_quantity?: number;
    unit_cost: number;
    total_cost: number;
    status: 'planned' | 'reserved' | 'issued' | 'used' | 'returned';
    reserved_at?: string;
    reserved_by?: number;
    issued_at?: string;
    issued_by?: number;
    used_at?: string;
    used_by?: number;
    notes?: string;
}

export interface WorkOrderStatusHistory {
    id: number;
    work_order_id: number;
    from_status?: string;
    to_status: string;
    changed_by: number;
    changedBy?: User;
    reason?: string;
    created_at: string;
}

export interface WorkOrderFailureAnalysis {
    id: number;
    work_order_id: number;
    failure_mode_id: number;
    root_cause_id: number;
    immediate_cause_id: number;
    failure_mode?: FailureMode;
    root_cause?: RootCause;
    immediate_cause?: ImmediateCause;
    failure_date: string;
    detection_method: string;
    production_loss_hours?: number;
    safety_impact: 'high' | 'medium' | 'low' | 'none';
    environmental_impact: boolean;
    downtime_cost?: number;
    immediate_action?: string;
    preventive_action?: string;
    created_at: string;
    updated_at: string;
}

export interface FailureMode {
    id: number;
    code: string;
    name: string;
    description?: string;
    category: string;
}

export interface RootCause {
    id: number;
    code: string;
    name: string;
    description?: string;
    category: string;
}

export interface ImmediateCause {
    id: number;
    code: string;
    name: string;
    description?: string;
    category: string;
}

export interface CustomTask {
    id?: string;
    title: string;
    description?: string;
    type: 'checklist' | 'measurement' | 'text' | 'photo';
    required: boolean;
    sequence: number;
}

export interface TaskResponse {
    id: number;
    work_order_execution_id: number;
    form_task_id?: number;
    custom_task_id?: string;
    response_type: string;
    response_value?: string | number | boolean | Record<string, unknown>;
    completed: boolean;
    completed_at?: string;
    notes?: string;
    attachments?: Attachment[];
}

export interface Attachment {
    id: number;
    filename: string;
    path: string;
    mime_type: string;
    size: number;
    uploaded_at: string;
}

// Import related types
export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
}

export interface Team {
    id: number;
    name: string;
    description?: string;
    members?: User[];
}

export interface Asset {
    id: number;
    tag: string;
    name: string;
    plant_id: number;
    area_id: number;
    sector_id?: number;
    asset_type_id: number;
    plant?: Plant;
    area?: Area;
    sector?: Sector;
    asset_type?: AssetType;
}

export interface Instrument {
    id: number;
    tag: string;
    name: string;
    plant_id: number;
    area_id: number;
    sector_id?: number;
    instrument_type_id: number;
    plant?: Plant;
    area?: Area;
    sector?: Sector;
    instrument_type?: InstrumentType;
}

export interface Plant {
    id: number;
    name: string;
}

export interface Area {
    id: number;
    name: string;
    plant_id: number;
}

export interface Sector {
    id: number;
    name: string;
    area_id: number;
}

export interface AssetType {
    id: number;
    name: string;
}

export interface InstrumentType {
    id: number;
    name: string;
}

export interface Form {
    id: number;
    name: string;
    description?: string;
    tasks?: FormTask[];
    current_version?: FormVersion;
    current_version_id?: number;
}

export interface FormVersion {
    id: number;
    form_id: number;
    version: number;
    tasks?: FormTask[];
}

export interface FormTask {
    id: number;
    title: string;
    description?: string;
    type: string;
    required: boolean;
    sequence: number;
}

// API Response Types
export interface WorkOrderListResponse {
    data: WorkOrder[];
    meta: PaginationMeta;
}

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

// Form Data Types
export interface CreateWorkOrderData {
    discipline?: 'maintenance' | 'quality';
    title: string;
    description?: string;
    work_order_type_id: number;
    work_order_category: 'corrective' | 'preventive' | 'inspection' | 'project' |
    'calibration' | 'quality_control' | 'quality_audit' | 'non_conformance';
    priority_score: number;
    asset_id?: number;
    instrument_id?: number;
    form_id?: number;
    custom_tasks?: CustomTask[];
    requested_due_date: string;
    downtime_required: boolean;
    source_type: 'manual' | 'routine' | 'sensor' | 'inspection' |
    'calibration_schedule' | 'quality_alert' | 'audit' | 'complaint';
    source_id?: number;
    related_work_order_id?: number;
    relationship_type?: 'follow_up' | 'prerequisite' | 'related';
    external_reference?: string;
    warranty_claim: boolean;
    tags?: string[];
    // Quality-specific fields
    calibration_due_date?: string;
    certificate_number?: string;
    compliance_standard?: string;
    tolerance_specs?: Record<string, unknown>;
}

export interface UpdateWorkOrderData extends Partial<CreateWorkOrderData> {
    status?: WorkOrderStatus;
    estimated_hours?: number;
    estimated_parts_cost?: number;
    estimated_labor_cost?: number;
    safety_requirements?: string[];
    required_skills?: string[];
    required_certifications?: string[];
    scheduled_start_date?: string;
    scheduled_end_date?: string;
    assigned_team_id?: number;
    assigned_technician_id?: number;
}

// Filter Types
export interface WorkOrderFilters {
    status?: WorkOrderStatus | WorkOrderStatus[];
    priority?: string | string[];
    category?: string | string[];
    asset_id?: number;
    plant_id?: number;
    area_id?: number;
    assigned_technician_id?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
}

// Status Transition Rules
export const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    requested: ['approved', 'rejected', 'cancelled'],
    approved: ['planned', 'on_hold', 'cancelled'],
    rejected: [],
    planned: ['scheduled', 'on_hold'],
    scheduled: ['in_progress', 'on_hold'],
    in_progress: ['completed', 'on_hold'],
    on_hold: ['approved', 'planned', 'scheduled', 'in_progress'],
    completed: ['verified', 'in_progress'],
    verified: ['closed', 'completed'],
    closed: [],
    cancelled: [],
};



// Discipline Configuration
export interface DisciplineConfig {
    discipline: 'maintenance' | 'quality';
    allowedCategories: string[];
    allowedSources: string[];
    requiresComplianceFields: boolean;
    requiresCalibrationTracking: boolean;
}

// Discipline-specific constants
export const MAINTENANCE_CATEGORIES = [
    { value: 'preventive', label: 'Preventiva' },
    { value: 'corrective', label: 'Corretiva' },
    { value: 'inspection', label: 'Inspeção' },
    { value: 'project', label: 'Projeto' }
] as const;

export const QUALITY_CATEGORIES = [
    { value: 'calibration', label: 'Calibração' },
    { value: 'quality_control', label: 'Controle de Qualidade' },
    { value: 'quality_audit', label: 'Auditoria' },
    { value: 'non_conformance', label: 'Não Conformidade' }
] as const;

export const MAINTENANCE_SOURCES = [
    { value: 'manual', label: 'Manual' },
    { value: 'routine', label: 'Rotina' },
    { value: 'sensor', label: 'Sensor' },
    { value: 'inspection', label: 'Inspeção' }
] as const;

export const QUALITY_SOURCES = [
    { value: 'manual', label: 'Manual' },
    { value: 'calibration_schedule', label: 'Cronograma de Calibração' },
    { value: 'quality_alert', label: 'Alerta de Qualidade' },
    { value: 'audit', label: 'Auditoria' },
    { value: 'complaint', label: 'Reclamação' }
] as const;

// Status Configuration
export const STATUS_CONFIG = {
    requested: { label: 'Solicitado', color: 'gray' },
    approved: { label: 'Aprovado', color: 'blue' },
    rejected: { label: 'Rejeitado', color: 'red' },
    planned: { label: 'Planejado', color: 'indigo' },
    scheduled: { label: 'Agendado', color: 'violet' },
    in_progress: { label: 'Em Execução', color: 'yellow' },
    on_hold: { label: 'Em Espera', color: 'orange' },
    completed: { label: 'Concluído', color: 'green' },
    verified: { label: 'Verificado', color: 'emerald' },
    closed: { label: 'Fechado', color: 'gray' },
    cancelled: { label: 'Cancelado', color: 'red' },
}; 