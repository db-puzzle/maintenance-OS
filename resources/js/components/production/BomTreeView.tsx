import React from 'react';
import { router } from '@inertiajs/react';
import {
    Edit,
    Plus,
    Trash2,
    GripVertical,
    Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TreeView, { TreeNode } from '@/components/shared/TreeView';
import { BomItem, Item } from '@/types/production';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';

interface BomTreeNode extends TreeNode {
    id: string;
    item_id: number;
    item: Item;
    quantity: number;
    unit_of_measure: string;
    reference_designators?: string;
    children?: BomTreeNode[];
}

interface BomTreeViewProps {
    items: BomTreeNode[];
    canEdit?: boolean;
    onEditItem?: (item: BomTreeNode) => void;
    onAddItem?: (parentId: string | null) => void;
    onDeleteItem?: (itemId: string) => void;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent, id: string) => void;
    onDragOver?: (e: React.DragEvent, targetId: string) => void;
    onDrop?: (e: React.DragEvent, targetId: string) => void;
    draggingId?: string | null;
    showActions?: boolean;
    emptyState?: React.ReactNode;
    headerColumns?: React.ReactNode;
    showImages?: boolean;
    expanded?: Record<string, boolean>;
    onToggleExpand?: (id: string) => void;
}

export default function BomTreeView({
    items,
    canEdit = false,
    onEditItem,
    onAddItem,
    onDeleteItem,
    draggable = false,
    onDragStart,
    onDragOver,
    onDrop,
    draggingId,
    showActions = true,
    emptyState,
    headerColumns,
    showImages = false,
    expanded,
    onToggleExpand
}: BomTreeViewProps) {
    const defaultEmptyState = (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum item na BOM</h3>
            <p className="text-muted-foreground mb-4">
                Adicione o primeiro item para começar a construir a estrutura
            </p>
            {canEdit && onAddItem && (
                <Button size="sm" onClick={() => onAddItem(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                </Button>
            )}
        </div>
    );

    const defaultHeaderColumns = (
        <div className={cn(
            "bg-muted/50 p-3 rounded-lg grid gap-2 font-semibold text-sm mb-2",
            showImages ? "grid-cols-[60px_1fr_1fr_80px_100px_80px]" : "grid-cols-12"
        )}>
            {showImages && <div className="text-center">Imagem</div>}
            <div className={showImages ? "" : "col-span-3"}>Código do Item</div>
            <div className={showImages ? "" : "col-span-4"}>Descrição</div>
            <div className="text-center">Qtd</div>
            <div className="text-center">Unidade</div>
            <div className="text-right">Ações</div>
        </div>
    );

    const renderBomNode = (node: BomTreeNode) => {
        const isDragging = draggingId === node.id;

        return (
            <div
                className={cn(
                    "flex-grow p-2 border rounded-lg transition-all",
                    isDragging ? 'opacity-50' : '',
                    draggingId && draggingId !== node.id && canEdit && draggable ? 'hover:border-blue-500 hover:border-dashed' : '',
                    "hover:bg-muted/50"
                )}
                onDragOver={draggable ? (e) => onDragOver?.(e, node.id) : undefined}
                onDrop={draggable ? (e) => onDrop?.(e, node.id) : undefined}
            >
                <div className="flex items-center w-full gap-2">
                    {/* Drag handle */}
                    {canEdit && draggable && (
                        <div
                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
                            draggable="true"
                            onDragStart={(e) => onDragStart?.(e, node.id)}
                            title="Arrastar para reposicionar"
                        >
                            <GripVertical size={14} />
                        </div>
                    )}

                    {/* Item details */}
                    <div className={cn(
                        "flex-grow grid gap-2 items-center",
                        showImages ? "grid-cols-[60px_1fr_1fr_80px_100px_80px]" : "grid-cols-12"
                    )}>
                        {showImages && (
                            <div className="flex items-center justify-center">
                                <ItemImagePreview
                                    primaryImageUrl={node.item.primary_image_thumbnail_url || node.item.primary_image_url}
                                    imageCount={node.item.images?.length || 0}
                                    className="w-12 h-12 cursor-pointer"
                                    onClick={(e) => {
                                        e?.stopPropagation();
                                        if (node.item.id) {
                                            router.visit(route('production.items.show', node.item.id));
                                        }
                                    }}
                                />
                            </div>
                        )}
                        <div className={cn(
                            "font-medium",
                            !showImages && "col-span-3"
                        )}>
                            <div className="text-sm">{node.item.item_number}</div>
                            {node.reference_designators && (
                                <div className="text-xs text-muted-foreground">Ref: {node.reference_designators}</div>
                            )}
                        </div>
                        <div className={cn(
                            "text-foreground text-sm",
                            !showImages && "col-span-4"
                        )}>
                            {node.item.name}
                        </div>
                        <div className={cn(
                            "text-center text-sm text-foreground",
                            !showImages && "col-span-1"
                        )}>
                            {node.quantity}
                        </div>
                        <div className={cn(
                            "text-center text-sm text-foreground",
                            !showImages && "col-span-2"
                        )}>
                            {node.unit_of_measure}
                        </div>
                        <div className={cn(
                            "flex justify-end gap-1",
                            !showImages && "col-span-2"
                        )}>
                            {canEdit && showActions && (
                                <>
                                    {onEditItem && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onEditItem(node)}
                                            title="Editar item"
                                        >
                                            <Edit size={14} />
                                        </Button>
                                    )}
                                    {onAddItem && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onAddItem(node.id)}
                                            title="Adicionar sub-item"
                                        >
                                            <Plus size={14} />
                                        </Button>
                                    )}
                                    {onDeleteItem && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onDeleteItem(node.id)}
                                            title="Remover item"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            {headerColumns || defaultHeaderColumns}
            <TreeView<BomTreeNode>
                data={items}
                renderNode={renderBomNode}
                emptyState={emptyState || defaultEmptyState}
                defaultExpanded={true}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
            />
        </div>
    );
} 