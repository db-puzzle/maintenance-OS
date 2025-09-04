import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextInput } from '@/components/TextInput';
import { Textarea } from '@/components/ui/textarea';
import { ItemSelect } from '@/components/ItemSelect';
import { createFormAdapter } from '@/utils/form-adapters';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { ManufacturingRoute } from '@/types/production';
import { toast } from 'sonner';

interface SaveAsTemplateDialogProps {
    route: ManufacturingRoute;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SaveAsTemplateDialog: React.FC<SaveAsTemplateDialogProps> = ({
    route,
    open,
    onOpenChange
}) => {
    const [currentTag, setCurrentTag] = useState('');

    const form = useForm({
        name: `Template from ${route.name}`,
        description: route.description || '',
        item_category_id: route.item?.item_category_id || null,
        tags: [] as string[],
        notes: ''
    });

    const formAdapter = createFormAdapter(form);

    const handleAddTag = () => {
        const tag = currentTag.trim();
        if (tag && !form.data.tags.includes(tag)) {
            form.setData('tags', [...form.data.tags, tag]);
            setCurrentTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        form.setData('tags', form.data.tags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        form.post(route(`production.routes.save-as-template`, route.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Route saved as template successfully');
                onOpenChange(false);
            },
            onError: () => {
                toast.error('Failed to save template');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Save Route as Template</DialogTitle>
                    <DialogDescription>
                        Create a reusable template from this manufacturing route.
                        The template will preserve all steps and configurations.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Template Name</Label>
                        <TextInput
                            id="name"
                            form={formAdapter}
                            name="name"
                            placeholder="Enter template name"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder="Describe when to use this template"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Item Category (Optional)</Label>
                        <ItemSelect
                            value={form.data.item_category_id}
                            onValueChange={(value) => form.setData('item_category_id', value)}
                            type="category"
                            placeholder="Select category to restrict template usage"
                            isClearable
                        />
                        <p className="text-sm text-muted-foreground">
                            If specified, this template will be recommended for items in this category
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Tags</Label>
                        <div className="flex gap-2">
                            <TextInput
                                value={currentTag}
                                onChange={(e) => setCurrentTag(e.target.value)}
                                placeholder="Add tags (e.g., welding, assembly)"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleAddTag}
                                disabled={!currentTag.trim()}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {form.data.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {form.data.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="gap-1">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="ml-1 hover:text-destructive"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder="Any additional notes about this template"
                            rows={2}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={form.processing}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving...' : 'Save as Template'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
