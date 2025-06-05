import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import TextInput from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

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
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

const CreateManufacturerSheet: React.FC<CreateManufacturerSheetProps> = ({
    isOpen,
    onOpenChange,
    onSuccess,
    triggerText = 'Novo Fabricante',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
}) => {
    const { data, setData, post, processing, errors, reset, transform } = useForm<ManufacturerForm>({
        name: '',
        website: '',
        email: '',
        phone: '',
        country: '',
        notes: '',
    });

    const [internalSheetOpen, setInternalSheetOpen] = useState(false);

    // Determina se deve usar controle interno ou externo
    const sheetOpen = showTrigger ? internalSheetOpen : (isOpen ?? false);
    const setSheetOpen = showTrigger ? setInternalSheetOpen : (onOpenChange ?? (() => { }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Transform the data to include stay parameter
        transform((data) => {
            return {
                ...data,
                stay: true,
            };
        });

        post(route('asset-hierarchy.manufacturers.store'), {
            onSuccess: () => {
                toast.success('Fabricante criado com sucesso!');
                reset();
                setSheetOpen(false);
                onSuccess?.();
            },
            onError: (errors: any) => {
                toast.error('Erro ao criar fabricante', {
                    description: 'Verifique os campos e tente novamente.',
                });
            },
            preserveScroll: true,
            preserveState: true,
        });
    };

    const handleCancel = () => {
        reset();
        setSheetOpen(false);
    };

    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            {showTrigger && (
                <SheetTrigger asChild>
                    <Button variant={triggerVariant} ref={triggerRef}>
                        {triggerText}
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent className="sm:max-w-lg">
                <SheetHeader className="">
                    <SheetTitle>Novo Fabricante</SheetTitle>
                    <SheetDescription>Adicione um novo fabricante ao sistema</SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="m-4 space-y-6">
                    <div className="grid gap-6">
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
};

export default CreateManufacturerSheet; 