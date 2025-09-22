import React from 'react';
import { TimelineLayout } from '../../../utils/timelineCalculations';

interface DependenciesProps {
    steps: any[];
    rows: any[];
    rowHeight: number;
    layout: TimelineLayout;
}

export const Dependencies: React.FC<DependenciesProps> = ({
    steps,
    rows,
    rowHeight,
    layout,
}) => {
    // Create a map of step IDs to their row positions
    const stepRowMap = new Map<string, number>();
    rows.forEach((row, index) => {
        if (row.type === 'step') {
            stepRowMap.set(row.data.id, index);
        }
    });

    // Generate dependency lines
    const dependencyLines: JSX.Element[] = [];

    steps.forEach((step) => {
        const fromRowIndex = stepRowMap.get(step.id);
        if (fromRowIndex === undefined) return;

        step.predecessors?.forEach((predecessorId: number) => {
            const toStep = steps.find(s => s.manufacturing_step_id === predecessorId);
            if (!toStep) return;

            const toRowIndex = stepRowMap.get(toStep.id);
            if (toRowIndex === undefined) return;

            // Calculate positions
            const fromX = layout.getPositionForDate(new Date(step.planned_start_date));
            const fromY = fromRowIndex * rowHeight + rowHeight / 2;

            const toX = layout.getPositionForDate(new Date(toStep.planned_end_date));
            const toY = toRowIndex * rowHeight + rowHeight / 2;

            // Create path
            const path = createDependencyPath(toX, toY, fromX, fromY);

            dependencyLines.push(
                <g key={`dep-${toStep.id}-${step.id}`}>
                    <path
                        d={path}
                        fill="none"
                        stroke="var(--gantt-dependency)"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                        className="opacity-60 hover:opacity-100 transition-opacity"
                    />
                </g>
            );
        });
    });

    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: layout.totalWidth, height: rows.length * rowHeight }}
        >
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
                        fill="var(--gantt-dependency)"
                    />
                </marker>
            </defs>
            {dependencyLines}
        </svg>
    );
};

function createDependencyPath(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
): string {
    // Create a smooth curve between tasks
    const midX = (fromX + toX) / 2;

    return `
        M ${fromX} ${fromY}
        C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}
    `;
}

