import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Plus,
    Download,
    Search,

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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BomItem, Item, ItemCategory, ManufacturingOrder, RouteTemplate } from '@/types/production';
import { CreateItemSheet } from '@/components/CreateItemSheet';
import { BomTreeView } from './BomTreeView';
import { ManufacturingOrderTreeView } from './ManufacturingOrderTreeView';

import { Image } from 'lucide-react';

type ConfigurationType = 'bom' | 'manufacturing-order';

interface BaseHierarchicalConfigurationProps {
    type: ConfigurationType;
    canEdit?: boolean;
    onUpdate?: () => void;
    className?: string;
}

interface BomConfigurationProps extends BaseHierarchicalConfigurationProps {
    type: 'bom';
    bomId: number;
    versionId: number;
    bomItems: (BomItem & { item: Item; children?: (BomItem & { item: Item })[] })[];
    availableItems: Item[];
    categories?: ItemCategory[];
    bom?: {
        name: string;
        bom_number: string;
        current_version?: {
            version_number: number;
            items?: BomItem[];
        };
        versions?: Array<{ version_number: number; id: number }>;
    };
}

interface ManufacturingOrderConfigurationProps extends BaseHierarchicalConfigurationProps {
    type: 'manufacturing-order';
    orders: ManufacturingOrder[];
    showActions?: boolean;
    onOrderClick?: (order: ManufacturingOrder) => void;
    routeTemplates?: RouteTemplate[];
    canManageRoutes?: boolean;
}

type HierarchicalConfigurationProps = BomConfigurationProps | ManufacturingOrderConfigurationProps;

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

type TreeBomItem = BomItem & {
    item: Item;
    id: string;
    children?: TreeBomItem[];
};

export default function HierarchicalConfiguration(props: HierarchicalConfigurationProps) {
    const { type, canEdit = false, onUpdate, className } = props;

    // BOM-specific state
    const [bomItems, setBomItems] = useState<TreeBomItem[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [dragging, setDragging] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
    const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCreateItemSheetOpen, setIsCreateItemSheetOpen] = useState(false);
    const [maxDepth, setMaxDepth] = useState<number>(0);
    const [currentLevel, setCurrentLevel] = useState<number>(1);
    const [saving, setSaving] = useState(false);
    const [showImages, setShowImages] = useState(false);

    // Calculate the maximum depth of the BOM tree
    const calculateMaxDepth = (items: TreeBomItem[], currentDepth: number = 0): number => {
        if (!items || items.length === 0) return currentDepth;

        let maxChildDepth = currentDepth;
        items.forEach(item => {
            if (item.children && item.children.length > 0) {
                const childDepth = calculateMaxDepth(item.children, currentDepth + 1);
                maxChildDepth = Math.max(maxChildDepth, childDepth);
            }
        });

        return maxChildDepth;
    };

    // Transform flat BOM items to hierarchical structure
    useEffect(() => {
        if (type === 'bom') {
            const bomProps = props as BomConfigurationProps;
            const buildHierarchy = (items: (BomItem & { item: Item })[], parentId: string | number | null = null): TreeBomItem[] => {
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
                    } as TreeBomItem));
            };

            const hierarchicalItems = buildHierarchy(bomProps.bomItems);
            setBomItems(hierarchicalItems);

            // Calculate max depth
            const depth = calculateMaxDepth(hierarchicalItems);
            setMaxDepth(depth);

            // Auto-expand first level
            const initialExpanded: Record<string, boolean> = {};
            hierarchicalItems.forEach(item => {
                initialExpanded[item.id] = true;
            });
            setExpanded(initialExpanded);
        }
    }, [type, props]);

    // Helper functions for BOM
    const findItemById = (items: TreeBomItem[], id: string): TreeBomItem | null => {
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

    const updateItemsTree = (items: TreeBomItem[], id: string, updateFn: (item: TreeBomItem) => TreeBomItem): TreeBomItem[] => {
        return items.map(item => {
            if (item.id === id) {
                return updateFn(item);
            }
            if (item.children && item.children.length > 0) {
                return {
                    ...item,
                    children: updateItemsTree(item.children, id, updateFn)
                };
            }
            return item;
        });
    };

    const removeItemFromTree = (items: TreeBomItem[], id: string): TreeBomItem[] => {
        return items.reduce<TreeBomItem[]>((acc, item) => {
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

    // Expand/collapse all items to a specific level
    const expandToLevel = (level: number) => {
        const newExpanded: Record<string, boolean> = {};

        const processItems = (items: TreeBomItem[], currentLevel: number = 0) => {
            items.forEach(item => {
                // Expand if current level is less than target level
                newExpanded[item.id] = currentLevel < level;

                if (item.children && item.children.length > 0) {
                    processItems(item.children, currentLevel + 1);
                }
            });
        };

        processItems(bomItems);

        // Add a slight delay for smoother visual feedback
        setTimeout(() => {
            setExpanded(newExpanded);
            setCurrentLevel(level);
        }, 50);
    };

    // Toggle individual item expansion
    const toggleItemExpanded = (id: string) => {
        setExpanded(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const addChildToItem = (items: TreeBomItem[], parentId: string, newChild: TreeBomItem): TreeBomItem[] => {
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

    // Drag and drop handlers (BOM only)
    const handleDragStart = (e: React.DragEvent, id: string) => {
        if (!canEdit || type !== 'bom') return;

        e.stopPropagation();

        const dragGhost = document.createElement('div');
        dragGhost.style.position = 'absolute';
        dragGhost.style.top = '-1000px';
        document.body.appendChild(dragGhost);
        e.dataTransfer.setDragImage(dragGhost, 0, 0);

        setDragging(id);
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';

        setTimeout(() => {
            document.body.removeChild(dragGhost);
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();

        if (!canEdit || type !== 'bom' || dragging === targetId) return;

        // Check for circular reference
        const isChildOfDragged = (draggedId: string, targetId: string): boolean => {
            const draggedItem = findItemById(bomItems, draggedId);

            const checkChildren = (item: TreeBomItem): boolean => {
                if (item.id === targetId) return true;
                if (item.children && item.children.length > 0) {
                    return item.children.some((child) => checkChildren(child as TreeBomItem));
                }
                return false;
            };

            return draggedItem && draggedItem.children ? draggedItem.children.some((child) => checkChildren(child as TreeBomItem)) : false;
        };

        if (dragging && isChildOfDragged(dragging, targetId)) {
            return;
        }

        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();

        if (!canEdit || type !== 'bom' || !dragging) return;

        const bomProps = props as BomConfigurationProps;
        const draggedId = e.dataTransfer.getData('text/plain');

        if (draggedId === targetId) {
            setDragging(null);
            return;
        }

        // Update locally first for immediate feedback
        const draggedItem = findItemById(bomItems, draggedId);
        const newItems = removeItemFromTree(bomItems, draggedId);
        const updatedItems = draggedItem ? addChildToItem(newItems, targetId, draggedItem) : newItems;
        setBomItems(updatedItems);

        // Expand target to show newly added item
        setExpanded(prev => ({
            ...prev,
            [targetId]: true
        }));

        // Save to backend
        try {
            await router.post(route('production.bom.items.move', {
                bom: bomProps.bomId,
                item: draggedId
            }), {
                parent_item_id: targetId
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

    // CRUD operations (BOM only)
    const handleEditItem = (item: TreeBomItem) => {
        if (!canEdit || type !== 'bom') return;

        setEditingItem({
            id: item.id,
            item_id: item.item_id,
            item: item.item,
            quantity: item.quantity,
            unit_of_measure: item.unit_of_measure,
            reference_designators: item.reference_designators,
            bom_notes: item.bom_notes,
            assembly_instructions: (item as any).assembly_instructions || ''
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingItem || !canEdit || type !== 'bom') return;

        const bomProps = props as BomConfigurationProps;
        setSaving(true);

        try {
            await router.put(route('production.bom.items.update', {
                bom: bomProps.bomId,
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
        if (!canEdit || type !== 'bom') return;

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
        if (!selectedItemId || !editingItem || !canEdit || type !== 'bom') return;

        const bomProps = props as BomConfigurationProps;
        setSaving(true);

        try {
            await router.post(route('production.bom.items.add', bomProps.bomId), {
                bom_version_id: bomProps.versionId,
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
        if (!canEdit || type !== 'bom') return;

        if (!confirm('Tem certeza que deseja remover este item e todos os seus sub-itens?')) {
            return;
        }

        const bomProps = props as BomConfigurationProps;

        try {
            await router.delete(route('production.bom.items.remove', {
                bom: bomProps.bomId,
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
        if (type === 'bom') {
            const bomProps = props as BomConfigurationProps;
            window.open(route('production.bom.export', bomProps.bomId), '_blank');
        }
    };

    // Render header based on type
    const renderHeader = () => {
        if (type === 'bom') {
            const bomProps = props as BomConfigurationProps;
            return (
                <div className="p-4 flex justify-between items-center">
                    <div className="flex flex-wrap items-baseline gap-3">
                        <div className="flex flex-wrap items-baseline">
                            <p className="mt-1 ml-2 truncate text-sm text-gray-500">
                                {bomProps.bom?.current_version?.items?.length || 0} itens na versão
                            </p>
                            <h3 className="mt-2 ml-2 text-base font-semibold text-gray-900">
                                {bomProps.bom?.name || 'BOM'}
                            </h3>
                        </div>
                        {bomProps.bom?.current_version && (
                            <Badge variant="secondary">
                                v{bomProps.bom.current_version.version_number}
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {/* Level controls */}
                        {maxDepth > 0 && (
                            <div className="flex items-center gap-1 border rounded-md px-2">
                                <span className="text-sm text-muted-foreground mr-1">Níveis:</span>
                                {Array.from({ length: maxDepth }, (_, i) => i + 1).map((level) => {
                                    const isActive = level <= currentLevel;
                                    return (
                                        <Button
                                            key={level}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => expandToLevel(level)}
                                            className={`h-7 w-7 p-0 text-xs border transition-colors ${isActive
                                                ? 'bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100 hover:border-blue-400'
                                                : 'border-transparent hover:bg-blue-50/50 hover:text-blue-500 hover:border-blue-200'
                                                }`}
                                            title={`Expandir até nível ${level}`}
                                        >
                                            {level}
                                        </Button>
                                    );
                                })}
                            </div>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowImages(!showImages)}
                            className={showImages ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : ''}
                        >
                            <Image className="h-4 w-4 mr-2" />
                            {showImages ? 'Ocultar Imagens' : 'Mostrar Imagens'}
                        </Button>
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
                    </div>
                </div>
            );
        }

        if (type === 'manufacturing-order') {
            return (
                <div className="p-2">

                </div>
            );
        }

        return null;
    };

    // Render tree view based on type
    const renderTreeView = () => {
        if (type === 'bom') {
            const bomProps = props as BomConfigurationProps;
            return (
                <BomTreeView
                    items={bomItems}
                    canEdit={canEdit}
                    onEditItem={(item) => handleEditItem(item as unknown as TreeBomItem)}
                    onAddItem={handleAddItem}
                    onDeleteItem={handleDeleteItem}
                    draggable={canEdit}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    draggingId={dragging}
                    showImages={showImages}
                    expanded={expanded}
                    onToggleExpand={toggleItemExpanded}
                />
            );
        }

        if (type === 'manufacturing-order') {
            const moProps = props as ManufacturingOrderConfigurationProps;

            return (
                <ManufacturingOrderTreeView
                    orders={moProps.orders}
                    showActions={moProps.showActions ?? true}
                    onOrderClick={moProps.onOrderClick}
                    routeTemplates={moProps.routeTemplates}
                    canManageRoutes={moProps.canManageRoutes}
                />
            );
        }

        return null;
    };

    // Render dialogs (BOM only)
    const renderDialogs = () => {
        if (type !== 'bom') return null;

        const bomProps = props as BomConfigurationProps;
        const filteredItems = bomProps.availableItems.filter(item =>
            item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
            item.item_number.toLowerCase().includes(itemSearchQuery.toLowerCase())
        );

        return (
            <>
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
                    categories={type === 'bom' ? (props as BomConfigurationProps).categories : undefined}
                    onSuccess={() => {
                        if (onUpdate) {
                            onUpdate();
                        }
                    }}
                />
            </>
        );
    };

    return (
        <div className={cn("w-full h-full flex flex-col", className)}>
            {renderHeader()}

            {/* Tree view */}
            <div className="flex-grow overflow-auto px-4 pb-4">
                {renderTreeView()}
            </div>

            {/* Dialogs */}
            {renderDialogs()}
        </div>
    );
} 