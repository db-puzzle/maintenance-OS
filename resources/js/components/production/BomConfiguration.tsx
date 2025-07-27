import React, { useState, useCallback, useEffect } from 'react';
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
import { BomItem, Item, BomVersion } from '@/types/production';
import CreateItemSheet from '@/components/CreateItemSheet';
import BomTreeView from './BomTreeView';

interface BomConfigurationProps {
  bomId: number;
  versionId: number;
  bomItems: (BomItem & { item: Item; children?: any[] })[];
  availableItems: Item[];
  canEdit: boolean;
  onUpdate?: () => void;
  bom?: {
    name: string;
    bom_number: string;
    current_version?: {
      version_number: number;
      items?: any[];
    };
    versions?: any[];
  };
}

interface EditingItem {
  id?: string;
  item_id?: number;
  item?: Item;
  quantity: number;
  unit_of_measure: string;
  reference_designators?: string;
  bom_notes?: any;
  assembly_instructions?: any;
}

export default function BomConfiguration({
  bomId,
  versionId,
  bomItems: initialBomItems,
  availableItems,
  canEdit,
  onUpdate,
  bom
}: BomConfigurationProps) {
  const [items, setItems] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateItemSheetOpen, setIsCreateItemSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Transform flat BOM items to hierarchical structure
  useEffect(() => {
    const buildHierarchy = (items: any[], parentId: string | number | null = null): any[] => {
      return items
        .filter(item => {
          const itemParentId = item.parent_item_id;
          // Convert both to strings for comparison if they exist
          const itemParentIdStr = itemParentId ? String(itemParentId) : null;
          const parentIdStr = parentId ? String(parentId) : null;
          const matches = itemParentIdStr === parentIdStr;
          return matches;
        })
        .map(item => ({
          ...item,
          id: item.id.toString(),
          children: buildHierarchy(items, item.id)  // Pass the numeric ID, not string
        }));
    };

    const hierarchicalItems = buildHierarchy(initialBomItems);
    setItems(hierarchicalItems);

    // Auto-expand first level
    const initialExpanded: Record<string, boolean> = {};
    hierarchicalItems.forEach(item => {
      initialExpanded[item.id] = true;
    });
    setExpanded(initialExpanded);
  }, [initialBomItems]);

  // Filter available items based on search
  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    item.item_number.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  // Helper functions
  const findItemById = (items: any[], id: string): any => {
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

  const updateItemsTree = (items: any[], id: string, updateFn: (item: any) => any): any[] => {
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

  const removeItemFromTree = (items: any[], id: string): any[] => {
    return items.reduce((acc, item) => {
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

  const addChildToItem = (items: any[], parentId: string, newChild: any): any[] => {
    return items.map(item => {
      if (item.id === parentId) {
        return {
          ...item,
          children: [...item.children, newChild]
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
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canEdit) return;

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

    if (!canEdit || dragging === targetId) return;

    // Check for circular reference
    const isChildOfDragged = (draggedId: string, targetId: string): boolean => {
      const draggedItem = findItemById(items, draggedId);

      const checkChildren = (item: any): boolean => {
        if (item.id === targetId) return true;
        if (item.children && item.children.length > 0) {
          return item.children.some((child: any) => checkChildren(child));
        }
        return false;
      };

      return draggedItem ? draggedItem.children.some((child: any) => checkChildren(child)) : false;
    };

    if (dragging && isChildOfDragged(dragging, targetId)) {
      return;
    }

    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!canEdit || !dragging) return;

    const draggedId = e.dataTransfer.getData('text/plain');

    if (draggedId === targetId) {
      setDragging(null);
      return;
    }

    // Update locally first for immediate feedback
    const draggedItem = findItemById(items, draggedId);
    const newItems = removeItemFromTree(items, draggedId);
    const updatedItems = addChildToItem(newItems, targetId, draggedItem);
    setItems(updatedItems);

    // Expand target to show newly added item
    setExpanded(prev => ({
      ...prev,
      [targetId]: true
    }));

    // Save to backend
    try {
      await router.post(route('production.bom.items.move', {
        bom: bomId,
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
          setItems(items);
          toast.error("Erro", {
            description: "Não foi possível mover o item.",
          });
        }
      });
    } catch (error) {
      setItems(items);
    }

    setDragging(null);
  };

  // CRUD operations
  const handleEditItem = (item: any) => {
    if (!canEdit) return;

    setEditingItem({
      id: item.id,
      item_id: item.item_id,
      item: item.item,
      quantity: item.quantity,
      unit_of_measure: item.unit_of_measure,
      reference_designators: item.reference_designators,
      bom_notes: item.bom_notes,
      assembly_instructions: item.assembly_instructions
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
      bom_notes: {},
      assembly_instructions: {}
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
      console.error(error);
    }
  };

  const handleExportBOM = () => {
    window.open(route('production.bom.export', bomId), '_blank');
  };



  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <div className="flex flex-wrap items-baseline gap-3">
          <div className="flex flex-wrap items-baseline">
            <p className="mt-1 ml-2 truncate text-sm text-gray-500">
              {bom?.current_version?.items?.length || 0} itens na versão
            </p>
            <h3 className="mt-2 ml-2 text-base font-semibold text-gray-900">
              {bom?.name || 'BOM'}
            </h3>
          </div>
          {bom?.current_version && (
            <Badge variant="secondary">
              v{bom.current_version.version_number}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
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

      {/* Tree view */}
      <div className="flex-grow overflow-auto px-4 pb-4">
        <BomTreeView
          items={items}
          canEdit={canEdit}
          onEditItem={handleEditItem}
          onAddItem={handleAddItem}
          onDeleteItem={handleDeleteItem}
          draggable={true}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          draggingId={dragging}
        />
      </div>

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
                    value={editingItem.bom_notes?.text || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      bom_notes: { text: e.target.value }
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
                  value={editingItem.bom_notes?.text || ''}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    bom_notes: { text: e.target.value }
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
        onSuccess={() => {
          // The backend will stay on the same page when it detects an AJAX request
          // The BaseEntitySheet handles closing and showing success message
          // We just need to refresh the data
          if (onUpdate) {
            onUpdate();
          }
        }}
      />
    </div>
  );
}