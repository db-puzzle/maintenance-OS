import { ColumnConfig } from '@/types/shared';

/**
 * Creates a type-safe column configuration for EntityDataTable
 * @param columns - Array of column configurations
 * @returns Array of column configurations with proper typing
 */
export function createColumns<T = Record<string, unknown>>(columns: ColumnConfig<T>[]): ColumnConfig<T>[] {
    return columns;
}

/**
 * Type-safe render function for table columns
 */
export type RenderFunction<T = Record<string, unknown>> = (value: unknown, row: T) => React.ReactNode;
