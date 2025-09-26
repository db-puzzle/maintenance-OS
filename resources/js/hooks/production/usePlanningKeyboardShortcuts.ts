import { useEffect } from 'react';

interface UsePlanningKeyboardShortcutsOptions {
    onOpenMOSelection: () => void;
}

/**
 * Custom hook to handle keyboard shortcuts for the planning page
 * Currently handles:
 * - Cmd/Ctrl + K: Open MO selection modal
 */
export function usePlanningKeyboardShortcuts({
    onOpenMOSelection,
}: UsePlanningKeyboardShortcutsOptions): void {
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to open MO selection modal
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                onOpenMOSelection();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onOpenMOSelection]);
}
