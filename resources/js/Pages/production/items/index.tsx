import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Package, History, GitBranch, Download, Upload, FileText, Image, ImageOff, Loader2, Copy, QrCode } from 'lucide-react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreateItemSheet } from '@/components/CreateItemSheet';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import { ItemImageCarouselDialog } from '@/components/production/ItemImageCarouselDialog';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import AppLayout from '@/layouts/app-layout';
import { ColumnConfig } from '@/types/shared';
import { Item, ItemCategory, ItemImage, BillOfMaterial } from '@/types/production';
import { Link } from '@inertiajs/react';
interface Props {
    items: {
        data: Item[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        search?: string;
        status?: string;
        type?: string; // Keep for backward compatibility, but won't be used
        per_page?: number;
    };
    categories?: ItemCategory[];
    can?: {
        create?: boolean;
        import?: boolean;
        export?: boolean;
    };
}
// DEPRECATED: item_type is no longer used
// const itemTypeLabels: Record<string, string> = {
//     manufactured: 'Manufaturado',
//     purchased: 'Comprado',
//     'manufactured-purchased': 'Manufaturado/Comprado'
// };
export default function ItemsIndex({ items, filters, categories, can }: Props) {
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const [deleteItem, setDeleteItem] = useState<Item | null>(null);
    const [loading] = useState(false);
    const [editItem, setEditItem] = useState<Item | null>(null);
    const [showImages, setShowImages] = useState(true);
    const [carouselItem, setCarouselItem] = useState<Item | null>(null);
    const [carouselOpen, setCarouselOpen] = useState(false);
    const [loadingImages, setLoadingImages] = useState(false);
    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        router.get(route('production.items.index'), { search: value }, {
            preserveState: true,
            preserveScroll: true
        });
    };
    const handlePageChange = (page: number) => {
        router.get(route('production.items.index'), { ...filters, search: searchValue, page }, {
            preserveState: true,
            preserveScroll: true
        });
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(route('production.items.index'), { ...filters, search: searchValue, per_page: perPage, page: 1 }, {
            preserveState: true,
            preserveScroll: true
        });
    };
    // Use data from server
    const data = items.data;
    const pagination = {
        current_page: items.current_page,
        last_page: items.last_page,
        per_page: items.per_page,
        total: items.total,
        from: items.from,
        to: items.to,
    };
    const handleDelete = async () => {
        if (!deleteItem) return;
        try {
            await router.delete(route('production.items.destroy', deleteItem.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setDeleteItem(null);
                },
                onError: () => {
                    console.error('Failed to delete item');
                }
            });
        } catch (error) {
            console.error('Delete error:', error);
        }
    };
    const handleEditSuccess = () => {
        setEditItem(null);
        router.reload({ only: ['items'] });
    };
    const handleExport = (format: 'json' | 'csv') => {
        const params = new URLSearchParams();
        params.append('format', format);
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, String(value));
            }
        });
        window.open(`${route('production.items.export')}?${params.toString()}`, '_blank');
    };
    const handleImport = () => {
        router.visit(route('production.items.import.wizard'));
    };
    const baseColumns: ColumnConfig[] = [
        {
            key: 'item_number',
            label: 'Número',
            sortable: true,
            width: 'w-[150px]',
            render: (value: unknown) => <>{value || '-'}</>
        }
    ];
    const imageColumn: ColumnConfig = {
        key: 'images',
        label: 'Imagem',
        width: 'w-[160px]',
        render: (value: unknown, item: Record<string, unknown>) => (
            <ItemImagePreview
                primaryImageUrl={item.primary_image_url as string | undefined}
                imageCount={(item.images_count as number) || 0}
                className="w-36 h-36"
                onClick={async (e) => {
                    e?.stopPropagation(); // Prevent row click event
                    // If item has images, use them, otherwise fetch
                    if (item.images && (item.images as ItemImage[]).length > 0) {
                        setCarouselItem(item as unknown as Item);
                        setCarouselOpen(true);
                    } else if (item.images_count && (item.images_count as number) > 0) {
                        setLoadingImages(true);
                        try {
                            // Fetch the item with images using our API endpoint
                            const response = await axios.get(route('production.items.with-images', item.id));
                            const itemWithImages = response.data.item;
                            if (itemWithImages && itemWithImages.images && itemWithImages.images.length > 0) {
                                setCarouselItem(itemWithImages);
                                setCarouselOpen(true);
                            } else {
                                // Fallback: navigate to item page
                                router.visit(route('production.items.show', { item: item.id, tab: 'images' }));
                            }
                        } catch (error) {
                            console.error('Error fetching item images:', error);
                            // Fallback: navigate to item page
                            router.visit(route('production.items.show', { item: item.id, tab: 'images' }));
                        } finally {
                            setLoadingImages(false);
                        }
                    } else {
                        // No images at all, navigate to item page
                        router.visit(route('production.items.show', { item: item.id, tab: 'images' }));
                    }
                }}
            />
        )
    };
    const nameColumn: ColumnConfig = {
        key: 'name',
        label: 'Nome',
        sortable: true,
        width: showImages ? 'w-[350px]' : 'w-[400px]',
        render: (value: unknown, item: Record<string, unknown>) => (
            <div>
                <div className="font-medium">{value as React.ReactNode}</div>
                {item.category ? (
                    <div className="text-muted-foreground text-sm">
                        {(item.category as ItemCategory).name && (item.category as ItemCategory).name.length > 40
                            ? `${(item.category as ItemCategory).name.substring(0, 40)}...`
                            : (item.category as ItemCategory).name || '-'}
                    </div>
                ) : null}
            </div>
        )
    };
    const otherColumns: ColumnConfig[] = [
        // DEPRECATED: item_type column removed
        // {
        //     key: 'item_type',
        //     label: 'Tipo',
        //     sortable: true,
        //     width: 'w-[150px]',
        //     render: (value: unknown) => itemTypeLabels[value as string] || value || '-'
        // },
        {
            key: 'capabilities',
            label: 'Capacidades',
            width: 'w-[200px]',
            render: (value: unknown, item: Record<string, unknown>) => {
                const capabilities = [];
                if (item.can_be_sold) capabilities.push('Vendável');
                if (item.can_be_manufactured) capabilities.push('Manufaturável');
                if (item.can_be_purchased) capabilities.push('Comprável');
                return capabilities.length > 0 ? capabilities.join(', ') : '-';
            }
        },
        {
            key: 'primary_bom',
            label: 'BOM Atual',
            width: 'w-[150px]',
            render: (value: unknown, item: Record<string, unknown>) => (
                item.primary_bom && item.can_be_manufactured ? (
                    <Link
                        href={route('production.bom.show', (item.primary_bom as BillOfMaterial)?.id)}
                        className="text-primary hover:underline"
                    >
                        {(item.primary_bom as BillOfMaterial).bom_number}
                    </Link>
                ) : (
                    '-'
                )
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[120px]',
            render: (value: unknown) => {
                const labels: Record<string, string> = {
                    'active': 'Ativo',
                    'inactive': 'Inativo',
                    'prototype': 'Protótipo',
                    'discontinued': 'Descontinuado'
                };
                return <>{labels[value as string] || value || '-'}</>;
            }
        }
    ];
    // Build final columns array conditionally
    const columns: ColumnConfig[] = [
        ...baseColumns,
        ...(showImages ? [imageColumn] : []),
        nameColumn,
        ...otherColumns
    ];
    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'Itens', href: '' }
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ListLayout
                title="Itens"
                description="Gerencie o catálogo de itens de manufatura, compra e venda"
                searchPlaceholder="Buscar por número ou nome do item..."
                searchValue={searchValue}
                onSearchChange={handleSearchChange}
                createRoute={route('production.items.create')}
                createButtonText="Novo Item"
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowImages(!showImages)}
                            className="flex items-center gap-2"
                        >
                            {showImages ? (
                                <>
                                    <ImageOff className="h-4 w-4" />
                                    Ocultar Imagens
                                </>
                            ) : (
                                <>
                                    <Image className="h-4 w-4" />
                                    Mostrar Imagens
                                </>
                            )}
                        </Button>
                        {can?.import && (
                            <Button
                                variant="outline"
                                onClick={handleImport}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Import
                            </Button>
                        )}
                        {can?.export && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleExport('json')}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Export as JSON
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Export as CSV
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                }
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={data as Array<Record<string, unknown>>}
                        columns={columns}
                        loading={loading}
                        emptyMessage="Nenhum item encontrado."
                        onRowClick={(item) => router.visit(route('production.items.show', item.id))}
                        actions={(item) => (
                            <EntityActionDropdown
                                align="end"
                                onEdit={() => setEditItem(item as Item)}
                                onDelete={() => setDeleteItem(item as Item)}
                                deleteOptions={{
                                    isDeleting: (item as Item).id === deleteItem?.id,
                                    hasPermission: true,
                                    onDelete: () => handleDelete(),
                                    confirmTitle: 'Confirmar Exclusão',
                                    confirmMessage: `Tem certeza que deseja excluir o item "${(item as Item).item_number}"?`,
                                    disabled: false
                                }}
                                additionalItems={[
                                    {
                                        label: 'Duplicar',
                                        icon: <Copy className="mr-2 h-4 w-4" />,
                                        onClick: () => handleDuplicate(item as Item)
                                    },
                                    {
                                        label: 'Gerar QR Code',
                                        icon: <QrCode className="mr-2 h-4 w-4" />,
                                        onClick: () => handleGenerateQr(item as Item)
                                    }
                                ]}
                            />
                        )}
                    />
                    <EntityPagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onPerPageChange={handlePerPageChange}
                    />
                </div>
            </ListLayout>
            {editItem && (
                <CreateItemSheet
                    item={editItem}
                    open={!!editItem}
                    onOpenChange={(open) => !open && setEditItem(null)}
                    mode="edit"
                    onSuccess={handleEditSuccess}
                    categories={categories}
                    onCategoriesRefresh={() => router.reload({ only: ['categories'] })}
                />
            )}
            <EntityDeleteDialog
                open={!!deleteItem}
                onOpenChange={(open) => !open && setDeleteItem(null)}
                entityLabel={deleteItem ? `o item ${deleteItem.name}` : ''}
                onConfirm={handleDelete}
                confirmationValue={deleteItem?.item_number || ''}
                confirmationLabel={deleteItem ? `Digite o número do item (${deleteItem.item_number}) para confirmar` : ''}
            />
            {carouselItem && carouselItem.images && carouselItem.images.length > 0 && (
                <ItemImageCarouselDialog
                    images={carouselItem.images}
                    open={carouselOpen}
                    onOpenChange={(open) => {
                        setCarouselOpen(open);
                        if (!open) setCarouselItem(null);
                    }}
                    startIndex={0}
                    itemName={carouselItem.name}
                />
            )}
            {/* Loading overlay */}
            {loadingImages && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Carregando imagens...</span>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
