import { useForm } from '@inertiajs/react';
import React, { useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export interface BaseEntitySheetProps<TFormData extends Record<string, any>> {
    // Entity data for edit mode
    entity?: any;
    // Sheet state
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    // Mode
    mode?: 'create' | 'edit';
    // Callbacks
    onSuccess?: () => void;
    // Trigger props (for controlled trigger)
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
    // Form configuration
    formConfig: {
        initialData: TFormData;
        createRoute: string;
        updateRoute?: string;
        entityName: string;
        sheetTitle?: {
            create?: string;
            edit?: string;
        };
        sheetDescription?: {
            create?: string;
            edit?: string;
        };
    };
    // Children render prop for form fields
    children: (props: {
        data: TFormData;
        setData: (key: keyof TFormData | TFormData, value?: any) => void;
        errors: Partial<Record<keyof TFormData, string>>;
        processing: boolean;
    }) => React.ReactNode;
}

export function BaseEntitySheet<TFormData extends Record<string, any>>({
    entity,
    open: controlledOpen,
    onOpenChange,
    mode = 'create',
    onSuccess,
    triggerText,
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
    formConfig,
    children,
}: BaseEntitySheetProps<TFormData>) {
    const isEditMode = mode === 'edit' && entity;

    const { data, setData, post, put, processing, errors, reset } = useForm<TFormData>(
        formConfig.initialData
    );

    const [internalSheetOpen, setInternalSheetOpen] = React.useState(false);

    // Determine whether to use internal or external control
    const sheetOpen = showTrigger ? internalSheetOpen : (controlledOpen ?? false);
    const setSheetOpen = showTrigger ? setInternalSheetOpen : (onOpenChange ?? (() => { }));

    // Update form data when entity changes (for edit mode)
    useEffect(() => {
        if (isEditMode && entity) {
            // Allow parent to transform entity data to form data
            const entityData = Object.keys(formConfig.initialData).reduce((acc, key) => {
                acc[key as keyof TFormData] = entity[key] ?? formConfig.initialData[key as keyof TFormData];
                return acc;
            }, {} as TFormData);

            // Reset form with entity data
            Object.keys(entityData).forEach((key) => {
                setData(key as keyof TFormData, entityData[key as keyof TFormData]);
            });
        } else if (!isEditMode) {
            // Reset to initial data for create mode
            reset();
        }
    }, [entity, isEditMode, mode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Add stay parameter to data before submission
        const submitData = { ...data, stay: true };

        const successMessage = isEditMode
            ? `${formConfig.entityName} atualizado com sucesso!`
            : `${formConfig.entityName} criado com sucesso!`;

        const errorMessage = isEditMode
            ? `Erro ao atualizar ${formConfig.entityName.toLowerCase()}`
            : `Erro ao criar ${formConfig.entityName.toLowerCase()}`;

        if (isEditMode && formConfig.updateRoute) {
            put(route(formConfig.updateRoute, entity.id), {
                ...submitData,
                onSuccess: () => {
                    toast.success(successMessage);
                    reset();
                    setSheetOpen(false);
                    onSuccess?.();
                },
                onError: () => {
                    toast.error(errorMessage, {
                        description: 'Verifique os campos e tente novamente.',
                    });
                },
                preserveScroll: true,
                preserveState: true,
            });
        } else {
            post(route(formConfig.createRoute), {
                ...submitData,
                onSuccess: () => {
                    toast.success(successMessage);
                    reset();
                    setSheetOpen(false);
                    onSuccess?.();
                },
                onError: () => {
                    toast.error(errorMessage, {
                        description: 'Verifique os campos e tente novamente.',
                    });
                },
                preserveScroll: true,
                preserveState: true,
            });
        }
    };

    const handleCancel = () => {
        reset();
        setSheetOpen(false);
    };

    const sheetTitle = isEditMode
        ? (formConfig.sheetTitle?.edit || `Editar ${formConfig.entityName}`)
        : (formConfig.sheetTitle?.create || `Novo ${formConfig.entityName}`);

    const sheetDescription = isEditMode
        ? (formConfig.sheetDescription?.edit || `Atualize as informações do ${formConfig.entityName.toLowerCase()}`)
        : (formConfig.sheetDescription?.create || `Adicione um novo ${formConfig.entityName.toLowerCase()} ao sistema`);

    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            {showTrigger && (
                <SheetTrigger asChild>
                    <Button variant={triggerVariant} ref={triggerRef}>
                        {triggerText || `Novo ${formConfig.entityName}`}
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent className="sm:max-w-lg">
                <SheetHeader className="">
                    <SheetTitle>{sheetTitle}</SheetTitle>
                    <SheetDescription>{sheetDescription}</SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="m-4 space-y-6">
                    <div className="grid gap-6">
                        {children({ data, setData, errors, processing })}
                    </div>

                    <SheetFooter className="flex justify-end gap-2">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancel} disabled={processing}>
                            Cancelar
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
} 