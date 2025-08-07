import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Package, History, GitBranch, Download, Upload, FileText, Image, ImageOff, Loader2 } from 'lucide-react';
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
import { Item, ItemCategory } from '@/types/production';
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
    const [loading, setLoading] = useState(false);
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
            render: (value: any) => value || '-'
        }
    ];

    const imageColumn: ColumnConfig = {
        key: 'images',
        label: 'Imagem',
        width: 'w-[160px]',
        render: (value: any, item: any) => (
            <ItemImagePreview
                primaryImageUrl={item.primary_image_url}
                imageCount={item.images_count || 0}
                className="w-36 h-36"
                onClick={async (e) => {
                    e?.stopPropagation(); // Prevent row click event

                    // If item has images, use them, otherwise fetch
                    if (item.images && item.images.length > 0) {
                        setCarouselItem(item);
                        setCarouselOpen(true);
                    } else if (item.images_count && item.images_count > 0) {
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
        render: (value: any, item: any) => (
            <div>
                <div className="font-medium">{value}</div>
                {item.category && (
                    <div className="text-muted-foreground text-sm">
                        {item.category.name && item.category.name.length > 40
                            ? `${item.category.name.substring(0, 40)}...`
                            : item.category.name || '-'}
                    </div>
                )}
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
        //     render: (value: any) => itemTypeLabels[value as string] || value || '-'
        // },
        {
            key: 'capabilities',
            label: 'Capacidades',
            width: 'w-[200px]',
            render: (value: any, item: any) => {
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
            render: (value: any, item: any) => (
                item.primary_bom && item.can_be_manufactured ? (
                    <Link
                        href={route('production.bom.show', item.primary_bom?.id)}
                        className="text-primary hover:underline"
                    >
                        {item.primary_bom.bom_number}
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
            render: (value: any) => {
                const labels: Record<string, string> = {
                    'active': 'Ativo',
                    'inactive': 'Inativo',
                    'prototype': 'Protótipo',
                    'discontinued': 'Descontinuado'
                };
                return labels[value] || value || '-';
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
                        data={data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={loading}
                        onRowClick={(item) => router.visit(route('production.items.show', (item as any).id))}
                        actions={(item) => (
                            <EntityActionDropdown
                                onEdit={() => setEditItem(item as any)}
                                onDelete={() => setDeleteItem(item as any)}
                                additionalActions={[
                                    ...((item as any).can_be_manufactured ? [
                                        {
                                            label: 'Gerenciar BOM',
                                            icon: <Package className="h-4 w-4" />,
                                            onClick: () => router.visit(route('production.items.bom', (item as any).id))
                                        },
                                        {
                                            label: 'Histórico de BOM',
                                            icon: <History className="h-4 w-4" />,
                                            onClick: () => router.visit(route('production.items.bom-history', (item as any).id))
                                        }
                                    ] : []),
                                    {
                                        label: 'Onde é Usado',
                                        icon: <GitBranch className="h-4 w-4" />,
                                        onClick: () => router.visit(route('production.items.where-used', (item as any).id))
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

