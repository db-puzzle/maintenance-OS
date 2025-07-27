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
    headerColumns
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
        <div className="bg-muted/50 p-3 rounded-lg grid grid-cols-12 gap-2 font-semibold text-sm mb-2">
            <div className="col-span-3">Código do Item</div>
            <div className="col-span-4">Descrição</div>
            <div className="col-span-1 text-center">Qtd</div>
            <div className="col-span-2 text-center">Unidade</div>
            <div className="col-span-2 text-right">Ações</div>
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
                    <div className="flex-grow grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3 font-medium">
                            <div className="text-sm">{node.item.item_number}</div>
                            {node.reference_designators && (
                                <div className="text-xs text-muted-foreground">Ref: {node.reference_designators}</div>
                            )}
                        </div>
                        <div className="col-span-4 text-foreground text-sm">{node.item.name}</div>
                        <div className="col-span-1 text-center text-sm text-foreground">
                            {node.quantity}
                        </div>
                        <div className="col-span-2 text-center text-sm text-foreground">
                            {node.unit_of_measure}
                        </div>
                        <div className="col-span-2 flex justify-end gap-1">
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
            />
        </div>
    );
} 