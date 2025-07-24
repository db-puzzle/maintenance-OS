import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { router, usePage } from '@inertiajs/react';
import { Head, Link } from '@inertiajs/react';
import { Package, History, Factory, FileText, Plus, GitBranch, Download, QrCode, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import TextInput from '@/components/TextInput';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import EmptyCard from '@/components/ui/empty-card';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { BillOfMaterial, BomItem, BomVersion, Item } from '@/types/production';
import { ColumnConfig } from '@/types/shared';

interface TextAreaInputProps {
    form: {
        data: Record<string, any>;
        setData: (name: string, value: any) => void;
        errors: Partial<Record<string, string>>;
        clearErrors: (...fields: string[]) => void;
    };
    name: string;
    label: string;
    placeholder: string;
    rows?: number;
    required?: boolean;
    disabled?: boolean;
    view?: boolean;
}

function TextAreaInput({ form, name, label, placeholder, rows = 3, required = false, disabled = false, view = false }: TextAreaInputProps) {
    const value = form.data[name];
    const hasValue = value !== null && value !== undefined && value !== '';

    return (
        <div className="grid gap-2">
            <label className="text-sm font-medium">
                {label}
                {required && <span className="text-destructive"> *</span>}
            </label>
            <div className="bg-background">
                {view ? (
                    <div className="rounded-md border bg-muted/20 p-2 text-sm">
                        {hasValue ? String(value) : placeholder}
                    </div>
                ) : (
                    <textarea
                        className="rounded-md border bg-background px-3 py-2 text-sm w-full resize-none"
                        name={name}
                        placeholder={placeholder}
                        value={value || ''}
                        onChange={(e) => form.setData(name, e.target.value)}
                        onBlur={() => form.clearErrors(name)}
                        rows={rows}
                        disabled={disabled}
                    />
                )}
            </div>
            {form.errors[name] && (
                <p className="text-sm text-destructive">{form.errors[name]}</p>
            )}
        </div>
    );
}

interface Props {
    bom?: BillOfMaterial & {
        currentVersion?: BomVersion & {
            items: (BomItem & { item: Item })[];
        };
        versions: BomVersion[];
        itemMasters: Item[];
        versions_count?: number;
        item_masters_count?: number;
    };
    items?: Item[];
    can?: {
        update: boolean;
        delete: boolean;
        manageItems: boolean;
    };
    isCreating?: boolean;
}

export default function BomShow({ bom, items = [], can = { update: false, delete: false, manageItems: false }, isCreating = false }: Props) {
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
        { title: 'BOMs', href: route('production.bom.index') },
        { title: bom?.bom_number || 'Nova BOM', href: '' }
    ];

    // Form state for creation/editing
    const { data, setData, errors, processing, post, patch, clearErrors } = useForm({
        bom_number: bom?.bom_number || '',
        name: bom?.name || '',
        description: bom?.description || '',
        external_reference: bom?.external_reference || '',
        is_active: bom?.is_active !== undefined ? bom.is_active : true,
    });

    const [isEditMode, setIsEditMode] = useState(isCreating);
    const [isCompressed, setIsCompressed] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isCreating) {
            post(route('production.bom.store'));
        } else if (bom) {
            patch(route('production.bom.update', bom.id), {
                onSuccess: () => {
                    setIsEditMode(false);
                },
            });
        }
    };

    const handleDelete = () => {
        if (bom && confirm('Tem certeza que deseja excluir esta BOM?')) {
            router.delete(route('production.bom.destroy', bom.id));
        }
    };

    const handleDuplicate = () => {
        if (bom) {
            router.post(route('production.bom.duplicate', bom.id));
        }
    };

    const handleGenerateQr = () => {
        if (bom) {
            router.post(route('production.bom.generate-qr', bom.id));
        }
    };

    const renderBomItems = (items: any[], level: number = 0) => {
        return items.map((bomItem, index) => (
            <div key={bomItem.id} style={{ marginLeft: `${level * 2}rem` }} className="border-b py-3">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {bomItem.sequence_number || index + 1}.
                            </span>
                            <span className="font-medium">{bomItem.item.item_number}</span>
                            <span className="text-muted-foreground">- {bomItem.item.name}</span>
                        </div>
                        {bomItem.reference_designators && (
                            <div className="text-sm text-muted-foreground mt-1">
                                Ref: {bomItem.reference_designators}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm">
                            {bomItem.quantity} {bomItem.unit_of_measure}
                        </span>
                        {bomItem.qr_code && (
                            <Badge variant="outline" className="text-xs">
                                <QrCode className="h-3 w-3 mr-1" />
                                {bomItem.qr_code}
                            </Badge>
                        )}
                        {can.manageItems && (
                            <EntityActionDropdown
                                onEdit={() => {/* TODO: Implement edit */ }}
                                onDelete={() => {/* TODO: Implement delete */ }}
                            />
                        )}
                    </div>
                </div>
                {bomItem.children && bomItem.children.length > 0 && (
                    <div className="mt-2">
                        {renderBomItems(bomItem.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    const versionColumns: ColumnConfig[] = [
        {
            key: 'version_number',
            label: 'Versão',
            width: 'w-[100px]',
            render: (value: any, version: any) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium">v{value}</span>
                    {version.is_current && (
                        <Badge variant="default">Atual</Badge>
                    )}
                </div>
            )
        },
        {
            key: 'revision_notes',
            label: 'Notas de Revisão',
            render: (value: any) => value || '-'
        },
        {
            key: 'published_at',
            label: 'Publicada em',
            width: 'w-[150px]',
            render: (value: any) => new Date(value).toLocaleDateString('pt-BR')
        }
    ];

    const itemMasterColumns: ColumnConfig[] = [
        {
            key: 'item_number',
            label: 'Código',
            width: 'w-[150px]',
            render: (value: any, item: any) => (
                <Link
                    href={route('production.items.show', item.id)}
                    className="font-medium hover:underline"
                >
                    {value}
                </Link>
            )
        },
        {
            key: 'name',
            label: 'Nome',
            render: (value: any) => value
        },
        {
            key: 'is_active',
            label: 'Status',
            width: 'w-[100px]',
            render: (value: any) => (
                <Badge variant={value ? 'default' : 'secondary'}>
                    {value ? 'Ativo' : 'Inativo'}
                </Badge>
            )
        }
    ];

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

                        <TextAreaInput
                            form={{ data, setData, errors, clearErrors: clearErrors as any }}
                            name="description"
                            label="Descrição"
                            placeholder="Descrição detalhada da BOM"
                            rows={4}
                            disabled={!isEditMode || processing}
                            view={!isEditMode}
                        />

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
                    id: 'items',
                    label: `Itens (${bom?.currentVersion?.items?.length || 0})`,
                    content: (
                        <div className="py-6">
                            {bom?.currentVersion?.items && bom.currentVersion.items.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-medium">Estrutura de Materiais</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Versão {bom.currentVersion?.version_number || 1} -
                                                {bom.currentVersion?.is_current ? ' Atual' : ' Histórica'}
                                            </p>
                                        </div>
                                        {can.manageItems && (
                                            <Button onClick={() => {/* TODO: Add item modal */ }}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Adicionar Item
                                            </Button>
                                        )}
                                    </div>
                                    <div className="border rounded-lg">
                                        {renderBomItems(bom.currentVersion.items.filter(item => !item.parent_item_id))}
                                    </div>
                                </div>
                            ) : (
                                <EmptyCard
                                    icon={Package}
                                    title="Nenhum item adicionado"
                                    description="Adicione itens a esta BOM para definir sua estrutura"
                                    primaryButtonText="Adicionar Item"
                                    primaryButtonAction={() => {/* TODO: Add item modal */ }}
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
                    <Button variant="outline" onClick={() => router.visit(route('production.bom.hierarchy', bom.id))}>
                        <GitBranch className="h-4 w-4 mr-2" />
                        Hierarquia
                    </Button>
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