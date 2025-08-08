import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
interface Part {
    id: number;
    part_number: string;
    name: string;
    description?: string;
    unit_cost: number;
    available_quantity: number;
    manufacturer?: { name: string };
    category?: string;
    status?: 'active' | 'inactive' | 'discontinued';
}
interface PartSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parts: Part[];
    onSelectPart: (part: Part) => void;
    selectedParts?: number[];
}
export function PartSearchDialog({
    open,
    onOpenChange,
    parts,
    onSelectPart,
    selectedParts = [],
}: PartSearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    // Filter parts based on search query
    const filteredParts = useMemo(() => {
        if (!searchQuery.trim()) {
            return parts;
        }
        const query = searchQuery.toLowerCase();
        return parts.filter(part => {
            return (
                (part.part_number?.toLowerCase() || '').includes(query) ||
                (part.name?.toLowerCase() || '').includes(query) ||
                (part.description?.toLowerCase() || '').includes(query) ||
                (part.manufacturer?.name?.toLowerCase() || '').includes(query)
            );
        });
    }, [parts, searchQuery]);
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };
    const handleSelect = () => {
        if (selectedId !== null) {
            const selectedPart = parts.find(p => p.id === selectedId);
            if (selectedPart) {
                onSelectPart(selectedPart);
                onOpenChange(false);
                setSearchQuery('');
                setSelectedId(null);
            }
        }
    };
    const handleCancel = () => {
        onOpenChange(false);
        setSearchQuery('');
        setSelectedId(null);
    };
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };
    const getAvailabilityColor = (quantity: number) => {
        if (quantity === 0) return 'text-red-600';
        if (quantity < 10) return 'text-yellow-600';
        return 'text-green-600';
    };
    const getAvailabilityText = (quantity: number) => {
        if (quantity === 0) return 'Sem estoque';
        if (quantity < 10) return `Apenas ${quantity} disponível`;
        return `${quantity} disponível`;
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle>Selecionar Peça</DialogTitle>
                    <DialogDescription>
                        Busque e selecione uma peça para adicionar ao planejamento
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por número, nome ou fabricante..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            autoFocus
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    {/* Results */}
                    <ScrollArea className="h-[400px] rounded-md border">
                        <div className="p-2">
                            {filteredParts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Package className="mb-2 h-8 w-8" />
                                    <p className="text-sm">Nenhuma peça encontrada</p>
                                    <p className="text-xs">Tente usar palavras-chave diferentes</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredParts.map((part) => {
                                        const isAlreadyAdded = selectedParts.includes(part.id);
                                        return (
                                            <button
                                                key={part.id}
                                                onClick={() => !isAlreadyAdded && setSelectedId(part.id)}
                                                onDoubleClick={() => !isAlreadyAdded && handleSelect()}
                                                disabled={isAlreadyAdded}
                                                className={cn(
                                                    "w-full rounded-lg border p-3 text-left transition-colors",
                                                    isAlreadyAdded
                                                        ? "cursor-not-allowed opacity-50"
                                                        : "hover:bg-accent",
                                                    selectedId === part.id && !isAlreadyAdded && "border-primary bg-accent"
                                                )}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{part.part_number}</span>
                                                                {isAlreadyAdded && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        Já adicionada
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">{part.name}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium">{formatCurrency(part.unit_cost)}</p>
                                                            <p className={cn("text-xs", getAvailabilityColor(part.available_quantity))}>
                                                                {getAvailabilityText(part.available_quantity)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {/* Additional info */}
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        {part.manufacturer && (
                                                            <span>Fabricante: {part.manufacturer.name}</span>
                                                        )}
                                                        {part.category && (
                                                            <span>Categoria: {part.category}</span>
                                                        )}
                                                    </div>
                                                    {part.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            {part.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    {/* Footer */}
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            {filteredParts.length} de {parts.length} peças
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSelect}
                                disabled={selectedId === null || selectedParts.includes(selectedId)}
                            >
                                Adicionar Peça
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}