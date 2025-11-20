import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Manufacturer } from '@/types/asset-hierarchy';

interface ManufacturerSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    manufacturers: Manufacturer[];
    selectedManufacturerId?: string;
    onSelectManufacturer: (manufacturerId: string | undefined) => void;
}

/**
 * Dialog for searching and selecting a manufacturer to filter external steps.
 * Similar to WorkCellSearchDialog but for manufacturers.
 */
export function ManufacturerSearchDialog({
    open,
    onOpenChange,
    manufacturers,
    selectedManufacturerId,
    onSelectManufacturer,
}: ManufacturerSearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | undefined>(selectedManufacturerId);

    // Reset selected ID when dialog opens with a new selection
    useEffect(() => {
        if (open) {
            setSelectedId(selectedManufacturerId);
        }
    }, [open, selectedManufacturerId]);

    // Convert manufacturer IDs to strings for consistency
    const normalizedManufacturers = useMemo(() => {
        return manufacturers.map(m => ({
            ...m,
            id: m.id.toString(),
        }));
    }, [manufacturers]);

    // Filter manufacturers based on search query
    const filteredManufacturers = useMemo(() => {
        if (!searchQuery.trim()) {
            return normalizedManufacturers;
        }

        const query = searchQuery.toLowerCase();
        return normalizedManufacturers.filter(manufacturer => {
            return (
                (manufacturer.name?.toLowerCase() || '').includes(query) ||
                (manufacturer.email?.toLowerCase() || '').includes(query) ||
                (manufacturer.phone?.toLowerCase() || '').includes(query)
            );
        });
    }, [normalizedManufacturers, searchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onOpenChange(false);
            setSearchQuery('');
            setSelectedId(selectedManufacturerId);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle>Selecionar Fabricante</DialogTitle>
                    <DialogDescription>
                        Busque e selecione um fabricante para filtrar as etapas externas
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* All Manufacturers Button */}
                    <button
                        onClick={() => {
                            onSelectManufacturer(undefined);
                            onOpenChange(false);
                            setSearchQuery('');
                        }}
                        className={cn(
                            "w-full rounded-lg border border-dashed p-3 text-left transition-colors hover:bg-accent",
                            selectedManufacturerId === undefined && "border-primary bg-accent"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-primary" />
                            <div>
                                <span className="font-medium">Todos os Fabricantes</span>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Mostrar etapas de todos os fabricantes
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, email ou telefone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            autoFocus
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    {/* Results */}
                    <ScrollArea className="h-[320px] rounded-md border">
                        <div className="p-2">
                            {filteredManufacturers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Search className="mb-2 h-8 w-8" />
                                    <p className="text-sm">Nenhum fabricante encontrado</p>
                                    <p className="text-xs">Tente usar palavras-chave diferentes</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredManufacturers.map((manufacturer) => {
                                        return (
                                            <button
                                                key={manufacturer.id}
                                                onClick={() => {
                                                    onSelectManufacturer(manufacturer.id);
                                                    onOpenChange(false);
                                                    setSearchQuery('');
                                                }}
                                                className={cn(
                                                    "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                                                    selectedId === manufacturer.id && "border-primary bg-accent"
                                                )}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Factory className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">{manufacturer.name}</span>
                                                        </div>
                                                    </div>

                                                    {(manufacturer.email || manufacturer.phone) && (
                                                        <div className="space-y-1">
                                                            {manufacturer.email && (
                                                                <p className="text-sm text-muted-foreground">
                                                                    {manufacturer.email}
                                                                </p>
                                                            )}
                                                            {manufacturer.phone && (
                                                                <p className="text-sm text-muted-foreground">
                                                                    {manufacturer.phone}
                                                                </p>
                                                            )}
                                                        </div>
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
                    <div className="flex justify-end">
                        <p className="text-sm text-muted-foreground">
                            {filteredManufacturers.length} de {normalizedManufacturers.length} fabricantes
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

