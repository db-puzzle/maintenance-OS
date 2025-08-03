import React, { useEffect, useRef, useState } from 'react';
import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import { TextInput } from '@/components/TextInput';
import { ItemSelect } from '@/components/ItemSelect';
import StateButton from '@/components/StateButton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Item, ItemCategory } from '@/types/production';
import CreateItemCategorySheet from '@/components/production/CreateItemCategorySheet';
import { Factory, Package, ShoppingCart, Ghost } from 'lucide-react';
import { router } from '@inertiajs/react';
interface ItemForm {
    [key: string]: string | number | boolean | null | undefined;
    item_number: string;
    name: string;
    description: string;
    item_category_id: string;
    can_be_sold: boolean;
    can_be_purchased: boolean;
    can_be_manufactured: boolean;
    is_phantom: boolean;
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
    categories?: ItemCategory[];
    onCategoriesRefresh?: () => void;
}
const itemStatuses = [
    { id: 1, name: 'Ativo', value: 'active' },
    { id: 2, name: 'Inativo', value: 'inactive' },
    { id: 3, name: 'Protótipo', value: 'prototype' },
    { id: 4, name: 'Descontinuado', value: 'discontinued' }
];
const CreateItemSheet: React.FC<CreateItemSheetProps> = ({
    item,
    open,
    onOpenChange,
    mode,
    onSuccess,
    categories: propCategories,
    onCategoriesRefresh
}) => {
    const itemNumberRef = useRef<HTMLInputElement>(null);
    const [categorySheetOpen, setCategorySheetOpen] = useState(false);
    // Use categories from props
    const categories = propCategories || [];
    const loadingCategories = false;
    // Handle category sheet success
    const handleCategorySheetSuccess = () => {
        setCategorySheetOpen(false);
        // If parent provided a refresh callback, use it
        if (onCategoriesRefresh) {
            onCategoriesRefresh();
        } else if (!propCategories) {
            // Otherwise, reload the page to get fresh categories
            router.reload({
                only: ['categories']
            });
        }
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
                width="overflow-y-auto sm:max-w-3xl"
                formConfig={{
                    initialData: {
                        item_number: '',
                        name: '',
                        description: '',
                        item_category_id: '',
                        can_be_sold: false,
                        can_be_purchased: false,
                        can_be_manufactured: false,
                        is_phantom: false,
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
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
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
                            <div className="grid gap-2">
                                <Label htmlFor="description" className="text-sm font-medium">
                                    Descrição
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Descrição detalhada do item"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="min-h-[80px] resize-none"
                                />
                                {errors.description && <p className="text-destructive text-sm">{errors.description}</p>}
                            </div>
                        </div>
                        {/* Classification */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ItemSelect
                                    label="Categoria"
                                    items={categories}
                                    value={data.item_category_id}
                                    onValueChange={(value) => setData('item_category_id', value)}
                                    onCreateClick={() => setCategorySheetOpen(true)}
                                    placeholder={loadingCategories ? "Carregando..." : "Selecione a categoria"}
                                    error={errors.item_category_id}
                                    disabled={loadingCategories}
                                    canCreate={true}
                                />
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
                        </div>
                        {/* Physical & Operational Attributes */}
                        <div className="space-y-4">
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
                        </div>
                        {/* Capabilities and Associated Fields */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Capacidades do Item</h3>
                            <div className="space-y-3">
                                {/* Manufacturing Capability */}
                                <StateButton
                                    icon={Factory}
                                    title="Pode ser manufaturado"
                                    description="Produzido internamente"
                                    selected={data.can_be_manufactured}
                                    onClick={() => {
                                        if (data.is_phantom) {
                                            setData('is_phantom', false);
                                        }
                                        setData('can_be_manufactured', !data.can_be_manufactured);
                                    }}
                                    disabled={data.is_phantom}
                                    variant="default"
                                />
                                {data.can_be_manufactured && (
                                    <div className="border-l border-gray-200">
                                        <div className="ml-6 space-y-3">
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
                                    </div>
                                )}
                                {/* Purchasing Capability */}
                                <StateButton
                                    icon={Package}
                                    title="Pode ser comprado"
                                    description="Fornecido por terceiros"
                                    selected={data.can_be_purchased}
                                    onClick={() => {
                                        if (data.is_phantom) {
                                            setData('is_phantom', false);
                                        }
                                        setData('can_be_purchased', !data.can_be_purchased);
                                    }}
                                    disabled={data.is_phantom}
                                    variant="default"
                                />
                                {data.can_be_purchased && (
                                    <div className="border-l border-gray-200">
                                        <div className="ml-6 space-y-3">
                                            <TextInput
                                                form={{
                                                    data,
                                                    setData,
                                                    errors,
                                                    clearErrors: () => { },
                                                }}
                                                name="preferred_vendor"
                                                label="Fornecedores Preferenciais"
                                                placeholder="Nome dos fornecedores"
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
                                    </div>
                                )}
                                {/* Sales Capability */}
                                <StateButton
                                    icon={ShoppingCart}
                                    title="Pode ser vendido"
                                    description="Produto final para clientes"
                                    selected={data.can_be_sold}
                                    onClick={() => {
                                        if (data.is_phantom) {
                                            setData('is_phantom', false);
                                        }
                                        setData('can_be_sold', !data.can_be_sold);
                                    }}
                                    disabled={data.is_phantom}
                                    variant="default"
                                />
                                {data.can_be_sold && (
                                    <div className="border-l border-gray-200">
                                        <div className="ml-6 space-y-3">
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
                                    </div>
                                )}
                                {/* Phantom Item Capability */}
                                <StateButton
                                    icon={Ghost}
                                    title="Item Fantasma"
                                    description="Apenas para estruturação de BOM"
                                    selected={data.is_phantom}
                                    onClick={() => {
                                        if (!data.is_phantom) {
                                            // When selecting phantom, deselect all other capabilities
                                            setData('is_phantom', true);
                                            setData('can_be_manufactured', false);
                                            setData('can_be_purchased', false);
                                            setData('can_be_sold', false);
                                        } else {
                                            // When deselecting phantom, just toggle it off
                                            setData('is_phantom', false);
                                        }
                                    }}
                                    variant="default"
                                />
                                {data.is_phantom && (
                                    <div className="border-l border-gray-200">
                                        <div className="ml-6 p-3 bg-muted/50 rounded-md">
                                            <p className="text-sm text-muted-foreground">
                                                Itens fantasma são usados apenas para organização em listas de materiais e não podem ser vendidos, comprados ou manufaturados.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
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
export { CreateItemSheet }; 