import React, { useState, useEffect, useMemo } from 'react';
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
import { Search, MapPin, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
interface Asset {
    id: number;
    tag: string;
    name: string;
    plant_id: number;
    area_id: number;
    sector_id?: number;
    plant?: { name: string };
    area?: { name: string };
    sector?: { name: string };
    status?: 'operational' | 'maintenance' | 'offline';
    last_maintenance_at?: string;
    pending_work_orders_count?: number;
}
interface AssetSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assets: Asset[];
    plants: Array<{ id: number; name: string }>;
    areas: Array<{ id: number; name: string; plant_id: number }>;
    sectors: Array<{ id: number; name: string; area_id: number }>;
    selectedAssetId?: string;
    onSelectAsset: (assetId: string) => void;
}
export function AssetSearchDialog({
    open,
    onOpenChange,
    assets,
    plants,
    areas,
    sectors,
    selectedAssetId,
    onSelectAsset,
}: AssetSearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string>(selectedAssetId || '');
    // Reset selected ID when dialog opens with a new selection
    useEffect(() => {
        if (open && selectedAssetId) {
            setSelectedId(selectedAssetId);
        }
    }, [open, selectedAssetId]);
    // Build complete asset data with location names
    const enrichedAssets = useMemo(() => {
        if (!assets || !Array.isArray(assets)) {
            return [];
        }
        return assets.filter(asset => asset && typeof asset.id !== 'undefined').map(asset => {
            const plant = plants?.find(p => p.id === asset.plant_id);
            const area = areas?.find(a => a.id === asset.area_id);
            const sector = asset.sector_id ? sectors?.find(s => s.id === asset.sector_id) : null;
            const locationParts = [
                plant?.name,
                area?.name,
                sector?.name
            ].filter(Boolean);
            return {
                ...asset,
                tag: asset.tag || 'N/A',
                name: asset.name || 'Nome não definido',
                plant,
                area,
                sector,
                locationPath: locationParts.length > 0 ? locationParts.join(' > ') : 'Localização não definida'
            };
        });
    }, [assets, plants, areas, sectors]);
    // Filter assets based on search query
    const filteredAssets = useMemo(() => {
        if (!searchQuery.trim()) {
            return enrichedAssets;
        }
        const query = searchQuery.toLowerCase();
        return enrichedAssets.filter(asset => {
            return (
                (asset.tag?.toLowerCase() || '').includes(query) ||
                (asset.name?.toLowerCase() || '').includes(query) ||
                (asset.locationPath?.toLowerCase() || '').includes(query)
            );
        });
    }, [enrichedAssets, searchQuery]);
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };
    const handleSelect = () => {
        if (selectedId) {
            onSelectAsset(selectedId);
            onOpenChange(false);
            setSearchQuery('');
        }
    };
    const handleCancel = () => {
        onOpenChange(false);
        setSearchQuery('');
        setSelectedId(selectedAssetId || '');
    };
    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'operational':
                return 'bg-green-500';
            case 'maintenance':
                return 'bg-yellow-500';
            case 'offline':
                return 'bg-red-500';
            default:
                return 'bg-gray-400';
        }
    };
    const getStatusLabel = (status?: string) => {
        switch (status) {
            case 'operational':
                return 'Operacional';
            case 'maintenance':
                return 'Em Manutenção';
            case 'offline':
                return 'Offline';
            default:
                return 'Desconhecido';
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle>Selecionar Ativo</DialogTitle>
                    <DialogDescription>
                        Busque e selecione um ativo para a ordem de serviço
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por tag, nome ou localização..."
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
                            {filteredAssets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Search className="mb-2 h-8 w-8" />
                                    <p className="text-sm">Nenhum ativo encontrado</p>
                                    <p className="text-xs">Tente usar palavras-chave diferentes</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredAssets.map((asset, _index) => (
                                        <button
                                            key={asset.id}
                                            onClick={() => setSelectedId(asset.id.toString())}
                                            onDoubleClick={handleSelect}
                                            className={cn(
                                                "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                                                selectedId === asset.id.toString() && "border-primary bg-accent"
                                            )}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "h-2 w-2 rounded-full",
                                                            getStatusColor(asset.status)
                                                        )} />
                                                        <div>
                                                            <span className="font-medium">{asset.tag}</span>
                                                            <span className="text-muted-foreground"> - {asset.name}</span>
                                                        </div>
                                                    </div>
                                                    {asset.status && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {getStatusLabel(asset.status)}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        <span>{asset.locationPath}</span>
                                                    </div>
                                                </div>
                                                {/* Additional info if available */}
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    {asset.last_maintenance_at && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                Última manutenção: {new Date(asset.last_maintenance_at).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {asset.pending_work_orders_count && asset.pending_work_orders_count > 0 && (
                                                        <div className="flex items-center gap-1 text-amber-600">
                                                            <AlertCircle className="h-3 w-3" />
                                                            <span>
                                                                {asset.pending_work_orders_count} OS pendente{asset.pending_work_orders_count > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    {/* Footer */}
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            {filteredAssets.length} de {enrichedAssets.length} ativos
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSelect}
                                disabled={!selectedId}
                            >
                                Selecionar Ativo
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 