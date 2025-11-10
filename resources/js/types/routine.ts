import { Asset } from './asset-hierarchy';
import { Form } from './work-order';
import { User } from './index';

export interface Routine {
    id: number;
    asset_id: number;
    name: string;
    trigger_type: 'runtime_hours' | 'calendar_days';
    trigger_runtime_hours?: number;
    trigger_calendar_days?: number;
    execution_mode: 'automatic' | 'manual';
    description?: string;
    form_id: number;
    advance_generation_days: number;
    auto_approve_work_orders: boolean;
    priority_score: number;
    last_execution_runtime_hours?: number;
    last_execution_completed_at?: string;
    next_execution_date?: string;
    is_active: boolean;
    created_by?: number;
    created_at: string;
    updated_at: string;

    // Computed attributes
    progress_percentage?: number;
    estimated_hours_until_due?: number;
    next_due_date?: string;
    has_open_work_order?: boolean;

    // Relationships
    asset?: Asset;
    form?: Form;
    created_by_user?: User;

    // Related open work order if exists
    open_work_order?: {
        id: number;
        work_order_number: string;
        status: string;
        status_label: string;
        created_at: string;
        scheduled_start_date?: string;
        assigned_technician?: {
            id: number;
            name: string;
        };
    };
}

export const TRIGGER_TYPES = [
    {
        value: 'runtime_hours' as const,
        label: 'Horas de Operação',
        icon: '⏱️',
        description: 'Baseado nas horas de funcionamento do ativo'
    },
    {
        value: 'calendar_days' as const,
        label: 'Dias Calendário',
        icon: '📅',
        description: 'Baseado em dias corridos'
    }
];

export const EXECUTION_MODES = [
    {
        value: 'automatic' as const,
        label: 'Automático',
        description: 'Sistema gera ordens automaticamente baseado no runtime'
    },
    {
        value: 'manual' as const,
        label: 'Manual',
        description: 'Usuário cria ordens quando necessário'
    }
];

export const PRIORITY_OPTIONS = [
    { value: 'emergency' as const, label: 'Emergência', score: 100 },
    { value: 'urgent' as const, label: 'Urgente', score: 80 },
    { value: 'high' as const, label: 'Alta', score: 60 },
    { value: 'normal' as const, label: 'Normal', score: 40 },
    { value: 'low' as const, label: 'Baixa', score: 20 }
]; 