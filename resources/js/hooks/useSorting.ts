import { useState, useCallback } from 'react';
import { router } from '@inertiajs/react';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: any) => string;

// Standalone sorting hook for Inertia-based components
export interface UseSortingProps {
    routeName: string;
    initialSort?: string;
    initialDirection?: 'asc' | 'desc';
    additionalParams?: Record<string, any>;
}

export function useSorting({
    routeName,
    initialSort = 'name',
    initialDirection = 'asc',
    additionalParams = {}
}: UseSortingProps) {
    const [sort, setSort] = useState(initialSort);
    const [direction, setDirection] = useState<'asc' | 'desc'>(initialDirection);

    const handleSort = useCallback((columnId: string) => {
        let newDirection: 'asc' | 'desc' = 'asc';
        let newSort = columnId;

        if (sort === columnId) {
            newDirection = direction === 'asc' ? 'desc' : 'asc';
        }

        setSort(newSort);
        setDirection(newDirection);

        // Navigate using Inertia
        router.get(
            route(routeName),
            {
                ...additionalParams,
                sort: newSort,
                direction: newDirection
            },
            { preserveState: true, preserveScroll: true }
        );
    }, [sort, direction, routeName, additionalParams]);

    return {
        sort,
        direction,
        handleSort
    };
} 