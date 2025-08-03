import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle } from 'lucide-react';
interface Part {
    id: number;
    part_number: string;
    name: string;
    available_quantity: number;
    minimum_quantity: number;
}
interface WorkOrder {
    id: number;
    title: string;
    status: string;
    quantity: number;
}
interface DependencyResult {
    can_delete: boolean;
    dependencies: {
        work_orders?: {
            total: number;
            items: WorkOrder[];
        };
    };
}
interface PartSubstitutionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    part: Part;
    dependencies: DependencyResult;
    availableParts: Part[];
    onConfirm: (substitutePart: Part, updateMode: 'all' | 'selected', selectedIds: number[]) => void;
}
export function PartSubstitutionDialog({ 
    open, 
    onOpenChange, 
    part, 
    dependencies, 
    availableParts,
    onConfirm 
}: PartSubstitutionDialogProps) {
    const [substitutePart, setSubstitutePart] = useState<Part | null>(null);
    const [updateMode, setUpdateMode] = useState<'all' | 'selected'>('all');
    const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);
    // Filter out the current part from available substitutes
    const substituteParts = availableParts.filter(p => p.id !== part.id);
    const workOrders = dependencies.dependencies.work_orders?.items || [];
    const handleConfirm = async () => {
        if (!substitutePart) return;
        setProcessing(true);
        try {
            await onConfirm(
                substitutePart, 
                updateMode, 
                updateMode === 'all' ? [] : selectedWorkOrderIds
            );
            onOpenChange(false);
        } finally {
            setProcessing(false);
        }
    };
    const toggleWorkOrderSelection = (workOrderId: number) => {
        setSelectedWorkOrderIds(current => {
            if (current.includes(workOrderId)) {
                return current.filter(id => id !== workOrderId);
            }
            return [...current, workOrderId];
        });
    };
    const toggleAllWorkOrders = () => {
        if (selectedWorkOrderIds.length === workOrders.length) {
            setSelectedWorkOrderIds([]);
        } else {
            setSelectedWorkOrderIds(workOrders.map(wo => wo.id));
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Substituir Peça Antes de Excluir
                    </DialogTitle>
                    <DialogDescription>
                        A peça "{part.name}" está sendo usada em {workOrders.length} ordem(ns) de serviço.
                        Selecione uma peça substituta antes de excluir.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Part selection */}
                    <div>
                        <Label>Peça Substituta</Label>
                        <Select
                            value={substitutePart?.id.toString()}
                            onValueChange={(value) => {
                                const selected = substituteParts.find(p => p.id.toString() === value);
                                setSubstitutePart(selected || null);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma peça para substituir" />
                            </SelectTrigger>
                            <SelectContent>
                                {substituteParts.map((p) => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{p.part_number}</span>
                                            <span className="text-muted-foreground">- {p.name}</span>
                                            {p.available_quantity < p.minimum_quantity && (
                                                <Badge variant="destructive" className="ml-2">
                                                    Estoque Baixo
                                                </Badge>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Update mode selection */}
                    <div className="space-y-3">
                        <Label>Modo de Atualização</Label>
                        <RadioGroup value={updateMode} onValueChange={(v) => setUpdateMode(v as 'all' | 'selected')}>
                            <div className="flex items-start space-x-3">
                                <RadioGroupItem value="all" id="update-all" />
                                <label htmlFor="update-all" className="cursor-pointer">
                                    <div className="font-medium">Substituir em todas as ordens</div>
                                    <div className="text-sm text-muted-foreground">
                                        A peça será substituída em todas as {workOrders.length} ordens de serviço
                                    </div>
                                </label>
                            </div>
                            <div className="flex items-start space-x-3">
                                <RadioGroupItem value="selected" id="update-selected" />
                                <label htmlFor="update-selected" className="cursor-pointer">
                                    <div className="font-medium">Substituir apenas nas ordens selecionadas</div>
                                    <div className="text-sm text-muted-foreground">
                                        Escolha quais ordens terão a peça substituída
                                    </div>
                                </label>
                            </div>
                        </RadioGroup>
                    </div>
                    {/* Work order selection (when mode is 'selected') */}
                    {updateMode === 'selected' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Ordens de Serviço</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleAllWorkOrders}
                                >
                                    {selectedWorkOrderIds.length === workOrders.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                                </Button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                                {workOrders.map((wo) => (
                                    <label
                                        key={wo.id}
                                        className="flex items-center space-x-3 p-2 hover:bg-accent rounded cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={selectedWorkOrderIds.includes(wo.id)}
                                            onCheckedChange={() => toggleWorkOrderSelection(wo.id)}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">#{wo.id} - {wo.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Quantidade: {wo.quantity} | Status: {wo.status}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Warning message */}
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            As ordens de serviço serão atualizadas automaticamente para usar a nova peça.
                            Um registro será adicionado ao histórico de cada ordem afetada.
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!substitutePart || (updateMode === 'selected' && selectedWorkOrderIds.length === 0) || processing}
                    >
                        {processing ? 'Processando...' : 'Substituir e Excluir'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}