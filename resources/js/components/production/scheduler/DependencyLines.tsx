import React from 'react';
import { useScheduler } from '@/hooks/production/useScheduler';

interface DependencyLinesProps {
    getPositionForStep: (stepId: number) => { x: number; y: number; width: number; height: number } | null;
}

export function DependencyLines({ getPositionForStep }: DependencyLinesProps) {
    const scheduler = useScheduler();
    
    const renderDependencyLine = (fromStepId: number, toStepId: number) => {
        const fromPos = getPositionForStep(fromStepId);
        const toPos = getPositionForStep(toStepId);
        
        if (!fromPos || !toPos) return null;
        
        // Calculate line coordinates
        const startX = fromPos.x + fromPos.width;
        const startY = fromPos.y + fromPos.height / 2;
        const endX = toPos.x;
        const endY = toPos.y + toPos.height / 2;
        
        // Create path for the dependency line
        const path = `M ${startX} ${startY} L ${endX} ${endY}`;
        
        return (
            <g key={`dep-${fromStepId}-${toStepId}`}>
                <path
                    d={path}
                    stroke="#666"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="5,5"
                    markerEnd="url(#arrowhead)"
                />
            </g>
        );
    };
    
    const dependencies: Array<{ from: number; to: number }> = [];
    
    // Collect all dependencies
    scheduler.orders.forEach(order => {
        order.steps.forEach(step => {
            if (step.depends_on_step_id) {
                dependencies.push({
                    from: step.depends_on_step_id,
                    to: step.id
                });
            }
        });
    });
    
    return (
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
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
                        fill="#666"
                    />
                </marker>
            </defs>
            {dependencies.map(dep => renderDependencyLine(dep.from, dep.to))}
        </svg>
    );
}