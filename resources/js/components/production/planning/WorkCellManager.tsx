import React from 'react';
import { WorkCell } from '@/types';

interface WorkCellManagerProps {
    workCells: WorkCell[];
    permissions: {
        canCreateWorkCell: boolean;
        canViewWorkCells: boolean;
    };
}

export default function WorkCellManager({
    workCells
}: WorkCellManagerProps) {
    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Work Cell Manager</h2>
            <p className="text-muted-foreground">Work cell management interface - To be implemented</p>
            <div className="mt-4">
                <p className="text-sm">Available work cells: {workCells.length}</p>
            </div>
        </div>
    );
}