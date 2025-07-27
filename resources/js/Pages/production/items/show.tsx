import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { router, usePage } from '@inertiajs/react';
import { Head, Link } from '@inertiajs/react';
import { ShoppingCart, Factory, Package, History, FileText, BarChart3, Boxes } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import TextInput from '@/components/TextInput';
import ItemSelect from '@/components/ItemSelect';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import EmptyCard from '@/components/ui/empty-card';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { Item, BillOfMaterial } from '@/types/production';
import { formatCurrency } from '@/lib/utils';
import { ColumnConfig } from '@/types/shared';

interface Props {
    item?: Item;
    categories?: Array<{ id: number; name: string }>;
    itemTypes?: Array<{ id: number; name: string; value: string }>;
    itemStatuses?: Array<{ id: number; name: string; value: string }>;
    can?: {
        update: boolean;
        delete: boolean;
    };
    isCreating?: boolean;
}

const defaultCategories = [
    { id: 1, name: 'Eletrônicos' },
    { id: 2, name: 'Mecânica' },
    { id: 3, name: 'Matéria Prima' },
    { id: 4, name: 'Embalagem' },
    { id: 5, name: 'Ferramentas' },
    { id: 6, name: 'Outros' }
];

const defaultItemTypes = [
    { id: 1, name: 'Manufaturado', value: 'manufactured' },
    { id: 2, name: 'Comprado', value: 'purchased' },
    { id: 3, name: 'Fantasma', value: 'phantom' },
    { id: 4, name: 'Serviço', value: 'service' }
];

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
    itemTypes = defaultItemTypes,
    itemStatuses = defaultItemStatuses,
    can = { update: false, delete: false },
    isCreating = false
}: Props) {
    const page = usePage<{
        flash?: { success?: string };
        auth: {
            user: any;
            permissions: string[];
        };
    }>();
    const userPermissions = page.props.auth?.permissions || [];

    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'Itens', href: route('production.items.index') },
        { title: item?.item_number || 'Novo Item', href: '' }
    ];

    // Form state for creation/editing
    const { data, setData, errors, processing, post, patch, clearErrors } = useForm({
        item_number: item?.item_number || '',
        name: item?.name || '',
        description: item?.description || '',
        category: item?.category || '',
        item_type: item?.item_type || 'manufactured',
        can_be_sold: item?.can_be_sold !== undefined ? item.can_be_sold : true,
        can_be_purchased: item?.can_be_purchased !== undefined ? item.can_be_purchased : false,
        can_be_manufactured: item?.can_be_manufactured !== undefined ? item.can_be_manufactured : true,
        status: item?.status || 'active',
        unit_of_measure: item?.unit_of_measure || 'EA',
        weight: item?.weight?.toString() || '',
        list_price: item?.list_price?.toString() || '',
        cost: item?.cost?.toString() || '',
        lead_time_days: item?.lead_time_days || 0,
        preferred_vendor: item?.preferred_vendor || '',
        vendor_item_number: item?.vendor_item_number || '',
    });

    const [isEditMode, setIsEditMode] = useState(isCreating);
    const [isCompressed, setIsCompressed] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isCreating) {
            post(route('production.items.store'));
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
                            <h3 className="text-sm font-medium">Informações Básicas</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TextInput
                                    form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                    name="item_number"
                                    label="Número do Item"
                                    placeholder="ITEM-001"
                                    required
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
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
                            <h3 className="text-sm font-medium">Classificação</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ItemSelect
                                    label="Categoria"
                                    items={categories}
                                    value={categories.find(c => c.name === data.category)?.id.toString() || ''}
                                    onValueChange={(value) => {
                                        const selected = categories.find(c => c.id.toString() === value);
                                        if (selected) {
                                            setData('category', selected.name);
                                        }
                                    }}
                                    placeholder="Selecione a categoria"
                                    error={errors.category}
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
                                />
                                <ItemSelect
                                    label="Tipo de Item"
                                    items={itemTypes}
                                    value={itemTypes.find(t => t.value === data.item_type)?.id.toString() || ''}
                                    onValueChange={(value) => {
                                        const selected = itemTypes.find(t => t.id.toString() === value);
                                        if (selected) {
                                            setData('item_type', selected.value as any);
                                        }
                                    }}
                                    error={errors.item_type}
                                    required
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
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

                        {/* Capabilities */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Capacidades</h3>
                            {isEditMode ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={data.can_be_sold}
                                            onCheckedChange={(checked) => setData('can_be_sold', !!checked)}
                                            disabled={processing}
                                        />
                                        <span className="text-sm font-medium">Pode ser vendido</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={data.can_be_purchased}
                                            onCheckedChange={(checked) => setData('can_be_purchased', !!checked)}
                                            disabled={processing}
                                        />
                                        <span className="text-sm font-medium">Pode ser comprado</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={data.can_be_manufactured}
                                            onCheckedChange={(checked) => setData('can_be_manufactured', !!checked)}
                                            disabled={processing}
                                        />
                                        <span className="text-sm font-medium">Pode ser manufaturado</span>
                                    </label>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-4">
                                    {data.can_be_sold && (
                                        <div className="flex items-center gap-2 p-3 border rounded-lg">
                                            <ShoppingCart className="h-5 w-5 text-green-600" />
                                            <div>
                                                <p className="font-medium">Vendável</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Preço: {data.list_price ? formatCurrency(parseFloat(data.list_price)) : 'Não definido'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {data.can_be_manufactured && (
                                        <div className="flex items-center gap-2 p-3 border rounded-lg">
                                            <Factory className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium">Manufaturável</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {item?.current_bom ? 'BOM definida' : 'Sem BOM'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {data.can_be_purchased && (
                                        <div className="flex items-center gap-2 p-3 border rounded-lg">
                                            <Package className="h-5 w-5 text-orange-600" />
                                            <div>
                                                <p className="font-medium">Comprável</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Fornecedor: {data.preferred_vendor || 'Não definido'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Physical & Operational Attributes */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Atributos Físicos e Operacionais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                <TextInput
                                    form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                    name="lead_time_days"
                                    label="Lead Time (dias)"
                                    placeholder="0"
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
                                />
                            </div>
                        </div>

                        {/* Financial Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Informações Financeiras</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TextInput
                                    form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                    name="list_price"
                                    label="Preço de Lista"
                                    placeholder="0.00"
                                    disabled={!isEditMode || processing || !data.can_be_sold}
                                    view={!isEditMode}
                                />
                                <TextInput
                                    form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                    name="cost"
                                    label="Custo"
                                    placeholder="0.00"
                                    disabled={!isEditMode || processing}
                                    view={!isEditMode}
                                />
                            </div>
                        </div>

                        {/* Purchasing Information - Only show if can be purchased */}
                        {data.can_be_purchased && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Informações de Compra</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <TextInput
                                        form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                        name="preferred_vendor"
                                        label="Fornecedor Preferencial"
                                        placeholder="Nome do fornecedor"
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
                                </div>
                            </div>
                        )}

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
                            {item.current_bom ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium">Lista de Materiais Atual</h3>
                                        <Button variant="outline" asChild>
                                            <Link href={route('production.bom.show', item.current_bom_id)}>
                                                Ver BOM Completa
                                            </Link>
                                        </Button>
                                    </div>
                                    <div className="border rounded-lg p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailItem label="Número da BOM" value={item.current_bom.bom_number} />
                                            <DetailItem label="Nome" value={item.current_bom.name} />
                                            <DetailItem label="Descrição" value={item.current_bom.description || '—'} />
                                            <DetailItem label="Status" value={
                                                <Badge variant={item.current_bom.is_active ? 'default' : 'secondary'}>
                                                    {item.current_bom.is_active ? 'Ativa' : 'Inativa'}
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
                    id: 'history',
                    label: 'Histórico',
                    content: (
                        <div className="py-6">
                            <EmptyCard
                                icon={History}
                                title="Histórico vazio"
                                description="O histórico de alterações será exibido aqui"
                            />
                        </div>
                    ),
                },
                {
                    id: 'analytics',
                    label: 'Análises',
                    content: (
                        <div className="py-6">
                            <EmptyCard
                                icon={BarChart3}
                                title="Análises"
                                description="Análises de uso, custo e desempenho serão exibidas aqui"
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

    // Item type labels
    const itemTypeLabels: Record<string, string> = {
        manufactured: 'Manufaturado',
        purchased: 'Comprado',
        'manufactured-purchased': 'Manufaturado/Comprado',
        phantom: 'Fantasma',
        service: 'Serviço'
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreating ? 'Novo Item' : `Item ${item?.item_number}`} />

            <ShowLayout
                title={isCreating ? 'Novo Item' : item?.name || 'Item'}
                subtitle={
                    isCreating ? (
                        'Criação de novo item'
                    ) : (
                        `${item?.item_number}${item?.category ? ` • ${item.category}` : ''} • ${itemTypeLabels[item?.item_type || ''] || item?.item_type} • ${item?.status === 'active' ? 'Ativo' : item?.status === 'inactive' ? 'Inativo' : item?.status === 'prototype' ? 'Protótipo' : item?.status === 'discontinued' ? 'Descontinuado' : item?.status || 'Ativo'}`
                    )
                }
                editRoute=""
                tabs={tabs}
                defaultCompressed={isCompressed}
                onCompressedChange={setIsCompressed}
            />
        </AppLayout>
    );
} 