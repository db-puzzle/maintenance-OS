import React, { useEffect, useRef, useState } from 'react';
import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import TextInput from '@/components/TextInput';
import ItemSelect from '@/components/ItemSelect';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Item, ItemCategory } from '@/types/production';
import CreateItemCategorySheet from '@/components/production/CreateItemCategorySheet';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

interface ItemForm {
    [key: string]: string | number | boolean | null | undefined;
    item_number: string;
    name: string;
    description: string;
    item_category_id: string;
    // item_type: 'manufactured' | 'purchased' | 'phantom' | 'service'; // DEPRECATED
    can_be_sold: boolean;
    can_be_purchased: boolean;
    can_be_manufactured: boolean;
    status: 'active' | 'inactive' | 'prototype' | 'discontinued';
    unit_of_measure: string;
    weight: string;
    list_price: string;
    manufacturing_cost: string;
    manufacturing_lead_time_days: number;
    purchase_price: string;
    purchase_lead_time_days: number;
    preferred_vendor: string;
    vendor_item_number: string;
}

interface CreateItemSheetProps {
    item?: Item;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    onSuccess?: () => void;
}



const itemStatuses = [
    { id: 1, name: 'Ativo', value: 'active' },
    { id: 2, name: 'Inativo', value: 'inactive' },
    { id: 3, name: 'Protótipo', value: 'prototype' },
    { id: 4, name: 'Descontinuado', value: 'discontinued' }
];

const CreateItemSheet: React.FC<CreateItemSheetProps> = ({ item, open, onOpenChange, mode, onSuccess }) => {
    const itemNumberRef = useRef<HTMLInputElement>(null);
    const [categories, setCategories] = useState<ItemCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [categorySheetOpen, setCategorySheetOpen] = useState(false);

    // Load categories
    const loadCategories = async () => {
        try {
            const response = await axios.get(route('production.categories.active'));
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    // Reload categories when category sheet closes successfully
    const handleCategorySheetSuccess = () => {
        loadCategories();
        setCategorySheetOpen(false);
    };

    // Auto-focus the item number input when sheet opens for creation
    useEffect(() => {
        if (open && mode === 'create') {
            // Use requestAnimationFrame to ensure the DOM is ready
            const focusInput = () => {
                requestAnimationFrame(() => {
                    if (itemNumberRef.current) {
                        itemNumberRef.current.focus();
                        itemNumberRef.current.select();
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
                itemNumberRef.current?.focus();
            }, 100);
        }
    };

    return (
        <>
            <BaseEntitySheet<ItemForm>
                entity={item}
                open={open}
                onOpenChange={handleOpenChange}
                mode={mode}
                onSuccess={onSuccess}
                width="sm:max-w-2xl"
                formConfig={{
                    initialData: {
                        item_number: '',
                        name: '',
                        description: '',
                        item_category_id: '',
                        // item_type: 'manufactured', // DEPRECATED
                        can_be_sold: true,
                        can_be_purchased: false,
                        can_be_manufactured: true,
                        status: 'active',
                        unit_of_measure: 'EA',
                        weight: '',
                        list_price: '',
                        manufacturing_cost: '',
                        manufacturing_lead_time_days: 0,
                        purchase_price: '',
                        purchase_lead_time_days: 0,
                        preferred_vendor: '',
                        vendor_item_number: '',
                    },
                    createRoute: 'production.items.store',
                    updateRoute: 'production.items.update',
                    entityName: 'Item',
                }}
            >
                {({ data, setData, errors }) => (
                    <>
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextInput
                                ref={itemNumberRef}
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors: () => { },
                                }}
                                name="item_number"
                                label="Número do Item"
                                placeholder="ITEM-001"
                                required
                            />
                            <TextInput
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors: () => { },
                                }}
                                name="name"
                                label="Nome"
                                placeholder="Nome do item"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-muted-foreground text-sm">
                                Descrição
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Descrição detalhada do item"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                className="min-h-[80px]"
                            />
                            {errors.description && <p className="text-destructive text-sm">{errors.description}</p>}
                        </div>

                        {/* Classification */}
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-sm">
                                    Categoria
                                </Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <ItemSelect
                                            items={categories}
                                            value={data.item_category_id}
                                            onValueChange={(value) => setData('item_category_id', value)}
                                            placeholder={loadingCategories ? "Carregando..." : "Selecione a categoria"}
                                            error={errors.item_category_id}
                                            disabled={loadingCategories}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCategorySheetOpen(true)}
                                        title="Criar nova categoria"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <ItemSelect
                                label="Status"
                                items={itemStatuses}
                                value={itemStatuses.find(s => s.value === data.status)?.id.toString() || ''}
                                onValueChange={(value) => {
                                    const selected = itemStatuses.find(s => s.id.toString() === value);
                                    if (selected) {
                                        setData('status', selected.value as ItemForm['status']);
                                    }
                                }}
                                error={errors.status}
                                required
                            />
                        </div>

                        {/* Capabilities */}
                        <Separator />
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={data.can_be_sold}
                                        onCheckedChange={(checked) => setData('can_be_sold', !!checked)}
                                    />
                                    <span className="text-sm font-medium">Pode ser vendido</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={data.can_be_purchased}
                                        onCheckedChange={(checked) => setData('can_be_purchased', !!checked)}
                                    />
                                    <span className="text-sm font-medium">Pode ser comprado</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={data.can_be_manufactured}
                                        onCheckedChange={(checked) => setData('can_be_manufactured', !!checked)}
                                    />
                                    <span className="text-sm font-medium">Pode ser manufaturado</span>
                                </label>
                            </div>
                        </div>

                        {/* Physical Attributes */}
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextInput
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors: () => { },
                                }}
                                name="unit_of_measure"
                                label="Unidade de Medida"
                                placeholder="EA"
                            />
                            <TextInput
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors: () => { },
                                }}
                                name="weight"
                                label="Peso (kg)"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Sales Information - Only show if can be sold */}
                        {data.can_be_sold && (
                            <>
                                <Separator />
                                <h3 className="text-sm font-medium">Informações de Venda</h3>
                                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                    <TextInput
                                        form={{
                                            data,
                                            setData,
                                            errors,
                                            clearErrors: () => { },
                                        }}
                                        name="list_price"
                                        label="Preço de Lista"
                                        placeholder="0.00"
                                    />
                                </div>
                            </>
                        )}

                        {/* Manufacturing Information - Only show if can be manufactured */}
                        {data.can_be_manufactured && (
                            <>
                                <Separator />
                                <h3 className="text-sm font-medium">Informações de Manufatura</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <TextInput
                                        form={{
                                            data,
                                            setData,
                                            errors,
                                            clearErrors: () => { },
                                        }}
                                        name="manufacturing_cost"
                                        label="Custo de Manufatura"
                                        placeholder="0.00"
                                    />
                                    <TextInput
                                        form={{
                                            data,
                                            setData,
                                            errors,
                                            clearErrors: () => { },
                                        }}
                                        name="manufacturing_lead_time_days"
                                        label="Lead Time de Manufatura (dias)"
                                        placeholder="0"
                                    />
                                </div>
                            </>
                        )}

                        {/* Purchasing Information - Only show if can be purchased */}
                        {data.can_be_purchased && (
                            <>
                                <Separator />
                                <h3 className="text-sm font-medium">Informações de Compra</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <TextInput
                                        form={{
                                            data,
                                            setData,
                                            errors,
                                            clearErrors: () => { },
                                        }}
                                        name="preferred_vendor"
                                        label="Fornecedor Preferencial"
                                        placeholder="Nome do fornecedor"
                                    />
                                    <TextInput
                                        form={{
                                            data,
                                            setData,
                                            errors,
                                            clearErrors: () => { },
                                        }}
                                        name="vendor_item_number"
                                        label="Código do Fornecedor"
                                        placeholder="Código do item no fornecedor"
                                    />
                                    <TextInput
                                        form={{
                                            data,
                                            setData,
                                            errors,
                                            clearErrors: () => { },
                                        }}
                                        name="purchase_price"
                                        label="Preço de Compra"
                                        placeholder="0.00"
                                    />
                                    <TextInput
                                        form={{
                                            data,
                                            setData,
                                            errors,
                                            clearErrors: () => { },
                                        }}
                                        name="purchase_lead_time_days"
                                        label="Lead Time de Compra (dias)"
                                        placeholder="0"
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}
            </BaseEntitySheet>

            {/* Category Creation Sheet */}
            <CreateItemCategorySheet
                open={categorySheetOpen}
                onOpenChange={setCategorySheetOpen}
                onSuccess={handleCategorySheetSuccess}
                mode="create"
            />
        </>
    );
};

export default CreateItemSheet; 