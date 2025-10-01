import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Plus,
    Download,
    Search,
    Edit,
    Trash2,
    GripVertical,
    Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BomItem, Item, ItemCategory, BomVersion } from '@/types/production';
import { CreateItemSheet } from '@/components/CreateItemSheet';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import { ImageWithBlurEffect } from '@/components/production/ImageWithBlurEffect';
import { GenericHierarchicalTreeView, GenericTreeNode, NodeRenderProps } from './shared/GenericHierarchicalTreeView';
import { HierarchicalViewHeader } from './shared/HierarchicalViewHeader';
import { useTreeExpansion } from './shared/useTreeExpansion';

// Extend BomItem with tree structure
interface BomTreeNode extends GenericTreeNode {
    id: string;
    item_id: number;
    item: Item;
    quantity: number;
    unit_of_measure: string;
    reference_designators?: string;
    bom_notes?: string;
    assembly_instructions?: string;
    parent_item_id?: number | null;
    children?: BomTreeNode[];
}

interface EditingItem {
    id?: string;
    item_id?: number;
    item?: Item;
    quantity: number;
    unit_of_measure: string;
    reference_designators?: string;
    bom_notes?: string;
    assembly_instructions?: string;
}

interface BomHierarchicalViewProps {
    bomId: number;
    versionId: number;
    bomItems: (BomItem & { item: Item; children?: (BomItem & { item: Item })[] })[];
    availableItems: Item[];
    categories?: ItemCategory[];
    canEdit: boolean;
    onUpdate?: () => void;
    bom?: {
        name: string;
        bom_number: string;
        current_version?: {
            version_number: number;
            items?: BomItem[];
        };
        versions?: BomVersion[];
    };
}

export default function BomHierarchicalView({
    bomId,
    versionId,
    bomItems: initialBomItems,
    availableItems,
    categories,
    canEdit,
    onUpdate,
    bom,
}: BomHierarchicalViewProps) {
    const [bomItems, setBomItems] = useState<BomTreeNode[]>([]);
    const [dragging, setDragging] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCreateItemSheetOpen, setIsCreateItemSheetOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showImages, setShowImages] = useState(false);

    // Transform flat BOM items to hierarchical structure
    useEffect(() => {
        const buildHierarchy = (items: (BomItem & { item: Item })[], parentId: string | number | null = null): BomTreeNode[] => {
            return items
                .filter(item => {
                    const itemParentId = item.parent_item_id;
                    const itemParentIdStr = itemParentId ? String(itemParentId) : null;
                    const parentIdStr = parentId ? String(parentId) : null;
                    return itemParentIdStr === parentIdStr;
                })
                .map(item => ({
                    ...item,
                    id: String(item.id),
                    children: buildHierarchy(items, item.id)
                } as BomTreeNode));
        };

        const hierarchicalItems = buildHierarchy(initialBomItems);
        setBomItems(hierarchicalItems);
    }, [initialBomItems]); // Re-run when items change

    // Use tree expansion hook
    const {
        expanded,
        currentLevel,
        maxDepth,
        toggleNode,
        expandToLevel,
    } = useTreeExpansion(bomItems, true);

    // Helper functions
    const findItemById = (items: BomTreeNode[], id: string): BomTreeNode | null => {
        for (const item of items) {
            if (item.id === id) {
                return item;
            }
            if (item.children && item.children.length > 0) {
                const found = findItemById(item.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const removeItemFromTree = (items: BomTreeNode[], id: string): BomTreeNode[] => {
        return items.reduce<BomTreeNode[]>((acc, item) => {
            if (item.id === id) {
                return acc;
            }

            if (item.children && item.children.length > 0) {
                const newChildren = removeItemFromTree(item.children, id);
                return [...acc, { ...item, children: newChildren }];
            }

            return [...acc, item];
        }, []);
    };

    const addChildToItem = (items: BomTreeNode[], parentId: string, newChild: BomTreeNode): BomTreeNode[] => {
        return items.map(item => {
            if (item.id === parentId) {
                return {
                    ...item,
                    children: [...(item.children || []), newChild]
                };
            }
            if (item.children && item.children.length > 0) {
                return {
                    ...item,
                    children: addChildToItem(item.children, parentId, newChild)
                };
            }
            return item;
        });
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, node: BomTreeNode) => {
        if (!canEdit) return;

        const dragGhost = document.createElement('div');
        dragGhost.style.position = 'absolute';
        dragGhost.style.top = '-1000px';
        document.body.appendChild(dragGhost);
        e.dataTransfer.setDragImage(dragGhost, 0, 0);

        setDragging(node.id);
        e.dataTransfer.setData('text/plain', node.id);
        e.dataTransfer.effectAllowed = 'move';

        setTimeout(() => {
            document.body.removeChild(dragGhost);
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent, targetNode: BomTreeNode) => {
        if (!canEdit || dragging === targetNode.id) return;

        // Check for circular reference
        const isChildOfDragged = (draggedId: string, targetId: string): boolean => {
            const draggedItem = findItemById(bomItems, draggedId);

            const checkChildren = (item: BomTreeNode): boolean => {
                if (item.id === targetId) return true;
                if (item.children && item.children.length > 0) {
                    return item.children.some(child => checkChildren(child));
                }
                return false;
            };

            return draggedItem && draggedItem.children ? draggedItem.children.some(child => checkChildren(child)) : false;
        };

        if (dragging && isChildOfDragged(dragging, targetNode.id)) {
            return;
        }

        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetNode: BomTreeNode) => {
        if (!canEdit || !dragging) return;

        const draggedId = e.dataTransfer.getData('text/plain');

        if (draggedId === targetNode.id) {
            setDragging(null);
            return;
        }

        // Update locally first for immediate feedback
        const draggedItem = findItemById(bomItems, draggedId);
        const newItems = removeItemFromTree(bomItems, draggedId);
        const updatedItems = draggedItem ? addChildToItem(newItems, targetNode.id, draggedItem) : newItems;
        setBomItems(updatedItems);

        // Expand target to show newly added item
        toggleNode(targetNode.id);

        // Save to backend
        try {
            await router.post(route('production.bom.items.move', {
                bom: bomId,
                item: draggedId
            }), {
                parent_item_id: targetNode.id
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Item movido", {
                        description: "A estrutura da BOM foi atualizada.",
                    });
                    onUpdate?.();
                },
                onError: () => {
                    // Revert on error
                    setBomItems(bomItems);
                    toast.error("Erro", {
                        description: "Não foi possível mover o item.",
                    });
                }
            });
        } catch (error) {
            console.error('Error moving item:', error);
            setBomItems(bomItems);
        }

        setDragging(null);
    };

    // CRUD operations
    const handleEditItem = (item: BomTreeNode) => {
        if (!canEdit) return;

        setEditingItem({
            id: item.id,
            item_id: item.item_id,
            item: item.item,
            quantity: item.quantity,
            unit_of_measure: item.unit_of_measure,
            reference_designators: item.reference_designators,
            bom_notes: item.bom_notes,
            assembly_instructions: item.assembly_instructions || ''
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingItem || !canEdit) return;

        setSaving(true);

        try {
            await router.put(route('production.bom.items.update', {
                bom: bomId,
                item: editingItem.id
            }), {
                quantity: editingItem.quantity,
                unit_of_measure: editingItem.unit_of_measure,
                reference_designators: editingItem.reference_designators,
                bom_notes: editingItem.bom_notes,
                assembly_instructions: editingItem.assembly_instructions
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Item atualizado", {
                        description: "As informações do item foram atualizadas.",
                    });
                    setIsEditDialogOpen(false);
                    setEditingItem(null);
                    onUpdate?.();
                },
                onError: () => {
                    toast.error("Erro", {
                        description: "Não foi possível atualizar o item.",
                    });
                }
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAddItem = (parentId: string | null) => {
        if (!canEdit) return;

        setNewItemParentId(parentId);
        setSelectedItemId(null);
        setItemSearchQuery('');
        setEditingItem({
            quantity: 1,
            unit_of_measure: 'EA',
            reference_designators: '',
            bom_notes: '',
            assembly_instructions: ''
        });
        setIsAddItemDialogOpen(true);
    };

    const handleSaveNewItem = async () => {
        if (!selectedItemId || !editingItem || !canEdit) return;

        setSaving(true);

        try {
            await router.post(route('production.bom.items.add', bomId), {
                bom_version_id: versionId,
                parent_item_id: newItemParentId,
                item_id: selectedItemId,
                quantity: editingItem.quantity,
                unit_of_measure: editingItem.unit_of_measure,
                reference_designators: editingItem.reference_designators,
                bom_notes: editingItem.bom_notes,
                assembly_instructions: editingItem.assembly_instructions
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Item adicionado", {
                        description: "O item foi adicionado à BOM.",
                    });
                    setIsAddItemDialogOpen(false);
                    setEditingItem(null);
                    setNewItemParentId(null);
                    onUpdate?.();
                },
                onError: () => {
                    toast.error("Erro", {
                        description: "Não foi possível adicionar o item.",
                    });
                }
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!canEdit) return;

        if (!confirm('Tem certeza que deseja remover este item e todos os seus sub-itens?')) {
            return;
        }

        try {
            await router.delete(route('production.bom.items.remove', {
                bom: bomId,
                item: id
            }), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Item removido", {
                        description: "O item foi removido da BOM.",
                    });
                    onUpdate?.();
                },
                onError: () => {
                    toast.error("Erro", {
                        description: "Não foi possível remover o item.",
                    });
                }
            });
        } catch (error) {
            console.error('Error removing item:', error);
        }
    };

    const handleExportBOM = () => {
        window.open(route('production.bom.export', bomId), '_blank');
    };

    // Custom node renderer
    const renderBomNode = (node: BomTreeNode, props: NodeRenderProps) => {
        return (
            <div
                className={cn(
                    "w-full p-2 border rounded-lg transition-all",
                    props.isDragging ? 'opacity-50' : '',
                    props.isDragTarget && canEdit ? 'hover:border-blue-500 hover:border-dashed' : '',
                    "hover:bg-muted/50"
                )}
            >
                <div className="flex items-center w-full gap-2">
                    {/* Drag handle */}
                    {canEdit && (
                        <div
                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, node)}
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
                                <HoverCard openDelay={200} closeDelay={100}>
                                    <HoverCardTrigger asChild>
                                        <div>
                                            <ItemImagePreview
                                                primaryImageUrl={node.item.primary_image_thumbnail_url || node.item.primary_image_url}
                                                imageCount={node.item.image ? 1 : 0}
                                                className="w-12 h-12 cursor-pointer"
                                                onClick={(e) => {
                                                    e?.stopPropagation();
                                                    if (node.item.id) {
                                                        router.visit(route('production.items.show', node.item.id));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent
                                        className="w-80 p-0 overflow-hidden"
                                        side="right"
                                        align="start"
                                    >
                                        {node.item.primary_image_url ? (
                                            <div>
                                                <ImageWithBlurEffect
                                                    src={node.item.primary_image_url}
                                                    alt={`${node.item.name} - imagem ampliada`}
                                                    containerClassName="w-full h-80"
                                                />
                                                <div className="p-3 border-t">
                                                    <h4 className="font-medium text-sm select-none">{node.item.item_number}</h4>
                                                    <p className="text-xs text-muted-foreground mt-1 select-none">
                                                        {node.item.name}
                                                    </p>
                                                    {node.quantity && (
                                                        <p className="text-xs text-muted-foreground mt-2 select-none">
                                                            Quantidade: <span className="font-medium">{node.quantity} {node.unit_of_measure}</span>
                                                        </p>
                                                    )}
                                                    {node.item.media && node.item.media.length > 1 && (
                                                        <p className="text-xs text-muted-foreground mt-2 select-none">
                                                            {node.item.media.length} imagens disponíveis
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-80 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                                <span className="select-none">N/A</span>
                                            </div>
                                        )}
                                    </HoverCardContent>
                                </HoverCard>
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
                            {canEdit && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleEditItem(node)}
                                        title="Editar item"
                                    >
                                        <Edit size={14} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleAddItem(node.id)}
                                        title="Adicionar sub-item"
                                    >
                                        <Plus size={14} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleDeleteItem(node.id)}
                                        title="Remover item"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Header columns
    const headerColumns = (
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

    // Empty state
    const emptyState = (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum item na BOM</h3>
            <p className="text-muted-foreground mb-4">
                Adicione o primeiro item para começar a construir a estrutura
            </p>
            {canEdit && (
                <Button size="sm" onClick={() => handleAddItem(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                </Button>
            )}
        </div>
    );

    // Filtered items for add dialog
    const filteredItems = availableItems.filter(item =>
        item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.item_number.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-0 -m-6 lg:-m-8">
            {/* Header */}
            <div className="flex-shrink-0 px-6 lg:px-8 pt-6 lg:pt-8 pb-4">
                <HierarchicalViewHeader
                    title=""
                    subtitle={`${bom?.current_version?.items?.length || 0} itens na versão`}
                    badge={
                        bom?.current_version && (
                            <Badge variant="secondary">
                                v{bom.current_version.version_number}
                            </Badge>
                        )
                    }
                    maxDepth={maxDepth}
                    currentLevel={currentLevel}
                    onLevelChange={expandToLevel}
                    showImages={showImages}
                    onToggleImages={setShowImages}
                    actions={
                        <>
                            <Button variant="outline" size="sm" onClick={handleExportBOM}>
                                <Download className="h-4 w-4 mr-2" />
                                Exportar BOM
                            </Button>
                            {canEdit && (
                                <Button size="sm" variant="outline" onClick={() => setIsCreateItemSheetOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Criar Novo Item
                                </Button>
                            )}
                        </>
                    }
                />
            </div>

            {/* Tree view */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 lg:px-8 pb-6 lg:pb-8">
                <GenericHierarchicalTreeView
                    data={bomItems}
                    renderNode={renderBomNode}
                    headerColumns={headerColumns}
                    emptyState={emptyState}
                    expanded={expanded}
                    onToggleExpand={toggleNode}
                    draggable={canEdit}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    draggingNodeId={dragging}
                />
            </div>

            {/* Dialogs */}
            {/* Add Item Dialog */}
            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Adicionar Item à BOM</DialogTitle>
                        <DialogDescription>
                            Selecione um item e configure suas propriedades
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Item selection */}
                        <div className="space-y-2">
                            <Label>Selecionar Item</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por código ou nome..."
                                    value={itemSearchQuery}
                                    onChange={(e) => setItemSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* Items list */}
                            <div className="border rounded-lg max-h-48 overflow-y-auto">
                                {filteredItems.length > 0 ? (
                                    filteredItems.map(item => (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "p-3 hover:bg-muted/50 cursor-pointer border-b last:border-0",
                                                selectedItemId === item.id && "bg-muted"
                                            )}
                                            onClick={() => {
                                                setSelectedItemId(item.id);
                                                if (editingItem) {
                                                    setEditingItem({
                                                        ...editingItem,
                                                        item: item,
                                                        unit_of_measure: item.unit_of_measure
                                                    });
                                                }
                                            }}
                                        >
                                            <div className="font-medium">{item.item_number}</div>
                                            <div className="text-sm text-muted-foreground">{item.name}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-muted-foreground">
                                        Nenhum item encontrado
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Item configuration */}
                        {selectedItemId && editingItem && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantidade</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="0.0001"
                                            step="0.0001"
                                            value={editingItem.quantity}
                                            onChange={(e) => setEditingItem({
                                                ...editingItem,
                                                quantity: parseFloat(e.target.value) || 1
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="unit">Unidade</Label>
                                        <Select
                                            value={editingItem.unit_of_measure}
                                            onValueChange={(value) => setEditingItem({
                                                ...editingItem,
                                                unit_of_measure: value
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="EA">EA (cada)</SelectItem>
                                                <SelectItem value="KG">KG (quilograma)</SelectItem>
                                                <SelectItem value="M">M (metro)</SelectItem>
                                                <SelectItem value="L">L (litro)</SelectItem>
                                                <SelectItem value="UN">UN (unidade)</SelectItem>
                                                <SelectItem value="CX">CX (caixa)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reference">Designadores de Referência</Label>
                                    <Input
                                        id="reference"
                                        placeholder="Ex: R1, R2, C1-C4"
                                        value={editingItem.reference_designators || ''}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            reference_designators: e.target.value
                                        })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notas da BOM</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Notas específicas para este item na BOM"
                                        value={editingItem.bom_notes || ''}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            bom_notes: e.target.value
                                        })}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAddItemDialogOpen(false);
                                setEditingItem(null);
                                setNewItemParentId(null);
                            }}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveNewItem}
                            disabled={!selectedItemId || saving}
                        >
                            {saving ? "Salvando..." : "Adicionar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Item Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Editar Item</DialogTitle>
                        <DialogDescription>
                            {editingItem?.item?.item_number} - {editingItem?.item?.name}
                        </DialogDescription>
                    </DialogHeader>

                    {editingItem && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-quantity">Quantidade</Label>
                                    <Input
                                        id="edit-quantity"
                                        type="number"
                                        min="0.0001"
                                        step="0.0001"
                                        value={editingItem.quantity}
                                        onChange={(e) => setEditingItem({
                                            ...editingItem,
                                            quantity: parseFloat(e.target.value) || 1
                                        })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-unit">Unidade</Label>
                                    <Select
                                        value={editingItem.unit_of_measure}
                                        onValueChange={(value) => setEditingItem({
                                            ...editingItem,
                                            unit_of_measure: value
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EA">EA (cada)</SelectItem>
                                            <SelectItem value="KG">KG (quilograma)</SelectItem>
                                            <SelectItem value="M">M (metro)</SelectItem>
                                            <SelectItem value="L">L (litro)</SelectItem>
                                            <SelectItem value="UN">UN (unidade)</SelectItem>
                                            <SelectItem value="CX">CX (caixa)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-reference">Designadores de Referência</Label>
                                <Input
                                    id="edit-reference"
                                    placeholder="Ex: R1, R2, C1-C4"
                                    value={editingItem.reference_designators || ''}
                                    onChange={(e) => setEditingItem({
                                        ...editingItem,
                                        reference_designators: e.target.value
                                    })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-notes">Notas da BOM</Label>
                                <Textarea
                                    id="edit-notes"
                                    placeholder="Notas específicas para este item na BOM"
                                    value={editingItem.bom_notes || ''}
                                    onChange={(e) => setEditingItem({
                                        ...editingItem,
                                        bom_notes: e.target.value
                                    })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsEditDialogOpen(false);
                                setEditingItem(null);
                            }}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={saving}
                        >
                            {saving ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Item Sheet */}
            <CreateItemSheet
                open={isCreateItemSheetOpen}
                onOpenChange={setIsCreateItemSheetOpen}
                mode="create"
                categories={categories}
                onSuccess={() => {
                    if (onUpdate) {
                        onUpdate();
                    }
                }}
            />
        </div>
    );
}
