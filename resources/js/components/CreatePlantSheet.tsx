import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import { TextInput } from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { estados } from '@/data/estados';
import { Plant as ImportedPlant } from '@/types/entities/plant';

interface PlantForm {
    [key: string]: string | number | boolean | null | undefined;
    name: string;
    street: string;
    number: string;
    city: string;
    state: string;
    zip_code: string;
    gps_coordinates: string;
}

interface CreatePlantSheetProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
    plant?: ImportedPlant;
    mode?: 'create' | 'edit';
}

const CreatePlantSheet: React.FC<CreatePlantSheetProps> = ({
    open: controlledOpen,
    onOpenChange,
    onSuccess,
    triggerText = 'Nova Planta',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
    plant,
    mode = 'create',
}) => {
    const [open, setOpen] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the name input when sheet opens for creation
    useEffect(() => {
        if (controlledOpen && mode === 'create') {
            // Use requestAnimationFrame to ensure the DOM is ready
            const focusInput = () => {
                requestAnimationFrame(() => {
                    if (nameInputRef.current) {
                        nameInputRef.current.focus();
                        // Force focus in case it's being prevented
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

    const formatCEP = (value: string) => {
        // Remove todos os caracteres não numéricos
        const numbers = value.replace(/\D/g, '');
        // Limita a 8 dígitos
        const cep = numbers.slice(0, 8);
        // Adiciona o hífen após os 5 primeiros dígitos
        return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    };

    return (
        <BaseEntitySheet<PlantForm>
            entity={plant}
            open={controlledOpen}
            onOpenChange={handleOpenChange}
            mode={mode}
            onSuccess={onSuccess}
            triggerText={triggerText}
            triggerVariant={triggerVariant}
            showTrigger={showTrigger}
            triggerRef={triggerRef}
            formConfig={{
                initialData: {
                    name: '',
                    street: '',
                    number: '',
                    city: '',
                    state: '',
                    zip_code: '',
                    gps_coordinates: '',
                },
                createRoute: 'asset-hierarchy.plants.store',
                updateRoute: 'asset-hierarchy.plants.update',
                entityName: 'Planta',
                routeParameterName: 'plant',
            }}
        >
            {({ data, setData, errors }) => (
                <>
                    {/* Nome da Planta - Campo Obrigatório */}
                    <TextInput
                        ref={nameInputRef}
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="name"
                        label="Nome da Planta"
                        placeholder="Nome da planta"
                        required
                    />

                    {/* Endereço - Grid com 2 colunas */}
                    <div className="grid gap-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <TextInput
                                    form={{
                                        data,
                                        setData,
                                        errors,
                                        clearErrors: () => { },
                                    }}
                                    name="street"
                                    label="Rua"
                                    placeholder="Nome da rua"
                                />
                            </div>
                            <div>
                                <TextInput
                                    form={{
                                        data,
                                        setData,
                                        errors,
                                        clearErrors: () => { },
                                    }}
                                    name="number"
                                    label="Número"
                                    placeholder="Número"
                                />
                            </div>
                            <div>
                                <TextInput
                                    form={{
                                        data,
                                        setData: (name, value) => {
                                            if (name === 'zip_code') {
                                                setData(name, formatCEP(value));
                                            } else {
                                                setData(name, value);
                                            }
                                        },
                                        errors,
                                        clearErrors: () => { },
                                    }}
                                    name="zip_code"
                                    label="CEP"
                                    placeholder="00000-000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cidade e Estado - Grid com 2 colunas */}
                    <div className="grid gap-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <TextInput
                                    form={{
                                        data,
                                        setData,
                                        errors,
                                        clearErrors: () => { },
                                    }}
                                    name="city"
                                    label="Cidade"
                                    placeholder="Cidade"
                                />
                            </div>
                            <div>
                                <Label htmlFor="state" className="text-muted-foreground text-sm">
                                    Estado
                                </Label>
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button id="state" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                                            {data.state ? estados.find((estado) => estado.value === data.state)?.label : 'Selecione um estado...'}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar estado..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {estados.map((estado) => (
                                                        <CommandItem
                                                            key={estado.value}
                                                            value={estado.value}
                                                            onSelect={(currentValue) => {
                                                                setData('state', currentValue === data.state ? '' : currentValue);
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    data.state === estado.value ? 'opacity-100' : 'opacity-0',
                                                                )}
                                                            />
                                                            {estado.label}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    {/* Coordenadas GPS */}
                    <TextInput
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="gps_coordinates"
                        label="Coordenadas GPS"
                        placeholder="Ex: -23.550520, -46.633308"
                    />
                </>
            )}
        </BaseEntitySheet>
    );
};

export default CreatePlantSheet;
