import React from 'react';

interface TemplateLibraryPanelProps {
    templates: Array<{ id: number; name: string; description?: string }>;
    permissions: { canApplyTemplate: boolean };
    onApplyTemplate: (templateId: number) => void;
}

export default function TemplateLibraryPanel({
    templates
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