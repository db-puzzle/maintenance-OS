import { useState, useCallback, useEffect } from 'react';

export interface TreeNode {
    id: string | number;
    children?: TreeNode[];
    [key: string]: unknown;
}

export function useTreeExpansion<T extends TreeNode>(
    items: T[],
    defaultExpanded: boolean = true
) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [currentLevel, setCurrentLevel] = useState<number>(1);
    const [isInitialized, setIsInitialized] = useState(false);

    // Calculate the maximum depth of the tree
    const calculateMaxDepth = useCallback((nodes: T[], currentDepth: number = 0): number => {
        if (!nodes || nodes.length === 0) return currentDepth;

        let maxChildDepth = currentDepth;
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                const childDepth = calculateMaxDepth(node.children as T[], currentDepth + 1);
                maxChildDepth = Math.max(maxChildDepth, childDepth);
            }
        });

        return maxChildDepth;
    }, []);

    // Initialize expansion state when items change
    useEffect(() => {
        if (items.length > 0 && !isInitialized) {
            const newExpanded: Record<string, boolean> = {};

            const processNodes = (nodeList: T[]) => {
                nodeList.forEach(node => {
                    const nodeId = String(node.id);
                    newExpanded[nodeId] = defaultExpanded;
                    if (node.children && node.children.length > 0) {
                        processNodes(node.children as T[]);
                    }
                });
            };

            processNodes(items);
            setExpanded(newExpanded);

            if (defaultExpanded) {
                const depth = calculateMaxDepth(items);
                setCurrentLevel(depth + 1);
            }

            setIsInitialized(true);
        }
    }, [items, defaultExpanded, calculateMaxDepth, isInitialized]);

    // Expand/collapse to a specific level
    const expandToLevel = useCallback((level: number, nodes: T[]) => {
        const newExpanded: Record<string, boolean> = {};

        const processItems = (nodeList: T[], currentDepth: number = 0) => {
            nodeList.forEach(node => {
                const nodeId = String(node.id);
                // Expand if current depth is less than target level
                newExpanded[nodeId] = currentDepth < level;

                if (node.children && node.children.length > 0) {
                    processItems(node.children as T[], currentDepth + 1);
                }
            });
        };

        processItems(nodes);
        setExpanded(newExpanded);
        setCurrentLevel(level);
    }, []);

    // Toggle individual node expansion
    const toggleNode = useCallback((nodeId: string | number) => {
        const id = String(nodeId);
        setExpanded(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    }, []);

    // Expand all nodes
    const expandAll = useCallback((nodes: T[]) => {
        const depth = calculateMaxDepth(nodes);
        expandToLevel(depth + 1, nodes);
    }, [calculateMaxDepth, expandToLevel]);

    // Collapse all nodes
    const collapseAll = useCallback(() => {
        setExpanded({});
        setCurrentLevel(0);
    }, []);

    return {
        expanded,
        currentLevel,
        maxDepth: calculateMaxDepth(items),
        toggleNode,
        expandToLevel: (level: number) => expandToLevel(level, items),
        expandAll: () => expandAll(items),
        collapseAll,
    };
}
