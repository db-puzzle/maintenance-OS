import axios from 'axios';
import {
    WorkOrder,
    WorkOrderListResponse,
    CreateWorkOrderData,
    UpdateWorkOrderData,
    WorkOrderFilters,
    WorkOrderType,
    WorkOrderExecution,
    WorkOrderPart,
    WorkOrderStatusHistory,
    WorkOrderFailureAnalysis,
    WorkOrderStatus,
} from '@/types/work-order';

// Base API URL - assuming it's set up in your axios config
const API_BASE = '/api/work-orders';

export const workOrderService = {
    // List work orders with filters and pagination
    list: async (filters?: WorkOrderFilters): Promise<WorkOrderListResponse> => {
        const response = await axios.get<WorkOrderListResponse>(API_BASE, { params: filters });
        return response.data;
    },

    // Get single work order by ID
    get: async (id: number): Promise<WorkOrder> => {
        const response = await axios.get<WorkOrder>(`${API_BASE}/${id}`);
        return response.data;
    },

    // Create new work order
    create: async (data: CreateWorkOrderData): Promise<WorkOrder> => {
        const response = await axios.post<WorkOrder>(API_BASE, data);
        return response.data;
    },

    // Update work order
    update: async (id: number, data: UpdateWorkOrderData): Promise<WorkOrder> => {
        const response = await axios.put<WorkOrder>(`${API_BASE}/${id}`, data);
        return response.data;
    },

    // Delete work order
    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_BASE}/${id}`);
    },

    // Status management
    updateStatus: async (id: number, status: WorkOrderStatus, reason?: string): Promise<WorkOrder> => {
        const response = await axios.post<WorkOrder>(`${API_BASE}/${id}/status`, { status, reason });
        return response.data;
    },

    // Approval actions
    approve: async (id: number, comments?: string): Promise<WorkOrder> => {
        const response = await axios.post<WorkOrder>(`${API_BASE}/${id}/approve`, { comments });
        return response.data;
    },

    reject: async (id: number, reason: string): Promise<WorkOrder> => {
        const response = await axios.post<WorkOrder>(`${API_BASE}/${id}/reject`, { reason });
        return response.data;
    },

    // Planning
    plan: async (id: number, planningData: {
        estimated_hours: number;
        estimated_parts_cost: number;
        estimated_labor_cost: number;
        downtime_required: boolean;
        safety_requirements?: string[];
        required_skills?: string[];
        required_certifications?: string[];
        scheduled_start_date?: string;
        scheduled_end_date?: string;
        assigned_technician_id?: number;
        assigned_team_id?: number;
        parts?: Partial<WorkOrderPart>[];
    }): Promise<WorkOrder> => {
        const response = await axios.put<WorkOrder>(`${API_BASE}/${id}/planning`, planningData);
        return response.data;
    },

    // Execution management
    startExecution: async (id: number): Promise<WorkOrderExecution> => {
        const response = await axios.post<WorkOrderExecution>(`${API_BASE}/${id}/execute/start`);
        return response.data;
    },

    pauseExecution: async (id: number, reason?: string): Promise<WorkOrderExecution> => {
        const response = await axios.post<WorkOrderExecution>(`${API_BASE}/${id}/execute/pause`, { reason });
        return response.data;
    },

    resumeExecution: async (id: number): Promise<WorkOrderExecution> => {
        const response = await axios.post<WorkOrderExecution>(`${API_BASE}/${id}/execute/resume`);
        return response.data;
    },

    completeExecution: async (id: number, data: {
        completion_notes?: string;
        actual_hours?: number;
        parts_used?: { part_id: number; quantity: number; notes?: string }[];
    }): Promise<WorkOrderExecution> => {
        const response = await axios.post<WorkOrderExecution>(`${API_BASE}/${id}/execute/complete`, data);
        return response.data;
    },

    // Validation
    validate: async (id: number, data: {
        approved: boolean;
        validation_notes: string;
        follow_up_required?: boolean;
    }): Promise<WorkOrder> => {
        const response = await axios.post<WorkOrder>(`${API_BASE}/${id}/validate`, data);
        return response.data;
    },

    // Parts management
    getParts: async (workOrderId: number): Promise<WorkOrderPart[]> => {
        const response = await axios.get<WorkOrderPart[]>(`${API_BASE}/${workOrderId}/parts`);
        return response.data;
    },

    addPart: async (workOrderId: number, part: Partial<WorkOrderPart>): Promise<WorkOrderPart> => {
        const response = await axios.post<WorkOrderPart>(`${API_BASE}/${workOrderId}/parts`, part);
        return response.data;
    },

    updatePart: async (workOrderId: number, partId: number, data: Partial<WorkOrderPart>): Promise<WorkOrderPart> => {
        const response = await axios.put<WorkOrderPart>(`${API_BASE}/${workOrderId}/parts/${partId}`, data);
        return response.data;
    },

    deletePart: async (workOrderId: number, partId: number): Promise<void> => {
        await axios.delete(`${API_BASE}/${workOrderId}/parts/${partId}`);
    },

    // Status history
    getStatusHistory: async (workOrderId: number): Promise<WorkOrderStatusHistory[]> => {
        const response = await axios.get<WorkOrderStatusHistory[]>(`${API_BASE}/${workOrderId}/history`);
        return response.data;
    },

    // Failure analysis
    getFailureAnalysis: async (workOrderId: number): Promise<WorkOrderFailureAnalysis | null> => {
        const response = await axios.get<WorkOrderFailureAnalysis>(`${API_BASE}/${workOrderId}/analysis`);
        return response.data;
    },

    saveFailureAnalysis: async (workOrderId: number, analysis: Partial<WorkOrderFailureAnalysis>): Promise<WorkOrderFailureAnalysis> => {
        const response = await axios.post<WorkOrderFailureAnalysis>(`${API_BASE}/${workOrderId}/analysis`, analysis);
        return response.data;
    },

    // Attachments
    uploadAttachment: async (workOrderId: number, file: File): Promise<{ id: number; url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post<{ id: number; url: string }>(
            `${API_BASE}/${workOrderId}/attachments`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    deleteAttachment: async (workOrderId: number, attachmentId: number): Promise<void> => {
        await axios.delete(`${API_BASE}/${workOrderId}/attachments/${attachmentId}`);
    },

    // Task responses
    saveTaskResponse: async (executionId: number, taskId: number, response: {
        response_type: string;
        response_value?: any;
        completed: boolean;
        notes?: string;
    }): Promise<void> => {
        await axios.post(`/api/executions/${executionId}/tasks/${taskId}/response`, response);
    },

    // Analytics
    getAnalytics: async (filters?: {
        date_from?: string;
        date_to?: string;
        plant_id?: number;
        category?: string;
    }): Promise<{
        total_orders: number;
        open_orders: number;
        overdue_orders: number;
        completed_orders: number;
        mttr: number;
        completion_rate: number;
        orders_by_status: Record<string, number>;
        orders_by_priority: Record<string, number>;
        orders_by_type: Record<string, number>;
        top_problem_assets: Array<{ asset_id: number; asset_name: string; failure_count: number }>;
    }> => {
        const response = await axios.get('/api/work-orders/analytics', { params: filters });
        return response.data;
    },

    // Export
    export: async (filters?: WorkOrderFilters, format: 'excel' | 'pdf' = 'excel'): Promise<Blob> => {
        const response = await axios.get(`${API_BASE}/export`, {
            params: { ...filters, format },
            responseType: 'blob',
        });
        return response.data;
    },
};

// Work order type service
export const workOrderTypeService = {
    list: async (): Promise<WorkOrderType[]> => {
        const response = await axios.get<WorkOrderType[]>('/api/work-order-types');
        return response.data;
    },

    get: async (id: number): Promise<WorkOrderType> => {
        const response = await axios.get<WorkOrderType>(`/api/work-order-types/${id}`);
        return response.data;
    },
};

// Failure classification services
export const failureClassificationService = {
    getFailureModes: async (): Promise<{ id: number; code: string; name: string; category: string }[]> => {
        const response = await axios.get('/api/failure-modes');
        return response.data;
    },

    getRootCauses: async (): Promise<{ id: number; code: string; name: string; category: string }[]> => {
        const response = await axios.get('/api/root-causes');
        return response.data;
    },

    getImmediateCauses: async (): Promise<{ id: number; code: string; name: string; category: string }[]> => {
        const response = await axios.get('/api/immediate-causes');
        return response.data;
    },
};

// Helper function to download file
export const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}; 