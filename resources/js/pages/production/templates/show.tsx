import { useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function TemplateShow() {
    useEffect(() => {
        // Immediately redirect back to where we came from
        const referrer = document.referrer;

        if (referrer && referrer.includes('/planning')) {
            router.visit(route('production.planning.index'), {
                preserveState: false,
                preserveScroll: false
            });
        } else if (referrer && referrer.includes('/manufacturing-orders/')) {
            // Extract order ID from referrer and go back to it
            const match = referrer.match(/manufacturing-orders\/(\d+)/);
            if (match) {
                router.visit(route('production.manufacturing-orders.show', match[1]), {
                    preserveState: false,
                    preserveScroll: false
                });
            } else {
                router.visit(route('production.orders.index'));
            }
        } else {
            // Default fallback to planning page
            router.visit(route('production.planning.index'));
        }
    }, []);

    // Show a loading state while redirecting
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Redirecionando...</p>
            </div>
        </div>
    );
}
