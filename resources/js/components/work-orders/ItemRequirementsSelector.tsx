import React from 'react';
import { ItemSelect } from '@/components/ItemSelect';

interface RequirementItem {
    id: number;
    name: string;
}

interface ItemRequirementsSelectorProps<T extends RequirementItem> {
    title: string;
    items: T[];
    selectedItems: T[];
    onAdd: (item: T) => void;
    onRemove: (itemId: number) => void;
    onCreateClick: () => void;
    isViewMode: boolean;
    placeholder: string;
    children: React.ReactNode; // The table component (SkillsTable or CertificationsTable)
}

export function ItemRequirementsSelector<T extends RequirementItem>({
    title,
    items,
    selectedItems,
    onAdd,
    onRemove,
    onCreateClick,
    isViewMode,
    placeholder,
    children
}: ItemRequirementsSelectorProps<T>) {
    const availableItems = items.filter(item =>
        !selectedItems.find(selected => selected.id === item.id)
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-medium">{title}</h4>
            </div>

            {!isViewMode && (
                <ItemSelect
                    items={availableItems}
                    value=""
                    onValueChange={(value) => {
                        const item = items.find(i => i.id.toString() === value);
                        if (item) {
                            onAdd(item);
                        }
                    }}
                    onCreateClick={onCreateClick}
                    placeholder={placeholder}
                    searchable
                    canCreate
                />
            )}

            {children}
        </div>
    );
} 