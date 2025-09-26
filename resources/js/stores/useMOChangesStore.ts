import { create } from 'zustand';

export interface MOChange {
    orderId: number;
    priority: number;
    originalPriority: number;
    timestamp: Date;
}

interface MOChangesStore {
    changes: Map<number, MOChange>;

    trackPriorityChange: (orderId: number, priority: number, originalPriority: number) => void;
    getChanges: (orderId: number) => MOChange | undefined;
    hasChanges: (orderId?: number) => boolean;
    clearChanges: (orderId?: number) => void;
    revertChanges: (orderId: number) => number | null;
    getAllChanges: () => MOChange[];
}

export const useMOChangesStore = create<MOChangesStore>((set, get) => ({
    changes: new Map(),

    trackPriorityChange: (orderId: number, priority: number, originalPriority: number) => {
        set((state) => {
            const newChanges = new Map(state.changes);

            // Check if priority has actually changed
            if (priority !== originalPriority) {
                newChanges.set(orderId, {
                    orderId,
                    priority,
                    originalPriority,
                    timestamp: new Date()
                });
            } else {
                // If no change, remove from tracking
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
            return change.originalPriority;
        }
        return null;
    },

    getAllChanges: () => {
        return Array.from(get().changes.values());
    }
}));
