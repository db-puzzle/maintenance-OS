import { create } from 'zustand';

// Define RouteStep type inline to avoid circular dependencies
export interface RouteStep {
    id: string | number;
    sequence: number;
    name: string;
    description?: string;
    work_cell_id: number | null;
    setup_time_minutes?: number;
    cycle_time_minutes?: number;
    use_workcell_throughput?: boolean;
    step_type: 'standard' | 'quality_check' | 'rework';
    is_required: boolean;
    quality_check_mode?: 'every_part' | 'entire_lot' | 'sampling';
    sampling_size?: number;
    form_id?: number;
    gate_after?: {
        dependency_type: 'none' | 'all_children_completed' | 'children_quantity';
        minimum_quantity?: number;
    };
}

export interface RouteChange {
    orderId: number;
    steps: RouteStep[];
    originalSteps: RouteStep[];
    timestamp: Date;
}

interface RouteChangesStore {
    changes: Map<number, RouteChange>;

    trackChange: (orderId: number, steps: RouteStep[], originalSteps: RouteStep[]) => void;
    getChanges: (orderId: number) => RouteChange | undefined;
    hasChanges: (orderId?: number) => boolean;
    clearChanges: (orderId?: number) => void;
    revertChanges: (orderId: number) => RouteStep[] | null;
    getAllChanges: () => RouteChange[];
}

export const useRouteChangesStore = create<RouteChangesStore>((set, get) => ({
    changes: new Map(),

    trackChange: (orderId: number, steps: RouteStep[], originalSteps: RouteStep[]) => {
        set((state) => {
            const newChanges = new Map(state.changes);

            // Check if steps have actually changed
            const hasActualChanges = JSON.stringify(steps) !== JSON.stringify(originalSteps);

            if (hasActualChanges) {
                newChanges.set(orderId, {
                    orderId,
                    steps: [...steps],
                    originalSteps: [...originalSteps],
                    timestamp: new Date()
                });
            } else {
                // If no changes, remove from tracking
                newChanges.delete(orderId);
            }

            return { changes: newChanges };
        });
    },

    getChanges: (orderId: number) => {
        return get().changes.get(orderId);
    },

    hasChanges: (orderId?: number) => {
        const changes = get().changes;
        if (orderId !== undefined) {
            return changes.has(orderId);
        }
        return changes.size > 0;
    },

    clearChanges: (orderId?: number) => {
        set((state) => {
            const newChanges = new Map(state.changes);
            if (orderId !== undefined) {
                newChanges.delete(orderId);
            } else {
                newChanges.clear();
            }
            return { changes: newChanges };
        });
    },

    revertChanges: (orderId: number) => {
        const change = get().changes.get(orderId);
        if (change) {
            set((state) => {
                const newChanges = new Map(state.changes);
                newChanges.delete(orderId);
                return { changes: newChanges };
            });
            return change.originalSteps;
        }
        return null;
    },

    getAllChanges: () => {
        return Array.from(get().changes.values());
    }
}));
