import React, { useState, useCallback, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  ChevronRight, 
  ChevronDown, 
  Edit, 
  GripVertical,
  Package,
  Search,
  X
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
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { BomItem, Item, BomVersion } from '@/types/production';

interface BomConfigurationProps {
  bomId: number;
  versionId: number;
  bomItems: (BomItem & { item: Item; children?: any[] })[];
  availableItems: Item[];
  canEdit: boolean;
  onUpdate?: () => void;
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
  onUpdate
}: BomConfigurationProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Transform flat BOM items to hierarchical structure
  useEffect(() => {
    const buildHierarchy = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter(item => item.parent_item_id === parentId)
        .map(item => ({
          ...item,
          id: item.id.toString(),
          children: buildHierarchy(items, item.id.toString())
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

  // Toggle expand/collapse
  const toggleExpand = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
          toast({
            title: "Item movido",
            description: "A estrutura da BOM foi atualizada.",
          });
          onUpdate?.();
        },
        onError: () => {
          // Revert on error
          setItems(items);
          toast({
            title: "Erro",
            description: "Não foi possível mover o item.",
            variant: "destructive",
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
          toast({
            title: "Item atualizado",
            description: "As informações do item foram atualizadas.",
          });
          setIsEditDialogOpen(false);
          setEditingItem(null);
          onUpdate?.();
        },
        onError: () => {
          toast({
            title: "Erro",
            description: "Não foi possível atualizar o item.",
            variant: "destructive",
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
          toast({
            title: "Item adicionado",
            description: "O item foi adicionado à BOM.",
          });
          setIsAddItemDialogOpen(false);
          setEditingItem(null);
          setNewItemParentId(null);
          onUpdate?.();
        },
        onError: () => {
          toast({
            title: "Erro",
            description: "Não foi possível adicionar o item.",
            variant: "destructive",
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
          toast({
            title: "Item removido",
            description: "O item foi removido da BOM.",
          });
          onUpdate?.();
        },
        onError: () => {
          toast({
            title: "Erro",
            description: "Não foi possível remover o item.",
            variant: "destructive",
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

  // Tree item component
  const TreeItem: React.FC<{
    node: any;
    depth?: number;
    isLast?: boolean;
    parentConnectorLines?: boolean[];
  }> = ({ node, depth = 0, isLast = true, parentConnectorLines = [] }) => {
    const isExpanded = expanded[node.id];
    const hasChildren = node.children && node.children.length > 0;
    
    const childConnectorLines = [...parentConnectorLines];
    if (depth > 0) {
      childConnectorLines.push(!isLast);
    }
    
    return (
      <div className="w-full">
        <div className="flex">
          {/* Connector lines */}
          {parentConnectorLines.map((showLine, i) => (
            <div key={`connector-${i}`} className="w-6 relative">
              {showLine && <div className="absolute h-full w-0 border-l-2 border-gray-300 left-3 top-0"></div>}
            </div>
          ))}
          
          {depth > 0 && (
            <div className="w-6 relative">
              <div className="absolute h-1/2 w-0 border-l-2 border-gray-300 left-3 top-0"></div>
              <div className="absolute w-3 border-t-2 border-gray-300 left-3 top-1/2"></div>
              {!isLast && <div className="absolute h-1/2 w-0 border-l-2 border-gray-300 left-3 top-1/2"></div>}
            </div>
          )}
          
          {/* Item content */}
          <div 
            className={cn(
              "flex-grow p-3 my-1 border rounded-lg transition-all",
              dragging === node.id ? 'opacity-50' : '',
              dragging && dragging !== node.id && canEdit ? 'hover:border-blue-500 hover:border-dashed' : '',
              "hover:bg-muted/50"
            )}
            onDragOver={(e) => handleDragOver(e, node.id)}
            onDrop={(e) => handleDrop(e, node.id)}
          >
            <div className="flex items-center w-full gap-2">
              {/* Drag handle */}
              {canEdit && (
                <div 
                  className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, node.id)}
                  title="Arrastar para reposicionar"
                >
                  <GripVertical size={16} />
                </div>
              )}
              
              {/* Expand/collapse button */}
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleExpand(node.id)}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </Button>
              )}
              {!hasChildren && <div className="w-6"></div>}
              
              {/* Item details */}
              <div className="flex-grow grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3 font-medium">
                  <div>{node.item.item_number}</div>
                  {node.reference_designators && (
                    <div className="text-xs text-muted-foreground">Ref: {node.reference_designators}</div>
                  )}
                </div>
                <div className="col-span-5 text-muted-foreground">{node.item.name}</div>
                <div className="col-span-2 text-center">
                  <Badge variant="secondary">
                    {node.quantity} {node.unit_of_measure}
                  </Badge>
                </div>
                <div className="col-span-2 flex justify-end gap-1">
                  {canEdit && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditItem(node)}
                        title="Editar item"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddItem(node.id)}
                        title="Adicionar sub-item"
                      >
                        <Plus size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(node.id)}
                        title="Remover item"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Render children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child: any, index: number) => (
              <TreeItem 
                key={child.id} 
                node={child} 
                depth={depth + 1} 
                isLast={index === node.children.length - 1}
                parentConnectorLines={childConnectorLines}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Configuração da BOM</h3>
          <p className="text-sm text-muted-foreground">
            {canEdit ? 'Arraste e solte para reorganizar a estrutura' : 'Visualização da estrutura da BOM'}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={() => handleAddItem(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
          )}
          <Button variant="outline" onClick={handleExportBOM}>
            <Download className="h-4 w-4 mr-2" />
            Exportar BOM
          </Button>
        </div>
      </div>
      
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="bg-muted/50 p-3 rounded-lg grid grid-cols-12 gap-4 font-semibold text-sm">
          <div className="col-span-3">Código do Item</div>
          <div className="col-span-5">Descrição</div>
          <div className="col-span-2 text-center">Quantidade</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
      </div>
      
      {/* Tree view */}
      <div className="flex-grow overflow-auto px-4 pb-4">
        {items.length > 0 ? (
          <div>
            {items.map((item, index) => (
              <TreeItem 
                key={item.id} 
                node={item} 
                isLast={index === items.length - 1}
                parentConnectorLines={[]}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum item na BOM</h3>
            <p className="text-muted-foreground mb-4">
              Adicione o primeiro item para começar a construir a estrutura
            </p>
            {canEdit && (
              <Button onClick={() => handleAddItem(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            )}
          </div>
        )}
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
    </div>
  );
}