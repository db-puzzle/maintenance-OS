import React from 'react';
import { useForm } from '@inertiajs/react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/TextInput';
import { TextArea } from '@/components/TextArea';
import { createFormAdapter } from '@/utils/form-adapters';
import { WorkCell } from '@/types';

interface EditWorkCellSheetProps {
    workCell: WorkCell;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function EditWorkCellSheet({
    workCell,
    open,
    onOpenChange,
    onSuccess,
}: EditWorkCellSheetProps) {
    const { data, setData, errors, clearErrors, put, processing } = useForm({
        name: workCell.name,
        code: workCell.code || '',
        description: workCell.description || '',
        type: workCell.type || 'Standard',
        capacity: workCell.capacity?.toString() || '',
        is_active: workCell.is_active,
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        put(route('production.work-cells.update', workCell.id), {
            preserveScroll: true,
            onSuccess: () => {
                onSuccess?.();
                onOpenChange(false);
            },
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Edit Work Cell</SheetTitle>
                    <SheetDescription>
                        Update the work cell information.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                    <TextInput
                        form={formAdapter}
                        name="name"
                        label="Name"
                        placeholder="Enter work cell name"
                        required
                    />

                    <TextInput
                        form={formAdapter}
                        name="code"
                        label="Code"
                        placeholder="Enter work cell code"
                    />

                    <TextArea
                        form={formAdapter}
                        name="description"
                        label="Description"
                        rows={3}
                    />

                    <TextInput
                        form={formAdapter}
                        name="type"
                        label="Type"
                        placeholder="Enter work cell type"
                    />

                    <TextInput
                        form={formAdapter}
                        name="capacity"
                        label="Capacity"
                        placeholder="Enter capacity"
                        type="number"
                    />

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium">
                            Active
                        </label>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
