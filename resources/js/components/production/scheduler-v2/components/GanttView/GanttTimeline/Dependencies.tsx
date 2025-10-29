import React from 'react';
import { TimelineLayout } from '../../../utils/timelineCalculations';

interface Step {
    id: string;
    manufacturing_step_id?: number;
    planned_start_date: string;
    planned_end_date: string;
    predecessors?: number[];
}

interface Row {
    type: string;
    data: {
        id: string;
    };
}

interface DependenciesProps {
    steps: Step[];
    rows: Row[];
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
    const dependencyLines: React.ReactElement[] = [];

    steps.forEach((step) => {
        const toRowIndex = stepRowMap.get(step.id);
        if (toRowIndex === undefined) return;

        step.predecessors?.forEach((predecessorId: number) => {
            // The predecessorId refers to the manufacturing_step_id
            const fromStep = steps.find(s => s.manufacturing_step_id === predecessorId);
            if (!fromStep) return;

            const fromRowIndex = stepRowMap.get(fromStep.id);
            if (fromRowIndex === undefined) return;

            // Calculate positions
            // From: right edge of predecessor task
            const fromX = layout.getPositionForDate(new Date(fromStep.planned_end_date));
            const fromY = fromRowIndex * rowHeight + rowHeight / 2;

            // To: top of successor task, with small offset to align with the task bar
            const toX = layout.getPositionForDate(new Date(step.planned_start_date)) + 10; // 10px offset from start
            const toY = toRowIndex * rowHeight;

            // Create path
            const path = createDependencyPath(fromX, fromY, toX, toY, rowHeight);

            dependencyLines.push(
                <g key={`dep-${fromStep.id}-${step.id}`}>
                    <path
                        d={path}
                        fill="none"
                        stroke="var(--gantt-dependency, #9CA3AF)"
                        strokeWidth="1.5"
                        markerEnd="url(#arrowhead)"
                        className="opacity-40 hover:opacity-100 transition-opacity"
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
                    markerWidth="5"
                    markerHeight="5"
                    refX="2.5"
                    refY="0"
                    orient="0"
                    markerUnits="strokeWidth"
                >
                    <path
                        d="M 0 0 L 2.5 5 L 5 0"
                        fill="var(--gantt-dependency, #9CA3AF)"
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
    toY: number,
    _rowHeight: number
): string {
    // Create a simple inverted L-shaped path
    // Exit from the right edge of the predecessor
    // Enter from the top of the successor

    // End at the top of the successor, slightly down to connect with the arrow
    const endY = toY + 3; // 3px down from the top of the row

    // Create a clean inverted L-shape with only 3 points
    return `
        M ${fromX} ${fromY}
        L ${toX} ${fromY}
        L ${toX} ${endY}
    `;
}

