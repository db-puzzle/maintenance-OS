import React, { useEffect, useRef } from 'react';
import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import { TextInput } from '@/components/TextInput';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ItemCategory } from '@/types/production';
interface ItemCategoryForm {
    [key: string]: string | number | boolean | null | undefined;
    name: string;
    description: string;
    is_active: boolean;
}
interface CreateItemCategorySheetProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
    category?: ItemCategory;
    mode?: 'create' | 'edit';
}
const CreateItemCategorySheet: React.FC<CreateItemCategorySheetProps> = ({
    open: controlledOpen,
    onOpenChange,
    onSuccess,
    triggerText = 'Nova Categoria',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
    category,
    mode = 'create',
}) => {
    const nameInputRef = useRef<HTMLInputElement>(null);
    // Auto-focus the name input when sheet opens for creation
    useEffect(() => {
        if (controlledOpen && mode === 'create') {
            // Use requestAnimationFrame to ensure the DOM is ready
            const focusInput = () => {
                requestAnimationFrame(() => {
                    if (nameInputRef.current) {
                        nameInputRef.current.focus();
                        nameInputRef.current.select();
                    }
                });
            };
            // Try multiple times with increasing delays to handle animation and focus traps
            const timeouts = [100, 300, 500];
            const timers = timeouts.map((delay) => setTimeout(focusInput, delay));
            // Cleanup timeouts
            return () => {
                timers.forEach((timer) => clearTimeout(timer));
            };
        }
    }, [controlledOpen, mode]);
    // Handle onOpenChange to focus when sheet opens
    const handleOpenChange = (open: boolean) => {
        if (onOpenChange) {
            onOpenChange(open);
        }
        // Focus the input when opening in create mode
        if (open && mode === 'create') {
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 100);
        }
    };
    return (
        <BaseEntitySheet<ItemCategoryForm>
            entity={category}
            open={controlledOpen}
            onOpenChange={handleOpenChange}
            mode={mode}
            onSuccess={onSuccess}
            triggerText={triggerText}
            triggerVariant={triggerVariant}
            showTrigger={showTrigger}
            triggerRef={triggerRef}
            width="sm:max-w-md"
            formConfig={{
                initialData: {
                    name: '',
                    description: '',
                    is_active: true,
                } as ItemCategoryForm,
                createRoute: 'production.categories.store',
                updateRoute: 'production.categories.update',
                entityName: 'Categoria de Item',
                routeParameterName: 'category',
            }}
        >
            {({ data, setData, errors }) => (
                <>
                    {/* Nome da Categoria - Campo Obrigatório */}
                    <TextInput
                        ref={nameInputRef}
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="name"
                        label="Nome da Categoria"
                        placeholder="Nome da categoria"
                        required
                    />
                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-muted-foreground text-sm">
                            Descrição
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Descrição da categoria"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            className="min-h-[80px]"
                        />
                        {errors.description && <p className="text-destructive text-sm">{errors.description}</p>}
                    </div>
                    {/* Status */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData('is_active', !!checked)}
                        />
                        <Label
                            htmlFor="is_active"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Categoria ativa
                        </Label>
                    </div>
                </>
            )}
        </BaseEntitySheet>
    );
};
export default CreateItemCategorySheet; 