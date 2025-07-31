import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { router, usePage } from '@inertiajs/react';
import { Head, Link } from '@inertiajs/react';
import { Package, History, Factory, FileText, Plus, Download, QrCode, Copy, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import TextInput from '@/components/TextInput';
import ItemSelect from '@/components/ItemSelect';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import EmptyCard from '@/components/ui/empty-card';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import BomConfiguration from '@/components/production/BomConfiguration';
import { BillOfMaterial, BomItem, BomVersion, Item, ItemCategory } from '@/types/production';
import { ColumnConfig } from '@/types/shared';
import { type BreadcrumbItem } from '@/types';
import { toast } from 'sonner';

interface Props {
    bom?: BillOfMaterial;
    items: Item[];
    categories?: ItemCategory[];
    can: {
        update: boolean;
        delete: boolean;
        manageItems: boolean;
    };
    isCreating?: boolean;
}

export default function BomShow({ bom, items = [], categories, can = { update: false, delete: false, manageItems: false }, isCreating = false }: Props) {
    const [isEditMode, setIsEditMode] = useState(isCreating);
    const [isCompressed, setIsCompressed] = useState(false);



    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm({
        name: bom?.name || '',
        description: bom?.description || '',
        external_reference: bom?.external_reference || '',
        output_item_id: bom?.output_item_id?.toString() || '',
        is_active: bom?.is_active ?? true,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'BOMs',
            href: route('production.bom.index'),
        },
        {
            title: isCreating ? 'Nova BOM' : (bom?.name || 'BOM'),
            href: isCreating ? route('production.bom.create') : (bom ? route('production.bom.show', bom.id) : '#'),
        },
    ];

    // Column configurations
    const versionColumns: ColumnConfig[] = [
        { key: 'version_number', label: 'Versão', sortable: true },
        { key: 'published_at', label: 'Publicado em', format: 'date', sortable: true } as any,
        { key: 'revision_notes', label: 'Notas de Revisão' },
        { key: 'is_current', label: 'Status', format: (value: boolean) => value ? <Badge>Atual</Badge> : <Badge variant="secondary">Histórica</Badge> } as any,
    ];

    const itemMasterColumns: ColumnConfig[] = [
        { key: 'item_number', label: 'Código', sortable: true },
        { key: 'name', label: 'Descrição', sortable: true },
        { key: 'category', label: 'Categoria' },
        { key: 'status', label: 'Status', format: (value: string) => <Badge variant={value === 'active' ? 'default' : 'secondary'}>{value}</Badge> } as any,
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isCreating) {
            post(route('production.bom.store'), {
                onSuccess: () => {
                    toast.success('BOM criada com sucesso');
                },
                onError: (errors) => {
                    console.error('BOM creation errors:', errors);
                    const errorMessage = Object.values(errors).flat().join(', ') || 'Erro ao criar BOM';
                    toast.error(errorMessage);
                }
            });
        } else if (bom) {
            put(route('production.bom.update', bom.id), {
                onSuccess: () => {
                    toast.success('BOM atualizada com sucesso');
                    setIsEditMode(false);
                },
                onError: () => {
                    toast.error('Erro ao atualizar BOM');
                }
            });
        }
    };

    const handleDelete = () => {
        if (!bom || !confirm('Tem certeza que deseja excluir esta BOM?')) return;

        router.delete(route('production.bom.destroy', bom.id), {
            onSuccess: () => {
                toast.success('BOM excluída com sucesso');
            }
        });
    };

    const handleDuplicate = () => {
        if (!bom) return;

        router.post(route('production.bom.duplicate', bom.id), {}, {
            onSuccess: () => {
                toast.success('BOM duplicada com sucesso');
            }
        });
    };

    const handleGenerateQr = () => {
        if (!bom) return;

        router.post(route('production.bom.generate-qr', bom.id), {}, {
            onSuccess: () => {
                toast.success('QR Codes gerados com sucesso');
            }
        });
    };

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {!isCreating ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Número da BOM</label>
                                    <div className="flex items-center h-10 px-3 py-2 rounded-md border border-input bg-muted">
                                        <span className="text-sm">{bom?.bom_number}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Gerado automaticamente pelo sistema</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Número da BOM</label>
                                    <div className="flex items-center h-10 px-3 py-2 rounded-md border border-input bg-muted">
                                        <span className="text-sm text-muted-foreground">Será gerado automaticamente</span>
                                    </div>
                                </div>
                            )}
                            <TextInput
                                form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                name="external_reference"
                                label="Referência Externa"
                                placeholder="Número do desenho no Inventor"
                                disabled={!isEditMode || processing}
                                view={!isEditMode}
                            />
                        </div>

                        <ItemSelect
                            label="Produto Final"
                            items={items.filter(item => item.can_be_manufactured).map(item => ({
                                id: item.id,
                                name: `${item.item_number} - ${item.name}`
                            }))}
                            value={data.output_item_id}
                            onValueChange={(value) => setData('output_item_id', value)}
                            placeholder="Selecione o produto que esta BOM produz"
                            error={errors.output_item_id}
                            disabled={!isEditMode || processing}
                            view={!isEditMode}
                            required
                            searchable
                        />

                        <TextInput
                            form={{ data, setData, errors, clearErrors: clearErrors as any }}
                            name="name"
                            label="Nome"
                            placeholder="Nome da BOM"
                            required
                            disabled={!isEditMode || processing}
                            view={!isEditMode}
                        />

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Descrição detalhada da BOM"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={4}
                                disabled={!isEditMode || processing}
                            />
                            {errors.description && (
                                <p className="text-sm text-destructive">{errors.description}</p>
                            )}
                        </div>

                        {/* Status */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Status</h3>
                            {isEditMode ? (
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={data.is_active}
                                        onCheckedChange={(checked) => setData('is_active', checked as boolean)}
                                        disabled={processing}
                                    />
                                    <span className="text-sm font-medium">BOM Ativa</span>
                                </label>
                            ) : (
                                <Badge variant={data.is_active ? 'default' : 'secondary'}>
                                    {data.is_active ? 'Ativa' : 'Inativa'}
                                </Badge>
                            )}
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
                                    {processing ? 'Salvando...' : (isCreating ? 'Criar BOM' : 'Salvar Alterações')}
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
                {
                    id: 'configuration',
                    label: 'Configuração',
                    icon: <Settings className="h-4 w-4" />,
                    content: (
                        <div className="h-[calc(100vh-300px)]">
                            <BomConfiguration
                                bomId={bom?.id || 0}
                                versionId={bom?.current_version?.id || 0}
                                bomItems={(bom?.current_version?.items || []).filter(item => item.item) as any[]}
                                availableItems={items}
                                categories={categories}
                                canEdit={can.manageItems}
                                onUpdate={() => router.reload({ only: ['bom'] })}
                                bom={bom ? {
                                    name: bom.name,
                                    bom_number: bom.bom_number,
                                    current_version: bom.current_version ? {
                                        version_number: bom.current_version.version_number,
                                        items: bom.current_version.items
                                    } : undefined,
                                    versions: bom.versions
                                } : undefined}
                            />
                        </div>
                    ),
                },
                {
                    id: 'versions',
                    label: `Versões (${bom?.versions?.length || 0})`,
                    content: (
                        <div className="py-6">
                            {bom?.versions && bom.versions.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium">Histórico de Versões</h3>
                                        {can.update && (
                                            <Button onClick={() => {/* TODO: Create version */ }}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Nova Versão
                                            </Button>
                                        )}
                                    </div>
                                    <EntityDataTable
                                        data={bom.versions as unknown as Record<string, unknown>[]}
                                        columns={versionColumns}
                                        loading={false}
                                        actions={(version: any) => (
                                            can.update && !version.is_current ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.post(route('production.bom.versions.set-current', {
                                                        bom: bom.id,
                                                        version: version.id
                                                    }))}
                                                >
                                                    Definir como Atual
                                                </Button>
                                            ) : null
                                        )}
                                    />
                                </div>
                            ) : (
                                <EmptyCard
                                    icon={History}
                                    title="Nenhuma versão criada"
                                    description="Versões serão listadas aqui conforme forem criadas"
                                />
                            )}
                        </div>
                    ),
                },
                {
                    id: 'usage',
                    label: 'Produto',
                    content: (
                        <div className="py-6">
                            {bom?.output_item ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium mb-4">Produto que esta BOM produz</h3>
                                    <div className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium">{bom.output_item.item_number}</h4>
                                                <p className="text-sm text-muted-foreground">{bom.output_item.name}</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.visit(route('production.items.show', bom.output_item!.id))}
                                            >
                                                Ver Item
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <EmptyCard
                                    icon={Factory}
                                    title="Produto não definido"
                                    description="Esta BOM não tem um produto final associado"
                                />
                            )}
                        </div>
                    ),
                },
            ]),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreating ? 'Nova BOM' : `BOM ${(bom as any)?.bom_number}`} />

            <ShowLayout
                title={isCreating ? 'Nova BOM' : (bom as any)?.bom_number || 'BOM'}
                subtitle={
                    isCreating ? (
                        'Criação de nova lista de materiais'
                    ) : (
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-muted-foreground">{bom?.name}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{bom?.current_version?.items?.length || 0} itens</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{bom?.versions?.length || 0} versões</span>
                        </span>
                    )
                }
                editRoute=""
                tabs={tabs}
                defaultCompressed={isCompressed}
                onCompressedChange={setIsCompressed}
            />

            {/* Action buttons for existing BOMs */}
            {!isCreating && bom && (
                <div className="fixed bottom-6 right-6 flex gap-2">
                    <Button variant="outline" onClick={() => router.get(route('production.bom.export', bom.id))}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                    </Button>
                    {can.manageItems && (
                        <Button variant="outline" onClick={handleGenerateQr}>
                            <QrCode className="h-4 w-4 mr-2" />
                            Gerar QR Codes
                        </Button>
                    )}
                    <EntityActionDropdown
                        onEdit={can.update ? () => setIsEditMode(true) : undefined}
                        onDelete={can.delete ? handleDelete : undefined}
                        additionalActions={[
                            {
                                label: 'Duplicar',
                                icon: <Copy className="h-4 w-4" />,
                                onClick: handleDuplicate
                            }
                        ]}
                    />
                </div>
            )}
        </AppLayout>
    );
}