import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Save } from 'lucide-react';
import React from 'react';

interface BOMItem {
    id: string;
    name: string;
    description: string;
    quantity: number;
    unit: string;
    children: BOMItem[];
}

interface ItemModalProps {
    editingItem: BOMItem;
    isNewItem: boolean;
    onCancel: () => void;
    onSave: () => void;
    setEditingItem: React.Dispatch<React.SetStateAction<BOMItem | null>>;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const ItemModal: React.FC<ItemModalProps> = ({ editingItem, isNewItem, onCancel, onSave, setEditingItem, isOpen, onOpenChange }) => {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md">
                <div className="px-8">
                    <SheetHeader className="mb-4">
                        <SheetTitle>{isNewItem ? 'Adicionar Novo Item' : 'Editar Item'}</SheetTitle>
                        <SheetDescription>
                            {isNewItem ? 'Adicione um novo item à estrutura BOM' : 'Edite as informações do item selecionado'}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={editingItem.name}
                                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Input
                                    id="description"
                                    type="text"
                                    value={editingItem.description}
                                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Quantidade</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min="1"
                                        value={editingItem.quantity}
                                        onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="unit">Unidade</Label>
                                    <Select value={editingItem.unit} onValueChange={(value) => setEditingItem({ ...editingItem, unit: value })}>
                                        <SelectTrigger id="unit">
                                            <SelectValue placeholder="Selecione a unidade" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ea">ea (cada)</SelectItem>
                                            <SelectItem value="kg">kg (quilograma)</SelectItem>
                                            <SelectItem value="m">m (metro)</SelectItem>
                                            <SelectItem value="L">L (litro)</SelectItem>
                                            <SelectItem value="pcs">pçs (peças)</SelectItem>
                                            <SelectItem value="set">conjunto</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={onCancel}>
                            Cancelar
                        </Button>

                        <Button onClick={onSave}>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default ItemModal;
