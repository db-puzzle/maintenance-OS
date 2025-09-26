import { router } from '@inertiajs/react';
import { RouteStep } from '@/stores/useRouteChangesStore';
import { toast } from 'sonner';

interface SaveRouteParams {
    orderId: number;
    steps: RouteStep[];
    autoSave?: boolean;
    selectedMO?: number | null;
}

interface BulkUpdatePrioritiesParams {
    updates: Array<{
        id: number;
        priority: number;
    }>;
}

interface BulkTransitionParams {
    orderIds: number[];
    targetState: 'planned' | 'draft';
}


interface SaveRouteOptions {
    preserveScroll?: boolean;
    preserveState?: boolean;
    only?: string[];
    onSuccess?: () => void;
    onError?: () => void;
}

export class PlanningService {
    /**
     * Save route changes for a manufacturing order
     */
    static async saveRoute(
        params: SaveRouteParams,
        options: SaveRouteOptions = {}
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            router.post(
                window.route('production.planning.orders.save-route', params.orderId),
                {
                    steps: params.steps.map(step => ({
                        sequence: step.sequence,
                        name: step.name,
                        description: step.description,
                        work_cell_id: step.work_cell_id,
                        setup_time_minutes: step.setup_time_minutes || 0,
                        cycle_time_minutes: step.cycle_time_minutes || 0,
                        step_type: step.step_type,
                        is_required: step.is_required,
                        child_order_dependency_type: step.gate_after?.dependency_type || 'all_children_completed',
                        child_order_minimum_quantity: step.gate_after?.minimum_quantity || 0,
                    })),
                    autoSave: params.autoSave ?? true,
                    selectedMO: params.selectedMO,
                },
                {
                    preserveScroll: options.preserveScroll ?? true,
                    preserveState: options.preserveState ?? true,
                    only: options.only ?? ['manufacturingOrders'],
                    onSuccess: () => {
                        options.onSuccess?.();
                        resolve();
                    },
                    onError: () => {
                        options.onError?.();
                        reject(new Error('Failed to save route'));
                    }
                }
            );
        });
    }

    /**
     * Save multiple route changes
     */
    static async saveMultipleRoutes(
        changes: Array<{ orderId: number; steps: RouteStep[] }>,
        activeMO: number | null,
        selectedMO?: number
    ): Promise<void> {
        const savePromises = changes.map(change =>
            this.saveRoute({
                orderId: change.orderId,
                steps: change.steps,
                autoSave: true,
                selectedMO: activeMO || selectedMO,
            })
        );

        await Promise.all(savePromises);
        toast.success(`Saved ${changes.length} route${changes.length > 1 ? 's' : ''} successfully`);
    }

    /**
     * Bulk update manufacturing order priorities
     */
    static async bulkUpdatePriorities(
        params: BulkUpdatePrioritiesParams,
        options: {
            onSuccess?: () => void;
            onError?: () => void;
            selectedMO?: number | null;
        } = {}
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const url = window.route('production.planning.orders.bulk-update-priorities');

            router.post(
                url,
                {
                    ...params,
                    // Don't send selectedMO in the body - let the backend use the URL parameter
                    // This ensures we get the same hierarchy back
                },
                {
                    preserveScroll: true,
                    preserveState: true, // Preserve component state (including selection)
                    only: ['manufacturingOrders'], // Only update this specific prop
                    onSuccess: () => {
                        options.onSuccess?.();
                        resolve();
                    },
                    onError: () => {
                        options.onError?.();
                        reject(new Error('Failed to update priorities'));
                    },
                }
            );
        });
    }

    /**
     * Bulk transition manufacturing orders to planned or draft state
     */
    static async bulkTransition(
        params: BulkTransitionParams,
        options: {
            onSuccess?: () => void;
            onError?: () => void;
            preserveState?: boolean;
        } = {}
    ): Promise<void> {
        router.post(
            route('production.planning.orders.bulk-transition'),
            params,
            {
                onSuccess: options.onSuccess,
                onError: options.onError,
                preserveState: options.preserveState ?? false,
                preserveScroll: true,
                only: ['manufacturingOrders'],
            }
        );
    }

    /**
     * Navigate to planning page with selected MO
     */
    static navigateToMO(moId: number): void {
        router.visit(route('production.planning.index', { selectedMO: moId }), {
            preserveState: false,
            preserveScroll: true
        });
    }

    /**
     * Reload planning page data
     */
    static reloadData(options: {
        only?: string[];
        delay?: number;
    } = {}): void {
        const reload = () => {
            router.reload({
                only: options.only ?? ['manufacturingOrders']
            });
        };

        if (options.delay) {
            setTimeout(reload, options.delay);
        } else {
            reload();
        }
    }
}
