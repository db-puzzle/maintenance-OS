export interface Skill {
    id: number;
    name: string;
    description?: string | null;
    category: string;
    active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Certification {
    id: number;
    name: string;
    description?: string | null;
    issuing_organization: string;
    validity_period_days?: number | null;
    validity_days?: number;
    active: boolean;
    created_at?: string;
    updated_at?: string;
}