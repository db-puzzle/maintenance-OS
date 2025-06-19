// Shared type definitions for the entity management system

export interface PaginationMeta {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
}

export interface DependencyResult {
    can_delete: boolean;
    has_dependencies?: boolean;
    dependencies: {
        [key: string]: {
            total?: number;
            count?: number;
            label?: string;
            items?: Array<{
                id: number;
                name?: string;
                tag?: string;
                description?: string;
                [key: string]: any;
            }>;
        };
    };
}

export interface ColumnConfig {
    key: string;
    label: string;
    sortable?: boolean;
    visible?: boolean;
    width?: string;
    render?: (value: any, row: any) => React.ReactNode;
}

export interface BaseEntity {
    id: number;
    created_at?: string;
    updated_at?: string;
}

export interface FormErrors {
    [key: string]: string | string[];
}
