import { ManufacturingOrder } from '@/types/production';
import { GenericTreeNode } from '../shared/GenericHierarchicalTreeView';

// Extend ManufacturingOrder with tree structure
export interface ManufacturingOrderTreeNode extends ManufacturingOrder, GenericTreeNode {
    id: number;
    children?: ManufacturingOrderTreeNode[];
    [key: string]: unknown; // Index signature for GenericTreeNode compatibility
}

export type OrderStatus = 'draft' | 'planned' | 'released' | 'in_progress' | 'completed' | 'cancelled';
export type RouteStatus = 'complete' | 'in-progress' | 'no-route' | 'empty';

export interface RouteCompleteness {
    configured: number;
    required: number;
    percentage: number;
}
