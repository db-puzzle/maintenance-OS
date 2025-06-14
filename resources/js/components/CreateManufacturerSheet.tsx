import React from 'react';

import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import TextInput from '@/components/TextInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Manufacturer } from '@/types/entities/manufacturer';

interface ManufacturerForm {
    [key: string]: any;
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
}

const CreateManufacturerSheet: React.FC<CreateManufacturerSheetProps> = ({
    manufacturer,
    open,
    onOpenChange,
    mode,
}) => {
    return (
        <BaseEntitySheet<ManufacturerForm>
            entity={manufacturer}
            open={open}
            onOpenChange={onOpenChange}
            mode={mode}
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
                    <TextInput<ManufacturerForm>
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
                    <TextInput<ManufacturerForm>
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
                        <TextInput<ManufacturerForm>
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
                        <TextInput<ManufacturerForm>
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
                    <TextInput<ManufacturerForm>
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
                        {errors.notes && (
                            <p className="text-sm text-destructive">{errors.notes}</p>
                        )}
                    </div>
                </>
            )}
        </BaseEntitySheet>
    );
};

export default CreateManufacturerSheet; 