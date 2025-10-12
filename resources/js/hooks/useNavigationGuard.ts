import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

interface UseNavigationGuardOptions {
    hasChanges: boolean;
    message?: string;
    onNavigate?: (url: string) => Promise<boolean>;
}

export function useNavigationGuard({
    hasChanges,
    message = 'You have unsaved changes. Are you sure you want to leave?',
    onNavigate
}: UseNavigationGuardOptions) {
    const isNavigatingRef = useRef(false);

    useEffect(() => {
        // Browser beforeunload handler
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges && !isNavigatingRef.current) {
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        };

        // Inertia navigation handler
        const handleInertiaNavigate = (event: Event) => {
            const customEvent = event as CustomEvent<{ visit: { url: string; prefetch?: boolean; preserveState?: boolean } }>;

            // Skip if this is a prefetch request (hover)
            if (customEvent.detail.visit.prefetch) {
                return;
            }

            // Skip if this is a state-preserving request (like form submission)
            if (customEvent.detail.visit.preserveState) {
                return;
            }

            if (hasChanges && !isNavigatingRef.current) {
                event.preventDefault();

                // If we have a custom navigation handler, use it
                if (onNavigate) {
                    onNavigate(customEvent.detail.visit.url).then((shouldNavigate) => {
                        if (shouldNavigate) {
                            isNavigatingRef.current = true;
                            router.visit(customEvent.detail.visit.url);
                        }
                    });
                } else {
                    // Default behavior - show browser confirm dialog
                    if (window.confirm(message)) {
                        isNavigatingRef.current = true;
                        router.visit(customEvent.detail.visit.url);
                    }
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('inertia:before', handleInertiaNavigate);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('inertia:before', handleInertiaNavigate);
        };
    }, [hasChanges, message, onNavigate]);

    // Reset the navigation flag when hasChanges becomes false
    useEffect(() => {
        if (!hasChanges) {
            isNavigatingRef.current = false;
        }
    }, [hasChanges]);

    return {
        allowNavigation: () => {
            isNavigatingRef.current = true;
        }
    };
}
