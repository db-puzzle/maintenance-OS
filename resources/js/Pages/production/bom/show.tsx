import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { router, usePage } from '@inertiajs/react';
import { Head, Link } from '@inertiajs/react';
import { Package, History, Factory, FileText, Plus, Download, QrCode, Copy, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import TextInput from '@/components/TextInput';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import EmptyCard from '@/components/ui/empty-card';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import BomConfiguration from '@/components/production/BomConfiguration';
import { BillOfMaterial, BomItem, BomVersion, Item } from '@/types/production';
import { ColumnConfig } from '@/types/shared';
import { toast } from 'sonner';

interface Props {
    bom?: BillOfMaterial;
    items: Item[];
    can: {
        update: boolean;
        delete: boolean;
        manageItems: boolean;
    };
    isCreating?: boolean;
}

export default function BomShow({ bom, items = [], can = { update: false, delete: false, manageItems: false }, isCreating = false }: Props) {
    const [isEditMode, setIsEditMode] = useState(isCreating);
    const [isCompressed, setIsCompressed] = useState(false);

    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm({
        bom_number: bom?.bom_number || '',
        name: bom?.name || '',
        description: bom?.description || '',
        external_reference: bom?.external_reference || '',
        is_active: bom?.is_active ?? true,
    });

    const breadcrumbs = [
        { label: 'Produção', href: '/production' },
        { label: 'BOMs', href: route('production.bom.index') },
        { label: isCreating ? 'Nova BOM' : (bom?.name || 'BOM') },
    ];

    // Column configurations
    const versionColumns: ColumnConfig[] = [
        { key: 'version_number', label: 'Versão', sortable: true },
        { key: 'published_at', label: 'Publicado em', format: 'date', sortable: true },
        { key: 'revision_notes', label: 'Notas de Revisão' },
        { key: 'is_current', label: 'Status', format: (value: boolean) => value ? <Badge>Atual</Badge> : <Badge variant="secondary">Histórica</Badge> },
    ];

    const itemMasterColumns: ColumnConfig[] = [
        { key: 'item_number', label: 'Código', sortable: true },
        { key: 'name', label: 'Descrição', sortable: true },
        { key: 'category', label: 'Categoria' },
        { key: 'status', label: 'Status', format: (value: string) => <Badge variant={value === 'active' ? 'default' : 'secondary'}>{value}</Badge> },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isCreating) {
            post(route('production.bom.store'), {
                onSuccess: () => {
                    toast.success('BOM criada com sucesso');
                },
                onError: () => {
                    toast.error('Erro ao criar BOM');
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

    const renderBomItems = (items: BomItem[], level = 0): React.ReactNode => {
        return items.map((item) => (
            <div key={item.id} className={`border-b last:border-0 ${level > 0 ? 'ml-8' : ''}`}>
                <div className="p-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="font-medium">{item.item?.itemNumber || item.item?.item_number}</div>
                            <div className="text-sm text-muted-foreground">{item.item?.name}</div>
                        </div>
                        <div className="text-sm">
                            <Badge variant="secondary">{item.quantity} {item.unitOfMeasure || item.unit_of_measure}</Badge>
                        </div>
                    </div>
                </div>
                {item.children && item.children.length > 0 && renderBomItems(item.children, level + 1)}
            </div>
        ));
    };

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <TextInput
                                form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                name="bom_number"
                                label="Número da BOM"
                                placeholder="BOM-2024-0001"
                                required
                                disabled={!isEditMode || processing}
                                view={!isEditMode}
                            />
                            <TextInput
                                form={{ data, setData, errors, clearErrors: clearErrors as any }}
                                name="external_reference"
                                label="Referência Externa"
                                placeholder="Número do desenho no Inventor"
                                disabled={!isEditMode || processing}
                                view={!isEditMode}
                            />
                        </div>

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
                                versionId={bom?.currentVersion?.id || 0}
                                bomItems={bom?.currentVersion?.items || []}
                                availableItems={items}
                                canEdit={can.manageItems}
                                onUpdate={() => router.reload({ only: ['bom'] })}
                            />
                        </div>
                    ),
                },
                {
                    id: 'items',
                    label: `Itens (${bom?.currentVersion?.items?.length || 0})`,
                    content: (
                        <div className="py-6">
                            {bom?.currentVersion?.items && bom.currentVersion.items.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-medium">Lista de Materiais</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Versão {bom?.currentVersion?.version_number || 1} -
                                                {bom?.currentVersion?.is_current ? ' Atual' : ' Histórica'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => router.visit(`/production/bom/${bom.id}#configuration`)}
                                            >
                                                <Settings className="h-4 w-4 mr-2" />
                                                Configurar Estrutura
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="border rounded-lg">
                                        {renderBomItems(bom.currentVersion.items.filter(item => {
                                            const parentId = item.parentItemId ?? item.parent_item_id;
                                            return parentId === null || parentId === undefined;
                                        }))}
                                    </div>
                                </div>
                            ) : (
                                <EmptyCard
                                    icon={Package}
                                    title="Nenhum item adicionado"
                                    description="Adicione itens a esta BOM para definir sua estrutura"
                                    primaryButtonText="Configurar BOM"
                                    primaryButtonAction={() => router.visit(`/production/bom/${bom.id}#configuration`)}
                                />
                            )}
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
                    label: `Onde é Usada (${bom?.itemMasters?.length || 0})`,
                    content: (
                        <div className="py-6">
                            {bom?.itemMasters && bom.itemMasters.length > 0 ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium mb-4">Itens que Usam esta BOM</h3>
                                    <EntityDataTable
                                        data={bom.itemMasters as unknown as Record<string, unknown>[]}
                                        columns={itemMasterColumns}
                                        loading={false}
                                        onRowClick={(item: any) => router.visit(route('production.items.show', item.id))}
                                    />
                                </div>
                            ) : (
                                <EmptyCard
                                    icon={Factory}
                                    title="Não utilizada"
                                    description="Esta BOM não está sendo usada por nenhum item"
                                />
                            )}
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
                                description="Anexe arquivos relacionados a esta BOM"
                                primaryButtonText="Adicionar arquivo"
                                primaryButtonAction={() => { }}
                            />
                        </div>
                    ),
                },
            ]),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreating ? 'Nova BOM' : `BOM ${bom?.bom_number}`} />

            <ShowLayout
                title={isCreating ? 'Nova BOM' : bom?.name || 'BOM'}
                subtitle={
                    isCreating ? (
                        'Criação de nova lista de materiais'
                    ) : (
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>#{bom?.bom_number}</span>
                            {bom?.external_reference && (
                                <>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-muted-foreground">Ref: {bom.external_reference}</span>
                                </>
                            )}
                            {bom?.currentVersion && (
                                <>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-muted-foreground">v{bom.currentVersion.version_number}</span>
                                </>
                            )}
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