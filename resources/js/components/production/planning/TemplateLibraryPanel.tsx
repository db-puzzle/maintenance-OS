import React from 'react';

interface TemplateLibraryPanelProps {
    templates: any[];
    permissions: any;
    onApplyTemplate: (templateId: number) => void;
}

export default function TemplateLibraryPanel({
    templates,
    permissions,
    onApplyTemplate
}: TemplateLibraryPanelProps) {
    return (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Template Library</h2>
            <p className="text-muted-foreground">Browse and apply route templates</p>
            <div className="mt-4">
                <p className="text-sm">Available templates: {templates.length}</p>
            </div>
        </div>
    );
}