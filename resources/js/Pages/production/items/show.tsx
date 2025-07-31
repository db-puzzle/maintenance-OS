import React, { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { router, usePage } from '@inertiajs/react';
import { Head, Link } from '@inertiajs/react';
import { ShoppingCart, Factory, Package, History, FileText, BarChart3, Boxes, Ghost, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import TextInput from '@/components/TextInput';
import ItemSelect from '@/components/ItemSelect';
import StateButton from '@/components/StateButton';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import EmptyCard from '@/components/ui/empty-card';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { Item, BillOfMaterial, ItemCategory } from '@/types/production';
import { formatCurrency, cn } from '@/lib/utils';
import { ColumnConfig } from '@/types/shared';
import CreateItemCategorySheet from '@/components/production/CreateItemCategorySheet';
import { toast } from 'sonner';

interface Props {
    item?: Item;
    categories?: ItemCategory[];
    itemTypes?: Array<{ id: number; name: string; value: string }>;
    itemStatuses?: Array<{ id: number; name: string; value: string }>;
    can?: {
        update: boolean;
        delete: boolean;
    };
    isCreating?: boolean;
}

const defaultCategories: ItemCategory[] = [];

// DEPRECATED: item_type is no longer used
// const defaultItemTypes = [
//     { id: 1, name: 'Manufaturado', value: 'manufactured' },
//     { id: 2, name: 'Comprado', value: 'purchased' },
//     { id: 3, name: 'Fantasma', value: 'phantom' },
//     { id: 4, name: 'Serviço', value: 'service' }
// ];

const defaultItemStatuses = [
    { id: 1, name: 'Ativo', value: 'active' },
    { id: 2, name: 'Inativo', value: 'inactive' },
    { id: 3, name: 'Protótipo', value: 'prototype' },
    { id: 4, name: 'Descontinuado', value: 'discontinued' }
];

// Detail Item Component
function DetailItem({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm">{value || '—'}</dd>
        </div>
    );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
        'active': 'default',
        'inactive': 'secondary',
        'prototype': 'outline',
        'discontinued': 'destructive'
    };

    const labels: Record<string, string> = {
        'active': 'Ativo',
        'inactive': 'Inativo',
        'prototype': 'Protótipo',
        'discontinued': 'Descontinuado'
    };

    return (
        <Badge variant={variants[status] || 'default'}>
            {labels[status] || status}
        </Badge>
    );
}

export default function ItemShow({
    item,
    categories = defaultCategories,
    itemTypes = [], // DEPRECATED
    itemStatuses = defaultItemStatuses,
    can = { update: false, delete: false },
    isCreating = false
}: Props) {
    // Get shared data from page props
    const { props } = usePage<any>();
    const { qrTag } = props;
    const page = usePage<{
        flash?: {
            success?: string;
        };
        auth: {
            user: any;
            permissions: string[];
        };
    }>();
    const userPermissions = page.props.auth?.permissions || [];



    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'Itens', href: route('production.items.index') },
        { title: isCreating ? 'Novo Item' : (item?.item_number || 'Item'), href: '' }
    ];

    // Form state for creation/editing
    const { data, setData, errors, processing, post, patch, clearErrors } = useForm({
        item_number: item?.item_number || '',
        name: item?.name || '',
        description: item?.description || '',
        item_category_id: item?.item_category_id?.toString() || '',
        // item_type: item?.item_type || 'manufactured', // DEPRECATED
        can_be_sold: item?.can_be_sold !== undefined ? item.can_be_sold : false,
        can_be_purchased: item?.can_be_purchased !== undefined ? item.can_be_purchased : false,
        can_be_manufactured: item?.can_be_manufactured !== undefined ? item.can_be_manufactured : true,
        is_phantom: item?.is_phantom !== undefined ? item.is_phantom : false,
        status: item?.status || 'active',
        unit_of_measure: item?.unit_of_measure || 'EA',
        weight: item?.weight?.toString() || '',
        list_price: item?.list_price?.toString() || '',
        manufacturing_cost: item?.manufacturing_cost?.toString() || '',
        manufacturing_lead_time_days: item?.manufacturing_lead_time_days || 0,
        purchase_price: item?.purchase_price?.toString() || '',
        purchase_lead_time_days: item?.purchase_lead_time_days || 0,
        preferred_vendor: item?.preferred_vendor || '',
        vendor_item_number: item?.vendor_item_number || '',
    });

    const [isEditMode, setIsEditMode] = useState(isCreating);
    const [isCompressed, setIsCompressed] = useState(false);
    const [categorySheetOpen, setCategorySheetOpen] = useState(false);
    const [generatingQr, setGeneratingQr] = useState(false);

    // Use categories from props instead of loading via AJAX
    const itemCategories = categories || [];

    // Ref for auto-focusing the item number input during creation
    const itemNumberInputRef = useRef<HTMLInputElement>(null);



    // Update edit mode when isCreating prop changes (e.g., after redirect from creation)
    useEffect(() => {
        setIsEditMode(isCreating);
    }, [isCreating]);

    // Auto-focus on item number input when creating a new item
    useEffect(() => {
        if (isCreating && itemNumberInputRef.current) {
            itemNumberInputRef.current.focus();
        }
    }, [isCreating]);

    // Handle category sheet success - Inertia will reload the page with updated categories
    const handleCategorySheetSuccess = () => {
        setCategorySheetOpen(false);
        // The page will be reloaded by Inertia with fresh data
    };

    const handleGenerateQrTag = () => {
        if (!item?.id) return;

        setGeneratingQr(true);
        router.post(route('production.qr-tags.item', item.id), {}, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => {
                setGeneratingQr(false);
            },
        });
    };

    // Handle QR tag response
    useEffect(() => {
        if (qrTag?.success && qrTag?.pdf_url) {
            window.open(qrTag.pdf_url, '_blank');
            toast.success('Etiqueta QR gerada com sucesso!');
        }
    }, [qrTag]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isCreating) {
            post(route('production.items.store'), {
                onSuccess: () => {
                    // The backend will handle the redirect to the item show page
                    // No need to do anything here as the page will be redirected
                },
                onError: () => {
                    // Error handling is done by Inertia
                },
            });
        } else if (item) {
            patch(route('production.items.update', item.id), {
                onSuccess: () => {
                    setIsEditMode(false);
                },
            });
        }
    };

    const handleDelete = () => {
        if (item && confirm('Tem certeza que deseja excluir este item?')) {
            router.delete(route('production.items.destroy', item.id));
        }
    };

    const tabs = [
        {
            id: 'overview',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TextInput
                                    form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                    name="item_number"
                                    label="Número do Item"
                                    placeholder="ITEM-001"
                                    required
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
                                    ref={itemNumberInputRef}
                                />
                                <TextInput
                                    form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                    name="name"
                                    label="Nome"
                                    placeholder="Nome do item"
                                    required
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
                                />
                            </div>

                            {/* Description */}
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Descrição</label>
                                <div className="bg-background">
                                    {!isEditMode ? (
                                        <div className="rounded-md border bg-muted/20 p-2 text-sm min-h-[80px]">
                                            {data.description || 'Sem descrição'}
                                        </div>
                                    ) : (
                                        <Textarea
                                            placeholder="Descrição detalhada do item"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            onBlur={() => clearErrors('description')}
                                            className="min-h-[80px] resize-none"
                                            disabled={processing}
                                        />
                                    )}
                                </div>
                                {errors.description && (
                                    <p className="text-sm text-destructive">{errors.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Classification */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ItemSelect
                                    label="Categoria"
                                    items={itemCategories}
                                    value={data.item_category_id}
                                    onValueChange={(value) => setData('item_category_id', value)}
                                    onCreateClick={() => setCategorySheetOpen(true)}
                                    placeholder="Selecione a categoria"
                                    error={errors.item_category_id}
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
                                    canCreate={isEditMode}
                                />
                                <ItemSelect
                                    label="Status"
                                    items={itemStatuses}
                                    value={itemStatuses.find(s => s.value === data.status)?.id.toString() || ''}
                                    onValueChange={(value) => {
                                        const selected = itemStatuses.find(s => s.id.toString() === value);
                                        if (selected) {
                                            setData('status', selected.value as any);
                                        }
                                    }}
                                    error={errors.status}
                                    required
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
                                />
                            </div>
                        </div>

                        {/* Physical & Operational Attributes */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TextInput
                                    form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                    name="unit_of_measure"
                                    label="Unidade de Medida"
                                    placeholder="EA"
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
                                />
                                <TextInput
                                    form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                    name="weight"
                                    label="Peso (kg)"
                                    placeholder="0.00"
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
                                />
                            </div>
                        </div>

                        {/* Capabilities and Associated Fields */}
                        <div className="grid grid-cols-1 lg:grid-cols-4">
                            {/* Manufacturing Capability */}
                            <div className={cn(
                                "space-y-4 lg:pr-4",
                                (data.can_be_manufactured || data.can_be_purchased) && "lg:border-r lg:border-border"
                            )}>
                                {isEditMode ? (
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
                                        disabled={processing || data.is_phantom}
                                        variant="default"
                                    />
                                ) : (
                                    <StateButton
                                        icon={Factory}
                                        title="Pode ser manufaturado"
                                        description={data.can_be_manufactured ?
                                            (item?.primary_bom ? 'BOM definida' : 'Sem BOM') :
                                            'Não pode ser manufaturado'
                                        }
                                        selected={data.can_be_manufactured}
                                        onClick={() => { }}
                                        variant="default"
                                    />
                                )}

                                {data.can_be_manufactured && (
                                    <div className="space-y-3">
                                        <TextInput
                                            form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                            name="manufacturing_cost"
                                            label="Custo de Manufatura"
                                            placeholder="0.00"
                                            disabled={!isEditMode || processing}
                                            view={!isEditMode}
                                        />
                                        <TextInput
                                            form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                            name="manufacturing_lead_time_days"
                                            label="Lead Time de Manufatura (dias)"
                                            placeholder="0"
                                            disabled={!isEditMode || processing}
                                            view={!isEditMode}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Purchasing Capability */}
                            <div className={cn(
                                "space-y-4 lg:px-4",
                                (data.can_be_purchased || data.can_be_sold) && "lg:border-r lg:border-border"
                            )}>
                                {isEditMode ? (
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
                                        disabled={processing || data.is_phantom}
                                        variant="default"
                                    />
                                ) : (
                                    <StateButton
                                        icon={Package}
                                        title="Pode ser comprado"
                                        description={data.can_be_purchased ?
                                            `Fornecedores: ${data.preferred_vendor || 'Não definido'}` :
                                            'Não pode ser comprado'
                                        }
                                        selected={data.can_be_purchased}
                                        onClick={() => { }}
                                        variant="default"
                                    />
                                )}

                                {data.can_be_purchased && (
                                    <div className="space-y-3">
                                        <TextInput
                                            form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                            name="preferred_vendor"
                                            label="Fornecedores Preferenciais"
                                            placeholder="Nome dos fornecedores"
                                            disabled={!isEditMode || processing}
                                            view={!isEditMode}
                                        />
                                        <TextInput
                                            form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                            name="vendor_item_number"
                                            label="Código do Fornecedor"
                                            placeholder="Código do item no fornecedor"
                                            disabled={!isEditMode || processing}
                                            view={!isEditMode}
                                        />
                                        <TextInput
                                            form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                            name="purchase_price"
                                            label="Preço de Compra"
                                            placeholder="0.00"
                                            disabled={!isEditMode || processing}
                                            view={!isEditMode}
                                        />
                                        <TextInput
                                            form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                            name="purchase_lead_time_days"
                                            label="Lead Time de Compra (dias)"
                                            placeholder="0"
                                            disabled={!isEditMode || processing}
                                            view={!isEditMode}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Sales Capability */}
                            <div className={cn(
                                "space-y-4 lg:px-4",
                                (data.can_be_sold || data.is_phantom) && "lg:border-r lg:border-border"
                            )}>
                                {isEditMode ? (
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
                                        disabled={processing || data.is_phantom}
                                        variant="default"
                                    />
                                ) : (
                                    <StateButton
                                        icon={ShoppingCart}
                                        title="Pode ser vendido"
                                        description={data.can_be_sold ?
                                            `Preço: ${data.list_price ? formatCurrency(parseFloat(data.list_price)) : 'Não definido'}` :
                                            'Não pode ser vendido'
                                        }
                                        selected={data.can_be_sold}
                                        onClick={() => { }}
                                        variant="default"
                                    />
                                )}

                                {data.can_be_sold && (
                                    <div className="space-y-3">
                                        <TextInput
                                            form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                            name="list_price"
                                            label="Preço de Lista"
                                            placeholder="0.00"
                                            disabled={!isEditMode || processing}
                                            view={!isEditMode}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Phantom Item Capability */}
                            <div className="space-y-4 lg:pl-4">
                                {isEditMode ? (
                                    <StateButton
                                        icon={Ghost}
                                        title="Item Fantasma"
                                        description="Apenas para estruturação de BOM"
                                        selected={data.is_phantom}
                                        onClick={() => {
                                            if (!data.is_phantom) {
                                                // When selecting phantom, deselect all other capabilities
                                                setData({
                                                    ...data,
                                                    is_phantom: true,
                                                    can_be_manufactured: false,
                                                    can_be_purchased: false,
                                                    can_be_sold: false
                                                });
                                            } else {
                                                // When deselecting phantom, just toggle it off
                                                setData('is_phantom', false);
                                            }
                                        }}
                                        disabled={processing}
                                        variant="default"
                                    />
                                ) : (
                                    <StateButton
                                        icon={Ghost}
                                        title="Item Fantasma"
                                        description={data.is_phantom ?
                                            'Item de estruturação apenas' :
                                            'Item não é fantasma'
                                        }
                                        selected={data.is_phantom}
                                        onClick={() => { }}
                                        variant="default"
                                    />
                                )}

                                {data.is_phantom && (
                                    <div className="p-3 bg-muted/50 rounded-md">
                                        <p className="text-sm text-muted-foreground">
                                            Itens fantasma são usados apenas para organização em listas de materiais e não podem ser vendidos, comprados ou manufaturados.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isEditMode && (
                            <div className="flex justify-end gap-4 pt-4">
                                {!isCreating && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsEditMode(false)}
                                        disabled={processing}
                                    >
                                        Cancelar
                                    </Button>
                                )}
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Salvando...' : (isCreating ? 'Criar Item' : 'Salvar Alterações')}
                                </Button>
                            </div>
                        )}
                    </form>

                    {!isEditMode && !isCreating && can.update && (
                        <div className="flex justify-end mt-6">
                            <Button onClick={() => setIsEditMode(true)}>
                                Editar Informações
                            </Button>
                        </div>
                    )}
                </div>
            ),
        },
        ...(isCreating
            ? []
            : [
                ...(item?.can_be_manufactured ? [{
                    id: 'bom',
                    label: 'BOM',
                    content: (
                        <div className="py-6">
                            {item.primary_bom ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium">Lista de Materiais Atual</h3>
                                        <Button variant="outline" asChild>
                                            <Link href={route('production.bom.show', item.primary_bom?.id)}>
                                                Ver BOM Completa
                                            </Link>
                                        </Button>
                                    </div>
                                    <div className="border rounded-lg p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailItem label="Número da BOM" value={item.primary_bom.bom_number} />
                                            <DetailItem label="Nome" value={item.primary_bom.name} />
                                            <DetailItem label="Descrição" value={item.primary_bom.description || '—'} />
                                            <DetailItem label="Status" value={
                                                <Badge variant={item.primary_bom.is_active ? 'default' : 'secondary'}>
                                                    {item.primary_bom.is_active ? 'Ativa' : 'Inativa'}
                                                </Badge>
                                            } />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <EmptyCard
                                    icon={Package}
                                    title="Sem BOM definida"
                                    description="Este item pode ser manufaturado mas ainda não tem uma lista de materiais"
                                    primaryButtonText="Criar BOM"
                                    primaryButtonAction={() => router.visit(route('production.bom.create'))}
                                />
                            )}
                        </div>
                    ),
                }] : []),
                {
                    id: 'where-used',
                    label: 'Onde é Usado',
                    content: (
                        <div className="py-6">
                            <EmptyCard
                                icon={Boxes}
                                title="Análise de uso"
                                description="Este item não é usado em nenhuma BOM no momento"
                            />
                        </div>
                    ),
                },
                {
                    id: 'files',
                    label: 'Arquivos',
                    content: (
                        <div className="py-6">
                            <EmptyCard
                                icon={FileText}
                                title="Nenhum arquivo"
                                description="Anexe arquivos relacionados a este item"
                                primaryButtonText="Adicionar arquivo"
                                primaryButtonAction={() => { }}
                            />
                        </div>
                    ),
                },
            ]),
    ];

    // DEPRECATED: item_type is no longer used
    // Item type labels
    // const itemTypeLabels: Record<string, string> = {
    //     manufactured: 'Manufaturado',
    //     purchased: 'Comprado',
    //     'manufactured-purchased': 'Manufaturado/Comprado',
    //     phantom: 'Fantasma',
    //     service: 'Serviço'
    // };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreating ? 'Novo Item' : `Item ${item?.item_number}`} />

            <ShowLayout
                title={isCreating ? 'Novo Item' : item?.name || 'Item'}
                subtitle={
                    isCreating ? (
                        'Criação de novo item'
                    ) : (
                        `${item?.item_number}${item?.category?.name ? ` • ${item.category.name}` : ''} • ${item?.status === 'active' ? 'Ativo' : item?.status === 'inactive' ? 'Inativo' : item?.status === 'prototype' ? 'Protótipo' : item?.status === 'discontinued' ? 'Descontinuado' : item?.status || 'Ativo'}`
                    )
                }
                editRoute=""
                tabs={tabs}
                defaultCompressed={isCompressed}
                onCompressedChange={setIsCompressed}
                actions={
                    !isCreating && item && can?.update && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateQrTag}
                            disabled={generatingQr}
                        >
                            <QrCode className="h-4 w-4 mr-2" />
                            {generatingQr ? 'Gerando...' : 'Gerar QR'}
                        </Button>
                    )
                }
            />

            {/* Category Creation Sheet */}
            <CreateItemCategorySheet
                open={categorySheetOpen}
                onOpenChange={setCategorySheetOpen}
                onSuccess={handleCategorySheetSuccess}
                mode="create"
            />
        </AppLayout>
    );
} 