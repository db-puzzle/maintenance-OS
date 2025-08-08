import React, { useState, useEffect } from 'react';
import {
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export interface TreeNode {
    id: string | number;
    children?: TreeNode[];
    [key: string]: unknown;
}
export interface TreeViewProps<T extends TreeNode> {
    data: T[];
    renderNode: (node: T, isExpanded: boolean, toggleExpand: () => void) => React.ReactNode;
    emptyState?: React.ReactNode;
    className?: string;
    defaultExpanded?: boolean | ((node: T) => boolean);
    expanded?: Record<string, boolean>;
    onToggleExpand?: (id: string) => void;
    onNodeClick?: (node: T) => void;
}
interface TreeItemProps<T extends TreeNode> {
    node: T;
    depth: number;
    isLast: boolean;
    parentConnectorLines: boolean[];
    expanded: Record<string, boolean>;
    toggleExpand: (id: string) => void;
    renderNode: (node: T, isExpanded: boolean, toggleExpand: () => void) => React.ReactNode;
    onNodeClick?: (node: T) => void;
}
function TreeItem<T extends TreeNode>({
    node,
    depth,
    isLast,
    parentConnectorLines,
    expanded,
    toggleExpand,
    renderNode,
    onNodeClick,
}: TreeItemProps<T>) {
    const nodeId = String(node.id);
    const isExpanded = expanded[nodeId] || false;
    const hasChildren = node.children && node.children.length > 0;
    const childConnectorLines = [...parentConnectorLines];
    if (depth > 0) {
        childConnectorLines.push(!isLast);
    }
    const handleToggle = () => {
        if (hasChildren) {
            toggleExpand(nodeId);
        }
    };
    return (
        <div className="w-full">
            <div className="flex">
                {/* Connector lines */}
                {parentConnectorLines.map((showLine, i) => (
                    <div key={`connector-${i}`} className="w-6 relative">
                        {showLine && <div className="absolute h-full w-0 border-l-2 border-gray-300 left-3 top-0"></div>}
                    </div>
                ))}
                {depth > 0 && (
                    <div className="w-6 relative">
                        <div className="absolute h-1/2 w-0 border-l-2 border-gray-300 left-3 top-0"></div>
                        <div className="absolute w-3 border-t-2 border-gray-300 left-3 top-1/2"></div>
                        {!isLast && <div className="absolute h-1/2 w-0 border-l-2 border-gray-300 left-3 top-1/2"></div>}
                    </div>
                )}
                {/* Node content */}
                <div
                    className={cn(
                        "flex-grow my-0.5 transition-all",
                        onNodeClick && "cursor-pointer"
                    )}
                    onClick={() => onNodeClick?.(node)}
                >
                    <div className="flex items-center gap-2">
                        {/* Expand/collapse button */}
                        {hasChildren && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggle();
                                }}
                            >
                                <div className={cn(
                                    "transition-transform duration-200 ease-in-out",
                                    isExpanded ? "rotate-90" : "rotate-0"
                                )}>
                                    <ChevronRight size={14} />
                                </div>
                            </Button>
                        )}
                        {!hasChildren && <div className="w-5"></div>}
                        {/* Render custom node content */}
                        {renderNode(node, isExpanded, handleToggle)}
                    </div>
                </div>
            </div>
            {/* Render children with animation */}
            {hasChildren && (
                <div
                    className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        isExpanded
                            ? "max-h-[10000px] opacity-100"
                            : "max-h-0 opacity-0"
                    )}
                >
                    <div className="transition-transform duration-300 ease-in-out">
                        {node.children!.map((child, index) => (
                            <TreeItem
                                key={child.id}
                                node={child as T}
                                depth={depth + 1}
                                isLast={index === node.children!.length - 1}
                                parentConnectorLines={childConnectorLines}
                                expanded={expanded}
                                toggleExpand={toggleExpand}
                                renderNode={renderNode}
                                onNodeClick={onNodeClick}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
export default function TreeView<T extends TreeNode>({
    data,
    renderNode,
    emptyState,
    className,
    defaultExpanded = false,
    expanded: controlledExpanded,
    onToggleExpand,
    onNodeClick,
}: TreeViewProps<T>) {
    const [internalExpanded, setInternalExpanded] = useState<Record<string, boolean>>({});
    // Use controlled expanded state if provided, otherwise use internal state
    const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
    const _setExpanded = controlledExpanded !== undefined
        ? (_error: unknown) => {
            // For controlled mode, we don't update state directly
            console.warn('TreeView is in controlled mode. Use onToggleExpand to update expanded state.');
        }
        : setInternalExpanded;
    // Initialize expanded state only for uncontrolled mode
    useEffect(() => {
        if (controlledExpanded === undefined) {
            const initialExpanded: Record<string, boolean> = {};
            const processNodes = (nodes: T[]) => {
                nodes.forEach(node => {
                    const nodeId = String(node.id);
                    if (typeof defaultExpanded === 'function') {
                        initialExpanded[nodeId] = defaultExpanded(node);
                    } else if (defaultExpanded) {
                        initialExpanded[nodeId] = true;
                    }
                    if (node.children && node.children.length > 0) {
                        processNodes(node.children as T[]);
                    }
                });
            };
            processNodes(data);
            setInternalExpanded(initialExpanded);
        }
    }, [data, defaultExpanded, controlledExpanded]);
    const toggleExpand = (id: string) => {
        if (onToggleExpand) {
            onToggleExpand(id);
        } else {
            setInternalExpanded(prev => ({
                ...prev,
                [id]: !prev[id]
            }));
        }
    };
    if (data.length === 0 && emptyState) {
        return <>{emptyState}</>;
    }
    return (
        <div className={cn("w-full", className)}>
            {data.map((node, index) => (
                <TreeItem
                    key={node.id}
                    node={node}
                    depth={0}
                    isLast={index === data.length - 1}
                    parentConnectorLines={[]}
                    expanded={expanded}
                    toggleExpand={toggleExpand}
                    renderNode={renderNode}
                    onNodeClick={onNodeClick}
                />
            ))}
        </div>
    );
} 