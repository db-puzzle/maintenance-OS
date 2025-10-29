import { useCallback, useState } from 'react';
import { useRouteChangesStore } from '@/stores/useRouteChangesStore';
import { useMOChangesStore } from '@/stores/useMOChangesStore';
import { PlanningService } from '@/services/production/planning-service';
import { toast } from 'sonner';
import { ManufacturingOrder } from '@/types/production';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UsePlanningChangesReturn {
    routeSaveStatus: SaveStatus;
    moSaveStatus: SaveStatus;
    hasUnsavedChanges: boolean;
    saveRouteChanges: () => Promise<void>;
    saveMOChanges: () => Promise<void>;
    saveAllChanges: () => Promise<void>;
    cancelRouteChanges: () => void;
    cancelMOChanges: () => void;
    cancelAllChanges: () => void;
    findMOInHierarchy: (orders: ManufacturingOrder[], targetId: number) => ManufacturingOrder | null;
}

export function usePlanningChanges(
    activeMO: number | null,
    selectedMO: number | undefined,
    allowNavigation: () => void,
    getCurrentState: () => { selectedMOs: Set<number>; activeMO: number | null },
    restoreState: (state: { selectedMOs: Set<number>; activeMO: number | null }) => void,
    sortField?: string,
    sortDirection?: string
): UsePlanningChangesReturn {
    // Save status state
    const [routeSaveStatus, setRouteSaveStatus] = useState<SaveStatus>('idle');
    const [moSaveStatus, setMOSaveStatus] = useState<SaveStatus>('idle');

    // Route and MO changes stores
    const routeChangesStore = useRouteChangesStore();
    const moChangesStore = useMOChangesStore();

    // Check if there are unsaved changes
    const hasUnsavedChanges = routeChangesStore.hasChanges() || moChangesStore.hasChanges();

    // Helper function to find MO in nested structure
    const findMOInHierarchy = useCallback((orders: ManufacturingOrder[], targetId: number): ManufacturingOrder | null => {
        for (const order of orders) {
            if (order.id === targetId) {
                return order;
            }
            if (order.children && order.children.length > 0) {
                const found = findMOInHierarchy(order.children, targetId);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }, []);

    // Save route changes - now saves all changed routes
    const saveRouteChanges = useCallback(async () => {
        const allChanges = routeChangesStore.getAllChanges();
        if (allChanges.length === 0) return;

        setRouteSaveStatus('saving');

        try {
            // Allow navigation for the save request
            allowNavigation();

            // Save all route changes using the service
            await PlanningService.saveMultipleRoutes(
                allChanges,
                activeMO,
                selectedMO
            );

            // Clear all route changes after successful save
            routeChangesStore.clearChanges();
            setRouteSaveStatus('saved');
            setTimeout(() => setRouteSaveStatus('idle'), 2000);
        } catch {
            setRouteSaveStatus('error');
            toast.error('Failed to save routes');
            setTimeout(() => setRouteSaveStatus('idle'), 3000);
        }
    }, [routeChangesStore, allowNavigation, activeMO, selectedMO]);

    // Save MO priority changes
    const saveMOChanges = useCallback(async () => {
        const changes = moChangesStore.getAllChanges();
        if (changes.length === 0) return;

        setMOSaveStatus('saving');

        // Capture current state before the request
        const stateToRestore = getCurrentState();

        try {
            // Allow navigation for the save request
            allowNavigation();

            await PlanningService.bulkUpdatePriorities(
                {
                    updates: changes.map(change => ({
                        id: change.orderId,
                        priority: change.priority,
                    })),
                },
                {
                    selectedMO: activeMO || selectedMO,
                    userSelection: Array.from(stateToRestore.selectedMOs),
                    activeMO: stateToRestore.activeMO,
                    sortField: sortField,
                    sortDirection: sortDirection,
                    preserveState: false, // Use manual state management
                    stateToRestore: stateToRestore,
                    onRestoreState: restoreState,
                    onSuccess: () => {
                        // Clear changes after successful save
                        moChangesStore.clearChanges();
                        setMOSaveStatus('saved');
                        toast.success(`Updated ${changes.length} manufacturing order${changes.length > 1 ? 's' : ''}`);
                        setTimeout(() => setMOSaveStatus('idle'), 2000);
                    },
                    onError: () => {
                        setMOSaveStatus('error');
                        toast.error('Failed to update priorities');
                        setTimeout(() => setMOSaveStatus('idle'), 3000);
                    },
                }
            );
        } catch {
            setMOSaveStatus('error');
            toast.error('Failed to update priorities');
            setTimeout(() => setMOSaveStatus('idle'), 3000);
        }
    }, [moChangesStore, allowNavigation, activeMO, selectedMO, getCurrentState, restoreState, sortDirection, sortField]);

    // Save all changes
    const saveAllChanges = useCallback(async () => {
        const promises = [];
        if (routeChangesStore.hasChanges()) {
            promises.push(saveRouteChanges());
        }
        if (moChangesStore.hasChanges()) {
            promises.push(saveMOChanges());
        }
        await Promise.all(promises);
    }, [routeChangesStore, moChangesStore, saveRouteChanges, saveMOChanges]);

    // Cancel route changes
    const cancelRouteChanges = useCallback(() => {
        routeChangesStore.clearChanges();
    }, [routeChangesStore]);

    // Cancel MO changes
    const cancelMOChanges = useCallback(() => {
        moChangesStore.clearChanges();
    }, [moChangesStore]);

    // Cancel all changes
    const cancelAllChanges = useCallback(() => {
        if (routeChangesStore.hasChanges()) {
            cancelRouteChanges();
        }
        if (moChangesStore.hasChanges()) {
            cancelMOChanges();
        }
    }, [routeChangesStore, moChangesStore, cancelRouteChanges, cancelMOChanges]);

    return {
        routeSaveStatus,
        moSaveStatus,
        hasUnsavedChanges,
        saveRouteChanges,
        saveMOChanges,
        saveAllChanges,
        cancelRouteChanges,
        cancelMOChanges,
        cancelAllChanges,
        findMOInHierarchy,
    };
}
