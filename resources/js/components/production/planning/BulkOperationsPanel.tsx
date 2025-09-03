import React from 'react';

interface BulkOperationsPanelProps {
    selectedMOs: number[];
    templates: any[];
    permissions: any;
}

export default function BulkOperationsPanel({
    selectedMOs,
    templates,
    permissions
}: BulkOperationsPanelProps) {
    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Bulk Operations</h2>
            <p className="text-muted-foreground">Perform operations on {selectedMOs.length} selected orders</p>
            <div className="mt-4">
                <p className="text-sm">Available templates: {templates.length}</p>
            </div>
        </div>
    );
}