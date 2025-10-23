import React from 'react';
import { cn } from '@/lib/utils';

export type ConnectionType = 'horizontal' | 'dependency';

export interface StepConnectorProps {
    type: ConnectionType;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    className?: string;
}

/**
 * MOViewerStepConnector - Draws connection lines between steps
 * 
 * According to specification:
 * - Horizontal lines connect sequential steps within the same MO
 * - Dependency lines connect final step of child MO to first step of parent MO
 * - All connection lines use identical styling (no visual differentiation)
 * - Lines may route around other elements to avoid overlap
 */
export function MOViewerStepConnector({
    type,
    startX,
    startY,
    endX,
    endY,
    className
}: StepConnectorProps) {
    // Calculate path for the connector
    const calculatePath = () => {
        if (type === 'horizontal') {
            // Simple horizontal line
            return `M ${startX} ${startY} L ${endX} ${endY}`;
        } else {
            // Dependency line with routing
            // Exit from right edge, travel horizontally to align with target, then vertically

            // Create smooth curved path: horizontal first, then vertical with a curve
            const cornerRadius = 15; // Radius for the curve
            const horizontalEnd = endX - cornerRadius;
            const verticalStart = startY + (endY > startY ? cornerRadius : -cornerRadius);

            // Path with smooth curve at the corner
            return `M ${startX} ${startY} L ${horizontalEnd} ${startY} Q ${endX} ${startY} ${endX} ${verticalStart} L ${endX} ${endY}`;
        }
    };

    return (
        <svg
            className={cn("absolute pointer-events-none", className)}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible'
            }}
        >
            <path
                d={calculatePath()}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-400 dark:text-gray-600"
            />
            {/* Arrow marker for dependency connections */}
            {type === 'dependency' && (
                <>
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                        >
                            <polygon
                                points="0 0, 10 3.5, 0 7"
                                className="fill-current text-gray-400 dark:text-gray-600"
                            />
                        </marker>
                    </defs>
                    <path
                        d={calculatePath()}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-400 dark:text-gray-600"
                        markerEnd="url(#arrowhead)"
                    />
                </>
            )}
        </svg>
    );
}

/**
 * Helper component to render multiple connectors efficiently
 */
export interface ConnectorData {
    id: string;
    type: ConnectionType;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

export interface StepConnectorLayerProps {
    connectors: ConnectorData[];
    className?: string;
}

export function MOViewerStepConnectorLayer({ connectors, className }: StepConnectorLayerProps) {
    return (
        <svg
            className={cn("absolute inset-0 pointer-events-none", className)}
            style={{ width: '100%', height: '100%' }}
        >
            <defs>
                <marker
                    id="dependency-arrow"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon
                        points="0 0, 10 3.5, 0 7"
                        className="fill-current text-gray-400 dark:text-gray-600"
                    />
                </marker>
            </defs>
            {connectors.map(connector => {
                const path = connector.type === 'horizontal'
                    ? `M ${connector.startX} ${connector.startY} L ${connector.endX} ${connector.endY}`
                    : (() => {
                        // Dependency routing logic - horizontal first, then vertical with smooth curve
                        const cornerRadius = 15;
                        const horizontalEnd = connector.endX - cornerRadius;
                        const verticalStart = connector.startY + (connector.endY > connector.startY ? cornerRadius : -cornerRadius);

                        return `M ${connector.startX} ${connector.startY} L ${horizontalEnd} ${connector.startY} Q ${connector.endX} ${connector.startY} ${connector.endX} ${verticalStart} L ${connector.endX} ${connector.endY}`;
                    })();

                return (
                    <path
                        key={connector.id}
                        d={path}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-400 dark:text-gray-600"
                        markerEnd={connector.type === 'dependency' ? 'url(#dependency-arrow)' : undefined}
                    />
                );
            })}
        </svg>
    );
}
