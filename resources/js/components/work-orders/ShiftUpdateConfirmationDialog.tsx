import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, AlertTriangle } from 'lucide-react';
interface AffectedAsset {
    id: number;
    tag: string;
    description?: string | null;
    asset_type?: string | null;
    plant?: string | null;
    area?: string | null;
    sector?: string | null;
    current_runtime_hours: number;
}
interface ShiftUpdateConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    affectedAssets: AffectedAsset[];
    updateMode: 'all' | 'selected';
    onUpdateModeChange: (mode: 'all' | 'selected') => void;
    selectedAssetIds: number[];
    onSelectedAssetsChange: (ids: number[]) => void;
    onConfirm: () => void;
    onCancel: () => void;
    processing?: boolean;
    currentAssetId?: number;
}
export const ShiftUpdateConfirmationDialog: React.FC<ShiftUpdateConfirmationDialogProps> = ({
    open,
    onOpenChange,
    affectedAssets,
    updateMode,
    onUpdateModeChange,
    selectedAssetIds,
    onSelectedAssetsChange,
    onConfirm,
    onCancel,
    processing = false,
    currentAssetId,
}) => {
    // Sort assets to put current asset first
    const sortedAssets = React.useMemo(() => {
        if (!currentAssetId) return affectedAssets;
        const currentAsset = affectedAssets.find(a => a.id === currentAssetId);
        const otherAssets = affectedAssets.filter(a => a.id !== currentAssetId);
        return currentAsset ? [currentAsset, ...otherAssets] : affectedAssets;
    }, [affectedAssets, currentAssetId]);
    const handleSelectAll = () => {
        if (selectedAssetIds.length === sortedAssets.length) {
            onSelectedAssetsChange([]);
        } else {
            onSelectedAssetsChange(sortedAssets.map((a) => a.id));
        }
    };
    const handleAssetToggle = (assetId: number, checked: boolean) => {
        if (checked) {
            onSelectedAssetsChange([...selectedAssetIds, assetId]);
        } else {
            onSelectedAssetsChange(selectedAssetIds.filter((id) => id !== assetId));
        }
    };
    const handleUpdateModeChange = (mode: 'all' | 'selected') => {
        onUpdateModeChange(mode);
        if (mode === 'selected' && currentAssetId) {
            // When switching to 'selected' mode, only select the current asset
            onSelectedAssetsChange([currentAssetId]);
        } else if (mode === 'all') {
            // Clear selection when switching to 'all' mode
            onSelectedAssetsChange([]);
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Confirmação de Atualização de Turno
                    </DialogTitle>
                    <DialogDescription className="ml-7">
                        Esta alteração afetará {affectedAssets.length} {affectedAssets.length === 1 ? 'ativo' : 'ativos'}.
                        Escolha como deseja proceder:
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-1 flex-col px-6 py-4">
                    {/* Update Mode Selection - Fixed */}
                    <div className="space-y-3 mb-4">
                        <div className="flex items-start space-x-3">
                            <input
                                type="radio"
                                id="update-all"
                                name="update-mode"
                                value="all"
                                checked={updateMode === 'all'}
                                onChange={() => handleUpdateModeChange('all')}
                                className="mt-1"
                            />
                            <label htmlFor="update-all" className="cursor-pointer">
                                <div className="font-medium">Atualizar todos os ativos</div>
                                <div className="text-muted-foreground text-sm">
                                    O turno existente será atualizado e todos os {affectedAssets.length} ativos
                                    continuarão usando este turno.
                                </div>
                            </label>
                        </div>
                        <div className="flex items-start space-x-3">
                            <input
                                type="radio"
                                id="update-selected"
                                name="update-mode"
                                value="selected"
                                checked={updateMode === 'selected'}
                                onChange={() => handleUpdateModeChange('selected')}
                                className="mt-1"
                            />
                            <label htmlFor="update-selected" className="cursor-pointer">
                                <div className="font-medium">Criar cópia do turno para ativos selecionados</div>
                                <div className="text-muted-foreground text-sm">
                                    Um novo turno será criado com as alterações e apenas os ativos selecionados
                                    serão associados a ele.
                                </div>
                            </label>
                        </div>
                    </div>
                    {/* Asset List Header - Fixed */}
                    {updateMode === 'selected' && (
                        <div className="mb-2 flex items-center justify-between border-b pb-2">
                            <span className="text-sm font-medium">Selecione os ativos para atualizar:</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleSelectAll}
                            >
                                {selectedAssetIds.length === sortedAssets.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </Button>
                        </div>
                    )}
                    {/* Scrollable Asset List */}
                    <ScrollArea className="h-[280px]">
                        <div className="space-y-2 pr-4">
                            {sortedAssets.map((asset) => {
                                const isCurrentAsset = asset.id === currentAssetId;
                                return (
                                    <Card key={asset.id} className={isCurrentAsset ? "border-primary" : ""}>
                                        <div className="px-3 -my-2">
                                            <div className="flex items-start justify-between">
                                                <div className="flex flex-1 items-start space-x-3">
                                                    {updateMode === 'selected' && (
                                                        <Checkbox
                                                            checked={selectedAssetIds.includes(asset.id)}
                                                            onCheckedChange={(checked) => handleAssetToggle(asset.id, checked as boolean)}
                                                            className="mt-1"
                                                        />
                                                    )}
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium">{asset.tag}</div>
                                                            {isCurrentAsset && (
                                                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                                    Ativo Atual
                                                                </span>
                                                            )}
                                                        </div>
                                                        {asset.description && (
                                                            <div className="text-muted-foreground text-sm">{asset.description}</div>
                                                        )}
                                                        <div className="text-muted-foreground space-x-2 text-xs">
                                                            {asset.asset_type && <span>Tipo: {asset.asset_type}</span>}
                                                            {asset.plant && <span>• Planta: {asset.plant}</span>}
                                                            {asset.area && <span>• Área: {asset.area}</span>}
                                                            {asset.sector && <span>• Setor: {asset.sector}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="ml-4 text-right">
                                                    <div className="text-sm font-medium">Horímetro Atual</div>
                                                    <div className="text-lg">{asset.current_runtime_hours.toFixed(2)}h</div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </ScrollArea>
                    {/* Fixed footer content */}
                    <div className="mt-4 space-y-4">
                        {updateMode === 'selected' && (
                            <div className="text-muted-foreground text-sm">
                                {selectedAssetIds.length} de {sortedAssets.length} ativos selecionados
                            </div>
                        )}
                        {/* Runtime Recording Note */}
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                                O horímetro atual será registrado automaticamente para {updateMode === 'all' ? 'todos os' : 'os'} ativos{' '}
                                {updateMode === 'selected' ? 'selecionados' : 'afetados'} antes da alteração,
                                preservando o histórico de operação.
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
                <DialogFooter className="flex-shrink-0">
                    <Button variant="outline" onClick={onCancel} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={processing || (updateMode === 'selected' && selectedAssetIds.length === 0)}
                    >
                        {processing ? 'Processando...' : updateMode === 'all' ? 'Atualizar Todos' : 'Criar Cópia e Atualizar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 