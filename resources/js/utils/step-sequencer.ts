import { ManufacturingStep } from '@/types/production';

export interface SequencedStep extends ManufacturingStep {
    display_position: number;
}

export function sequenceSteps(steps: ManufacturingStep[]): SequencedStep[] {
    if (!steps || steps.length === 0) {
        return []; // Handle empty routes
    }

    const sequenced: SequencedStep[] = [];

    // Find root step (no depends_on_step_id)
    let current = steps.find(s => !s.depends_on_step_id);

    // If no root step found (shouldn't happen in valid routes), 
    // treat the first step as root for display purposes
    if (!current && steps.length > 0) {
        console.warn('No root step found in route, using first step as root');
        current = steps[0];
    }

    let position = 1;
    const visited = new Set<number>();

    while (current) {
        // Prevent infinite loops in case of circular dependencies
        if (visited.has(current.id)) {
            console.error('Circular dependency detected in route steps', {
                step_id: current.id,
                visited: Array.from(visited)
            });
            break;
        }

        visited.add(current.id);

        sequenced.push({
            ...current,
            display_position: position++
        });

        // Find the next step that depends on current step
        current = steps.find(s => s.depends_on_step_id === current!.id);
    }

    // Check if we missed any steps (disconnected steps)
    if (sequenced.length !== steps.length) {
        console.warn(`Some steps are disconnected from the main chain. Found ${sequenced.length} connected steps out of ${steps.length} total`);
    }

    return sequenced;
}

export function getStepPosition(step: ManufacturingStep, steps: ManufacturingStep[]): number {
    const sequenced = sequenceSteps(steps);
    return sequenced.find(s => s.id === step.id)?.display_position || 0;
}

export function calculateDisplayPositions(steps: ManufacturingStep[]): Map<number | string, number> {
    const positionMap = new Map<number | string, number>();
    const sequenced = sequenceSteps(steps);

    sequenced.forEach(step => {
        positionMap.set(step.id, step.display_position);
    });

    return positionMap;
}