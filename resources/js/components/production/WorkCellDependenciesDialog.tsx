import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DependencyResult } from '@/types/shared';
import { Link } from '@inertiajs/react';
import { AlertCircle, Factory, Route, Cog } from 'lucide-react';

interface WorkCellDependency {
    id: number;
    name: string;
    item_name: string;
    manufacturing_order: {
        id: number;
        order_number: string;
        route: string;
    };
    manufacturing_route: {
        id: number;
        name: string;
        route: string;
    };
    step_route: string;
}

interface WorkCellDependenciesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workCellName: string;
    dependencies: DependencyResult | null;
}

export function WorkCellDependenciesDialog({
    open,
    onOpenChange,
    workCellName,
    dependencies
}: WorkCellDependenciesDialogProps) {
    // Extract routing steps dependencies
    const routingSteps = dependencies?.dependencies?.routing_steps as {
        count: number;
        label: string;
        items: WorkCellDependency[];
    } | undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col overflow-hidden">
                <DialogTitle className="flex items-center gap-2">
                    <AlertCircle className="text-destructive h-5 w-5" />
                    Não é possível excluir esta célula de trabalho
                </DialogTitle>
                <DialogDescription>
                    A célula de trabalho "{workCellName}" possui etapas de roteiro vinculadas e não pode ser
                    excluída até que todas sejam removidas ou movidas para outra célula.
                </DialogDescription>

                {routingSteps && routingSteps.count > 0 && (
                    <div className="mt-4">
                        {/* Total count header */}
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium">
                                Total de Etapas de Roteiro Vinculadas
                            </h4>
                            <span className="text-sm font-semibold text-destructive">
                                {routingSteps.count} {routingSteps.count === 1 ? 'etapa' : 'etapas'}
                            </span>
                        </div>

                        {/* Showing only latest 3 */}
                        <p className="text-sm text-muted-foreground mb-3">
                            Exibindo as {Math.min(3, routingSteps.count)} mais recentes:
                        </p>

                        <ScrollArea className="h-[300px] rounded-md border p-4">
                            <div className="space-y-3">
                                {routingSteps.items.slice(0, 3).map((step) => (
                                    <Card key={step.id} className="p-4">
                                        <div className="space-y-2">
                                            {/* Step Information */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Cog className="h-4 w-4 text-muted-foreground" />
                                                        <Link
                                                            href={step.step_route}
                                                            className="font-medium text-primary hover:underline"
                                                        >
                                                            {step.name}
                                                        </Link>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Item: {step.item_name}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Links Section */}
                                            <div className="flex flex-wrap gap-4 pt-2 border-t">
                                                {/* Manufacturing Order Link */}
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <Factory className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-muted-foreground">OM:</span>
                                                    <Link
                                                        href={step.manufacturing_order.route}
                                                        className="text-primary hover:underline"
                                                    >
                                                        #{step.manufacturing_order.order_number}
                                                    </Link>
                                                </div>

                                                {/* Route Link */}
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <Route className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-muted-foreground">Roteiro:</span>
                                                    <Link
                                                        href={step.manufacturing_route.route}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {step.manufacturing_route.name}
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}

                                {routingSteps.count > 3 && (
                                    <p className="text-sm text-muted-foreground text-center py-2 italic">
                                        ... e mais {routingSteps.count - 3} etapas não exibidas
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
