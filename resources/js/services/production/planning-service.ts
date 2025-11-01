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
    targetState: 'planned' | 'draft' | 'released';
    includeChildren?: boolean;
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
                        use_workcell_throughput: step.use_workcell_throughput ?? false,
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
        _activeMO: number | null,
        _selectedMO?: number
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            // Prepare the data for bulk save
            const routes = changes.map(change => ({
                order_id: change.orderId,
                steps: change.steps.map(step => ({
                    sequence: step.sequence,
                    name: step.name,
                    description: step.description || '',
                    work_cell_id: step.work_cell_id || null,
                    setup_time_minutes: step.setup_time_minutes || 0,
                    cycle_time_minutes: step.cycle_time_minutes || 0,
                    use_workcell_throughput: step.use_workcell_throughput ?? false,
                    step_type: step.step_type || 'standard',
                    is_required: step.is_required ?? true,
                    child_order_dependency_type: step.gate_after?.dependency_type || 'all_children_completed',
                    child_order_minimum_quantity: parseInt(String(step.gate_after?.minimum_quantity || 0)) || 0,
                }))
            }));

            router.post(
                window.route('production.planning.routes.bulk-save'),
                {
                    routes: routes,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['manufacturingOrders'],
                    onSuccess: () => {
                        toast.success(`Saved ${changes.length} route${changes.length > 1 ? 's' : ''} successfully`);
                        resolve();
                    },
                    onError: (errors) => {
                        console.error('Failed to save routes:', errors);
                        toast.error('Failed to save routes');
                        reject(new Error('Failed to save routes'));
                    }
                }
            );
        });
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
            userSelection?: number[];
            activeMO?: number | null;
            sortField?: string;
            sortDirection?: string;
            preserveState?: boolean;
            stateToRestore?: { selectedMOs: Set<number>; activeMO: number | null };
            onRestoreState?: (state: { selectedMOs: Set<number>; activeMO: number | null }) => void;
        } = {}
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            // Build URL with selectedMO parameter to maintain hierarchy
            let url = window.route('production.planning.orders.bulk-update-priorities');
            if (options.selectedMO) {
                // Append selectedMO as query parameter
                const urlObj = new URL(url, window.location.origin);
                urlObj.searchParams.set('selectedMO', options.selectedMO.toString());

                // Add user selection state to URL
                if (options.userSelection && options.userSelection.length > 0) {
                    urlObj.searchParams.set('userSelection', options.userSelection.join(','));
                }

                if (options.activeMO !== null && options.activeMO !== undefined) {
                    urlObj.searchParams.set('activeMO', options.activeMO.toString());
                }

                // Add sorting state to URL
                if (options.sortField) {
                    urlObj.searchParams.set('sortField', options.sortField);
                }

                if (options.sortDirection) {
                    urlObj.searchParams.set('sortDirection', options.sortDirection);
                }

                url = urlObj.toString();
            }

            router.post(
                url,
                {
                    ...params,
                    // Include selection state in body as well for backend processing
                    userSelection: options.userSelection?.join(','),
                    activeMO: options.activeMO,
                    sortField: options.sortField,
                    sortDirection: options.sortDirection
                },
                {
                    preserveScroll: true,
                    preserveState: options.preserveState ?? false, // Default to false like bulkTransition
                    only: ['manufacturingOrders', 'selectedMO', 'userSelection', 'activeMO', 'preservedSelection', 'sortField', 'sortDirection', 'preservedSorting'], // Include selection and sorting state in the response
                    onSuccess: () => {
                        // Restore state if provided
                        if (options.stateToRestore && options.onRestoreState) {
                            options.onRestoreState(options.stateToRestore);
                        }
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
            userSelection?: number[];
            activeMO?: number | null;
            sortField?: string;
            sortDirection?: string;
        } = {}
    ): Promise<void> {
        const requestData: Record<string, string | number | string[] | number[] | boolean> = { ...params };

        // Include selection state if provided
        if (options.userSelection && options.userSelection.length > 0) {
            requestData.userSelection = options.userSelection.join(',');
        }

        if (options.activeMO !== null && options.activeMO !== undefined) {
            requestData.activeMO = options.activeMO;
        }

        if (options.sortField) {
            requestData.sortField = options.sortField;
        }

        if (options.sortDirection) {
            requestData.sortDirection = options.sortDirection;
        }

        router.post(
            route('production.planning.orders.bulk-transition'),
            requestData,
            {
                onSuccess: options.onSuccess,
                onError: options.onError,
                preserveState: options.preserveState ?? false,
                preserveScroll: true,
                only: ['manufacturingOrders', 'userSelection', 'activeMO', 'sortField', 'sortDirection'],
            }
        );
    }

    /**
     * Navigate to planning page with selected MO
     */
    static navigateToMO(
        moId: number,
        userSelection?: number[],
        activeMO?: number | null,
        sortField?: string,
        sortDirection?: string
    ): void {
        const params: Record<string, string | number> = { selectedMO: moId };

        if (userSelection && userSelection.length > 0) {
            params.userSelection = userSelection.join(',');
        }

        if (activeMO !== null && activeMO !== undefined) {
            params.activeMO = activeMO;
        }

        if (sortField) {
            params.sortField = sortField;
        }

        if (sortDirection) {
            params.sortDirection = sortDirection;
        }

        router.visit(route('production.planning.index', params), {
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
        preserveState?: boolean;
        preserveScroll?: boolean;
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
