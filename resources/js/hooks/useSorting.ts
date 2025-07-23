import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

// Standalone sorting hook for Inertia-based components
export interface UseSortingProps {
    routeName: string;
    initialSort?: string;
    initialDirection?: 'asc' | 'desc';
    additionalParams?: Record<string, string | number>;
    sortParamName?: string;
    directionParamName?: string;
}

export interface UseSortingReturn {
    sort: string;
    direction: 'asc' | 'desc';
    handleSort: (columnId: string) => void;
}

export function useSorting({
    routeName,
    initialSort = 'name',
    initialDirection = 'asc',
    additionalParams = {},
    sortParamName = 'sort',
    directionParamName = 'direction'
}: UseSortingProps): UseSortingReturn {
    // Ensure initialSort and initialDirection are never null
    const [currentSortField, setCurrentSortField] = useState(initialSort ?? 'name');
    const [currentSortDirection, setCurrentSortDirection] = useState<'asc' | 'desc'>(initialDirection ?? 'asc');

    const handleSort = useCallback(
        (columnId: string) => {
            let newDirection: 'asc' | 'desc' = 'asc';
            const newSort = columnId;

            if (currentSortField === columnId) {
                newDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            }

            setCurrentSortField(newSort);
            setCurrentSortDirection(newDirection);

            // Filter out null/undefined values from additionalParams
            const cleanParams = Object.fromEntries(
                Object.entries(additionalParams || {}).filter(([, value]) => value !== null && value !== undefined)
            );

            // Navigate using Inertia
            router.get(
                route(routeName),
                {
                    ...cleanParams,
                    [sortParamName]: newSort,
                    [directionParamName]: newDirection,
                },
                { preserveState: true, preserveScroll: true },
            );
        },
        [currentSortField, currentSortDirection, routeName, additionalParams, sortParamName, directionParamName],
    );

    return {
        sort: currentSortField,
        direction: currentSortDirection,
        handleSort,
    };
}
