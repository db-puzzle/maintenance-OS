import React from 'react';
import { cn } from '@/lib/utils';
import TreeView from '@/components/shared/TreeView';
import { TreeNode as BaseTreeNode } from '@/components/shared/TreeView';

export interface GenericTreeNode extends BaseTreeNode {
    id: string | number;
    children?: GenericTreeNode[];
    [key: string]: unknown;
}

export interface GenericHierarchicalTreeViewProps<T extends GenericTreeNode> {
    // Data
    data: T[];

    // Rendering
    renderNode: (node: T, props: NodeRenderProps) => React.ReactNode;
    headerColumns?: React.ReactNode;
    emptyState?: React.ReactNode;
    className?: string;

    // Expansion
    expanded?: Record<string, boolean>;
    onToggleExpand?: (id: string) => void;
    defaultExpanded?: boolean;

    // Interaction
    onNodeClick?: (node: T) => void;

    // Drag and Drop (optional)
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent, node: T) => void;
    onDragOver?: (e: React.DragEvent, targetNode: T) => void;
    onDrop?: (e: React.DragEvent, targetNode: T) => void;
    draggingNodeId?: string | number | null;
}

export interface NodeRenderProps {
    isDragging: boolean;
    isDragTarget: boolean;
    isExpanded: boolean;
    hasChildren: boolean;
    depth: number;
}

export function GenericHierarchicalTreeView<T extends GenericTreeNode>({
    data,
    renderNode,
    headerColumns,
    emptyState,
    className,
    expanded,
    onToggleExpand,
    defaultExpanded = true,
    onNodeClick,
    draggable = false,
    onDragStart,
    onDragOver,
    onDrop,
    draggingNodeId,
}: GenericHierarchicalTreeViewProps<T>) {
    const defaultEmptyState = (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <h3 className="text-lg font-medium">No items found</h3>
            <p className="text-muted-foreground">
                There are no items to display in this view.
            </p>
        </div>
    );

    const renderTreeNode = (node: T, isExpanded: boolean, _toggleExpand: () => void) => {
        const nodeId = String(node.id);
        const isDragging = draggingNodeId !== null && String(draggingNodeId) === nodeId;
        const isDragTarget = draggingNodeId !== null && String(draggingNodeId) !== nodeId;
        const hasChildren = !!node.children && node.children.length > 0;

        const nodeProps: NodeRenderProps = {
            isDragging,
            isDragTarget: isDragTarget && draggable,
            isExpanded,
            hasChildren,
            depth: 0, // We don't have depth info from TreeView
        };

        return (
            <div
                className={cn(
                    "w-full transition-all",
                    isDragging && "opacity-50",
                    isDragTarget && draggable && "hover:border-blue-500 hover:border-dashed"
                )}
                draggable={draggable}
                onDragStart={draggable ? (e) => {
                    e.stopPropagation();
                    onDragStart?.(e, node);
                } : undefined}
                onDragOver={draggable ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDragOver?.(e, node);
                } : undefined}
                onDrop={draggable ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDrop?.(e, node);
                } : undefined}
                onClick={onNodeClick ? () => onNodeClick(node) : undefined}
            >
                {renderNode(node, nodeProps)}
            </div>
        );
    };

    return (
        <div className={cn("w-full", className)}>
            {headerColumns}
            <TreeView<T>
                data={data}
                renderNode={renderTreeNode}
                emptyState={emptyState || defaultEmptyState}
                defaultExpanded={defaultExpanded}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
            />
        </div>
    );
}
