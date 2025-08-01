import React, { useEffect, useRef } from 'react';

import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import { TextInput } from '@/components/TextInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Manufacturer } from '@/types/entities/manufacturer';

interface ManufacturerForm {
    [key: string]: string | number | boolean | null | undefined;
    name: string;
    website: string;
    email: string;
    phone: string;
    country: string;
    notes: string;
}

interface CreateManufacturerSheetProps {
    manufacturer?: Manufacturer;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    onSuccess?: () => void;
}

const CreateManufacturerSheet: React.FC<CreateManufacturerSheetProps> = ({ manufacturer, open, onOpenChange, mode, onSuccess }) => {
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the name input when sheet opens for creation
    useEffect(() => {
        if (open && mode === 'create') {
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
    }, [open, mode]);

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
        <BaseEntitySheet<ManufacturerForm>
            entity={manufacturer}
            open={open}
            onOpenChange={handleOpenChange}
            mode={mode}
            onSuccess={onSuccess}
            formConfig={{
                initialData: {
                    name: '',
                    website: '',
                    email: '',
                    phone: '',
                    country: '',
                    notes: '',
                },
                createRoute: 'asset-hierarchy.manufacturers.store',
                updateRoute: 'asset-hierarchy.manufacturers.update',
                entityName: 'Fabricante',
            }}
        >
            {({ data, setData, errors }) => (
                <>
                    {/* Nome do Fabricante - Campo Obrigatório */}
                    <TextInput
                        ref={nameInputRef}
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="name"
                        label="Nome do Fabricante"
                        placeholder="Nome do fabricante"
                        required
                    />

                    {/* Website */}
                    <TextInput
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="website"
                        label="Website"
                        placeholder="https://www.exemplo.com"
                    />

                    {/* Email e Telefone - Grid com 2 colunas */}
                    <div className="grid grid-cols-2 gap-4">
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => { },
                            }}
                            name="email"
                            label="E-mail"
                            placeholder="contato@exemplo.com"
                        />
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => { },
                            }}
                            name="phone"
                            label="Telefone"
                            placeholder="+55 11 99999-9999"
                        />
                    </div>

                    {/* País */}
                    <TextInput
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="country"
                        label="País"
                        placeholder="Brasil"
                    />

                    {/* Observações */}
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-muted-foreground text-sm">
                            Observações
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder="Observações sobre o fabricante..."
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="min-h-[100px]"
                        />
                        {errors.notes && <p className="text-destructive text-sm">{errors.notes}</p>}
                    </div>
                </>
            )}
        </BaseEntitySheet>
    );
};

export default CreateManufacturerSheet;
