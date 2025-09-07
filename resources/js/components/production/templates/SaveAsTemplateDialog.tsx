import React from 'react';
import { useForm } from '@inertiajs/react';
import { route } from 'ziggy-js';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextInput } from '@/components/TextInput';
import { Textarea } from '@/components/ui/textarea';
import StateButton from '@/components/StateButton';
import { Tag, Globe } from 'lucide-react';
import { createFormAdapter } from '@/utils/form-adapters';
import { ManufacturingRoute } from '@/types/production';
import { toast } from 'sonner';

interface SaveAsTemplateDialogProps {
    manufacturingRoute: ManufacturingRoute;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SaveAsTemplateDialog: React.FC<SaveAsTemplateDialogProps> = ({
    manufacturingRoute,
    open,
    onOpenChange
}) => {
    // Check both the route's item and the manufacturing order's item
    const routeItem = manufacturingRoute.item || manufacturingRoute.manufacturing_order?.item;
    const hasCategory = !!routeItem?.category?.name;

    // Generate default name from step names
    const generateDefaultName = () => {
        if (manufacturingRoute.steps && manufacturingRoute.steps.length > 0) {
            return manufacturingRoute.steps
                .sort((a, b) => a.step_number - b.step_number)
                .map(step => step.name)
                .join(', ');
        }
        return `Template from ${manufacturingRoute.name}`;
    };

    // Generate informative description
    const generateDefaultDescription = () => {
        if (!manufacturingRoute.steps || manufacturingRoute.steps.length === 0) {
            // If no steps, return the original description unless it's the default empty route message
            if (manufacturingRoute.description &&
                !manufacturingRoute.description.includes('Empty route - add steps or execute without steps')) {
                return manufacturingRoute.description;
            }
            return '';
        }

        const totalSetupTime = manufacturingRoute.steps.reduce((sum, step) => sum + (step.setup_time_minutes || 0), 0);
        const totalCycleTime = manufacturingRoute.steps.reduce((sum, step) => sum + (step.cycle_time_minutes || 0), 0);
        const totalSteps = manufacturingRoute.steps.length;
        const workCells = [...new Set(manufacturingRoute.steps
            .filter(step => step.work_cell?.name)
            .map(step => step.work_cell!.name)
        )];

        let description = `Rota com ${totalSteps} etapa${totalSteps > 1 ? 's' : ''}`;

        if (totalSetupTime > 0) {
            description += ` | Tempo total de setup: ${totalSetupTime} min`;
        }

        if (totalCycleTime > 0) {
            description += ` | Tempo total de ciclo: ${totalCycleTime} min`;
        }

        if (workCells.length > 0) {
            description += ` | Células: ${workCells.join(', ')}`;
        }

        // Add original description if exists and it's not the default empty route message
        if (manufacturingRoute.description &&
            !manufacturingRoute.description.includes('Empty route - add steps or execute without steps')) {
            description += `\n\n${manufacturingRoute.description}`;
        }

        return description;
    };

    const form = useForm({
        name: generateDefaultName(),
        description: generateDefaultDescription(),
        item_category_id: hasCategory ? routeItem?.item_category_id : null,
        restrict_to_category: hasCategory, // Default to restricting to current category if available
        notes: ''
    });

    const formAdapter = createFormAdapter(form);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Clear any existing errors first
        form.clearErrors();

        // Validate required name field
        if (!form.data.name.trim()) {
            form.setError('name', 'Nome do template é obrigatório');
            return;
        }

        form.post(route(`production.routes.save-as-template`, manufacturingRoute.id), {
            onSuccess: () => {
                // The backend will redirect to template show page, 
                // which will immediately redirect back to where we came from
                toast.success('Rota salva como template com sucesso');
                onOpenChange(false);
                form.reset();
            },
            onError: (errors) => {
                if (errors.name) {
                    form.setError('name', errors.name);
                }
                toast.error('Falha ao salvar template');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Salvar Rota como Template</DialogTitle>
                    <DialogDescription>
                        Crie um template reutilizável a partir desta rota de manufatura.
                        O template preservará todas as etapas e configurações.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <TextInput
                            form={formAdapter}
                            name="name"
                            label="Nome do Template"
                            placeholder="Digite o nome do template"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder="Descreva quando usar este template"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Aplicabilidade do Template</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <StateButton
                                icon={Tag}
                                title="Categoria Específica"
                                description={hasCategory
                                    ? routeItem?.category?.name || ''
                                    : 'Item sem categoria'
                                }
                                selected={form.data.restrict_to_category}
                                onClick={() => {
                                    form.setData('restrict_to_category', true);
                                    form.setData('item_category_id', routeItem?.item_category_id);
                                }}
                                disabled={!hasCategory}
                                iconSize="sm"
                            />
                            <StateButton
                                icon={Globe}
                                title="Qualquer Categoria"
                                description="Disponível para todos"
                                selected={!form.data.restrict_to_category}
                                onClick={() => {
                                    form.setData('restrict_to_category', false);
                                    form.setData('item_category_id', null);
                                }}
                                iconSize="sm"
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Define se este template será restrito à categoria do item atual ou disponível para todos os itens
                        </p>
                    </div>


                    <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                            id="notes"
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder="Observações adicionais sobre este template"
                            rows={2}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={form.processing}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.processing || !form.data.name.trim()}>
                            {form.processing ? 'Salvando...' : 'Salvar como Template'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
