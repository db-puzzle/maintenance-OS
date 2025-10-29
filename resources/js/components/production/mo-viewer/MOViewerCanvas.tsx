import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MOViewerStepBox, StepStatus } from './MOViewerStepBox';
import { MOViewerStepConnectorLayer, ConnectorData } from './MOViewerStepConnector';
import { MOLabelCard } from './MOLabelCard';

export interface MOStep {
    id: number;
    name: string;
    workcell_name?: string;
    status: StepStatus;
    step_number: number;
    depends_on_step_id?: number;
}

export interface MOData {
    id: number;
    order_number: string;
    parent_id?: number;
    item_number?: string;
    item_name?: string;
    steps: MOStep[];
    children?: MOData[];
}

export interface MOViewerCanvasProps {
    orders: MOData[];
    onStepClick?: (orderId: number, stepId: number) => void;
    className?: string;
    scale?: number;
    highlightedSteps?: Set<number>;
    onSelectPrecedents?: (orderId: number, stepId: number) => void;
    onSelectImmediatePrecedents?: (orderId: number, stepId: number) => void;
    onCanvasClick?: () => void;
}

interface StepPosition {
    orderId: number;
    stepId: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

// Constants for layout
const STEP_WIDTH = 160; // 40 * 4 (tailwind w-40)
const STEP_HEIGHT = 64; // 16 * 4 (tailwind h-16)
const STEP_H_SPACING = 20;
const MO_V_SPACING = 40; // Reduced from 50 for more compact layout
const MO_LABEL_WIDTH = 208; // 52 * 4 (tailwind w-52) - 30% wider than step width to fit more text
const HIERARCHY_INDENT = 40; // Indent per hierarchy level

// Memoized step box component for performance
const MemoizedStepBox = React.memo(MOViewerStepBox);

// Memoized step renderer for performance
interface StepRendererProps {
    position: StepPosition;
    step: MOStep;
    order: MOData;
    onStepClick?: (orderId: number, stepId: number) => void;
    isHighlighted?: boolean;
    onSelectPrecedents?: (orderId: number, stepId: number) => void;
    onSelectImmediatePrecedents?: (orderId: number, stepId: number) => void;
}

const StepRenderer = React.memo<StepRendererProps>(({ position, step, order, onStepClick, isHighlighted, onSelectPrecedents, onSelectImmediatePrecedents }) => {
    const handleClick = useCallback(() => {
        if (onStepClick) {
            onStepClick(position.orderId, position.stepId);
        }
    }, [position.orderId, position.stepId, onStepClick]);

    const handleSelectPrecedents = useCallback(() => {
        if (onSelectPrecedents) {
            onSelectPrecedents(position.orderId, position.stepId);
        }
    }, [position.orderId, position.stepId, onSelectPrecedents]);

    const handleSelectImmediatePrecedents = useCallback(() => {
        if (onSelectImmediatePrecedents) {
            onSelectImmediatePrecedents(position.orderId, position.stepId);
        }
    }, [position.orderId, position.stepId, onSelectImmediatePrecedents]);

    // Check if this is the first step and if the order has children
    const isFirstStep = step.step_number === 1 || order.steps.findIndex(s => s.id === step.id) === 0;
    const hasChildOrders = order.children && order.children.length > 0;
    const hasPrecedents = !!step.depends_on_step_id || (isFirstStep && hasChildOrders);


    return (
        <div
            className="absolute"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`
            }}
        >
            <MemoizedStepBox
                stepName={step.name}
                workcellName={step.workcell_name}
                status={step.status}
                onClick={onStepClick ? handleClick : undefined}
                isHighlighted={isHighlighted}
                onSelectPrecedents={handleSelectPrecedents}
                onSelectImmediatePrecedents={handleSelectImmediatePrecedents}
                hasPrecedents={hasPrecedents}
            />
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return prevProps.position.x === nextProps.position.x &&
        prevProps.position.y === nextProps.position.y &&
        prevProps.step.status === nextProps.step.status &&
        prevProps.step.name === nextProps.step.name &&
        prevProps.step.workcell_name === nextProps.step.workcell_name &&
        prevProps.isHighlighted === nextProps.isHighlighted &&
        prevProps.order.children?.length === nextProps.order.children?.length;
});

/**
 * MOViewerCanvas - Main canvas component for rendering MO hierarchy with steps
 * 
 * According to specification:
 * - Displays hierarchical MO structure with step boxes
 * - Shows dependencies between steps and MOs
 * - Handles up to 1,000 steps efficiently
 * - Provides zoom and pan capabilities
 */
export function MOViewerCanvas({
    orders,
    onStepClick,
    className,
    scale = 1,
    highlightedSteps,
    onSelectPrecedents,
    onSelectImmediatePrecedents,
    onCanvasClick
}: MOViewerCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // Calculate positions for all steps and MOs
    const { stepPositions, moLabelPositions, connectors, dividerLines, canvasWidth, canvasHeight } = useMemo(() => {
        const positions: StepPosition[] = [];
        const labelPositions: Array<{ orderId: number; x: number; y: number; level: number; order: MOData }> = [];
        const connections: ConnectorData[] = [];
        const dividers: Array<{ y: number; width: number }> = [];
        let maxWidth = 0;
        let currentY = 50;


        // Helper to find the rightmost X position of all descendant steps
        const getRightmostDescendantStepX = (order: MOData): number => {
            let maxX = 0;

            const findMaxX = (mo: MOData) => {
                // Check this MO's steps
                const moSteps = positions.filter(p => p.orderId === mo.id);
                moSteps.forEach(step => {
                    maxX = Math.max(maxX, step.x + step.width);
                });

                // Recursively check children
                if (mo.children) {
                    mo.children.forEach(child => findMaxX(child));
                }
            };

            // Start the recursive search from children only
            if (order.children) {
                order.children.forEach(child => findMaxX(child));
            }

            return maxX;
        };

        // Helper to process a single MO and its steps
        const processMO = (mo: MOData, yPos: number, level: number = 0, isParent: boolean = false, parentHasChildren: boolean = false): number => {
            const labelX = 20 + (level * HIERARCHY_INDENT);
            let stepsStartX = MO_LABEL_WIDTH + labelX + 20; // Base position

            // If this is a parent with children, start steps after all descendant steps
            if (isParent && parentHasChildren) {
                const rightmostDescendantX = getRightmostDescendantStepX(mo);
                if (rightmostDescendantX > 0) {
                    stepsStartX = rightmostDescendantX + STEP_H_SPACING * 3; // Add extra spacing for clarity
                }
            }

            const moHeight = STEP_HEIGHT;

            // Store label position
            labelPositions.push({
                orderId: mo.id,
                x: labelX,
                y: yPos,
                level,
                order: mo
            });

            // Process steps for this MO
            // IMPORTANT: Always sort steps to ensure consistent positioning
            // First by step_number, then by ID to handle cases where step_number is the same
            const sortedSteps = [...mo.steps].sort((a, b) => {
                // First sort by step_number
                const stepNumberDiff = a.step_number - b.step_number;
                if (stepNumberDiff !== 0) return stepNumberDiff;

                // If step_numbers are the same, sort by ID to maintain consistent order
                // This handles cases where all steps have step_number = 0
                return a.id - b.id;
            });

            sortedSteps.forEach((step, index) => {
                const x = stepsStartX + (index * (STEP_WIDTH + STEP_H_SPACING));
                const y = yPos;

                positions.push({
                    orderId: mo.id,
                    stepId: step.id,
                    x,
                    y,
                    width: STEP_WIDTH,
                    height: STEP_HEIGHT
                });

                maxWidth = Math.max(maxWidth, x + STEP_WIDTH + 20);

                // Add horizontal connector to next step
                if (index < sortedSteps.length - 1) {
                    connections.push({
                        id: `h-${mo.id}-${step.id}-${sortedSteps[index + 1].id}`,
                        type: 'horizontal',
                        startX: x + STEP_WIDTH,
                        startY: y + STEP_HEIGHT / 2,
                        endX: x + STEP_WIDTH + STEP_H_SPACING,
                        endY: y + STEP_HEIGHT / 2
                    });
                }
            });

            return moHeight;
        };

        // Helper to find last step position of an MO
        const getLastStepPosition = (moId: number): StepPosition | undefined => {
            const moSteps = positions.filter(p => p.orderId === moId);
            return moSteps[moSteps.length - 1];
        };

        // Process all orders hierarchically - two pass approach
        const processOrderHierarchy = (order: MOData, yPosition: number, level: number = 0): number => {
            let totalHeight = 0;
            const hasChildren = order.children && order.children.length > 0;

            // First pass: Calculate positions and process children
            let childrenHeight = 0;
            if (hasChildren) {
                let childrenStartY = yPosition + STEP_HEIGHT + MO_V_SPACING;

                order.children?.forEach(child => {
                    const childHeight = processOrderHierarchy(child, childrenStartY, level + 1);
                    childrenStartY += childHeight + MO_V_SPACING;
                    childrenHeight += childHeight + MO_V_SPACING;
                });
                childrenHeight -= MO_V_SPACING; // Remove last spacing
            }

            // Second pass: Process parent MO with knowledge of child positions
            const parentHeight = processMO(order, yPosition, level, true, hasChildren);
            totalHeight = parentHeight + (hasChildren ? MO_V_SPACING + childrenHeight : 0);

            // Add divider line after this MO
            dividers.push({
                y: yPosition + STEP_HEIGHT + (MO_V_SPACING / 2),
                width: maxWidth
            });

            // Add dependency connectors from children to parent
            if (hasChildren && order.steps.length > 0) {
                const parentFirstStep = positions.find(p => p.orderId === order.id && p.stepId === order.steps[0].id);

                order.children?.forEach(child => {
                    const childLastStep = getLastStepPosition(child.id);
                    if (childLastStep && parentFirstStep) {
                        connections.push({
                            id: `d-${child.id}-${order.id}`,
                            type: 'dependency',
                            startX: childLastStep.x + childLastStep.width,
                            startY: childLastStep.y + childLastStep.height / 2,
                            endX: parentFirstStep.x + parentFirstStep.width / 2,
                            endY: parentFirstStep.y + parentFirstStep.height
                        });
                    }
                });
            }

            return totalHeight;
        };

        // Process all top-level orders
        orders.forEach(order => {
            const orderHeight = processOrderHierarchy(order, currentY, 0);
            currentY += orderHeight + MO_V_SPACING;
        });

        return {
            stepPositions: positions,
            moLabelPositions: labelPositions,
            connectors: connections,
            dividerLines: dividers,
            canvasWidth: maxWidth,
            canvasHeight: currentY
        };
    }, [orders]);

    // Update canvas size when positions change
    useEffect(() => {
        setCanvasSize({ width: canvasWidth, height: canvasHeight });
    }, [canvasWidth, canvasHeight]);

    // Group positions by order for rendering labels
    const orderGroups = useMemo(() => {
        const groups = new Map<number, { order: MOData; positions: StepPosition[] }>();

        const findOrder = (orders: MOData[], id: number): MOData | undefined => {
            for (const order of orders) {
                if (order.id === id) return order;
                if (order.children) {
                    const found = findOrder(order.children, id);
                    if (found) return found;
                }
            }
            return undefined;
        };

        stepPositions.forEach(pos => {
            if (!groups.has(pos.orderId)) {
                const order = findOrder(orders, pos.orderId);
                if (order) {
                    groups.set(pos.orderId, { order, positions: [] });
                }
            }
            groups.get(pos.orderId)?.positions.push(pos);
        });

        return groups;
    }, [orders, stepPositions]);

    return (
        <div className={cn("relative flex flex-col h-full", className)} ref={containerRef}>
            {/* Canvas with horizontal and vertical scrolling */}
            <div className="flex-1 overflow-auto">
                <div
                    className="relative"
                    style={{
                        width: `${canvasSize.width * scale}px`,
                        height: `${canvasSize.height * scale}px`
                    }}
                    onClick={(e) => {
                        // Only trigger canvas click if clicking on the canvas background
                        if (e.target === e.currentTarget) {
                            onCanvasClick?.();
                        }
                    }}
                >
                    <div
                        className="relative"
                        style={{
                            width: `${canvasSize.width}px`,
                            height: `${canvasSize.height}px`,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left'
                        }}
                        onClick={(e) => {
                            // Only trigger canvas click if clicking on the canvas background
                            if (e.target === e.currentTarget) {
                                onCanvasClick?.();
                            }
                        }}
                    >
                        {/* Divider lines - render first so they appear behind everything */}
                        {dividerLines.map((divider, index) => (
                            <div
                                key={`divider-${index}`}
                                className="absolute border-t border-border/20"
                                style={{
                                    left: 0,
                                    top: `${divider.y}px`,
                                    width: '100%',
                                    height: '1px'
                                }}
                            />
                        ))}

                        {/* Connectors layer */}
                        <MOViewerStepConnectorLayer connectors={connectors} />

                        {/* MO Labels as Cards */}
                        {moLabelPositions.map(({ orderId, x, y, level, order }) => {
                            const isParent = !order.parent_id || orders.some(o => o.id === order.id);
                            const hasChildren = order.children && order.children.length > 0;

                            return (
                                <div
                                    key={`label-${orderId}`}
                                    className="absolute"
                                    style={{
                                        left: `${x}px`,
                                        top: `${y}px`
                                    }}
                                >
                                    <MOLabelCard
                                        orderNumber={order.order_number}
                                        level={level}
                                        isParent={isParent}
                                        hasChildren={hasChildren}
                                        itemNumber={order.item_number}
                                        itemName={order.item_name}
                                    />
                                </div>
                            );
                        })}

                        {/* Step boxes - optimized rendering */}
                        {stepPositions.map(position => {
                            const order = orderGroups.get(position.orderId)?.order;
                            const step = order?.steps.find(s => s.id === position.stepId);

                            if (!step || !order) return null;

                            // Create a new order object with sorted steps to ensure consistency
                            const orderWithSortedSteps = {
                                ...order,
                                steps: [...order.steps].sort((a, b) => {
                                    // First sort by step_number
                                    const stepNumberDiff = a.step_number - b.step_number;
                                    if (stepNumberDiff !== 0) return stepNumberDiff;

                                    // If step_numbers are the same, sort by ID to maintain consistent order
                                    return a.id - b.id;
                                })
                            };

                            return (
                                <StepRenderer
                                    key={`step-${position.orderId}-${position.stepId}`}
                                    position={position}
                                    step={step}
                                    order={orderWithSortedSteps}
                                    onStepClick={onStepClick}
                                    isHighlighted={highlightedSteps?.has(position.stepId)}
                                    onSelectPrecedents={onSelectPrecedents}
                                    onSelectImmediatePrecedents={onSelectImmediatePrecedents}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
