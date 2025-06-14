import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DependencyResult } from '@/types/shared';
import { Link } from '@inertiajs/react';
import { AlertCircle, FileText, Layers, MapPin, Package } from 'lucide-react';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: any) => string;

interface EntityDependenciesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityName: string;
    dependencies: DependencyResult | null;
}

// Map dependency keys to icons and routes
const dependencyConfig: Record<string, { icon: any; route?: string; label: string }> = {
    areas: { icon: MapPin, route: 'asset-hierarchy.areas.show', label: 'Áreas' },
    sectors: { icon: Layers, route: 'asset-hierarchy.setores.show', label: 'Setores' },
    assets: { icon: Package, route: 'asset-hierarchy.assets.show', label: 'Ativos' },
    asset: { icon: Package, route: 'asset-hierarchy.assets.show', label: 'Ativos' },
    routines: { icon: FileText, label: 'Rotinas' },
};

export function EntityDependenciesDialog({
    open,
    onOpenChange,
    entityName,
    dependencies,
}: EntityDependenciesDialogProps) {
    // Filter out dependencies with zero count
    const activeDependencies = dependencies ?
        Object.entries(dependencies.dependencies).filter(([_, dep]) => (dep.count || dep.total || 0) > 0) : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Não é possível excluir {entityName === 'planta' ? 'esta' : 'este'} {entityName}
                </DialogTitle>
                <DialogDescription>
                    {entityName === 'planta' ? 'Esta' : 'Este'} {entityName} possui itens vinculados e não pode ser {entityName === 'planta' ? 'excluída' : 'excluído'} até que todos sejam excluídos ou movidos.
                </DialogDescription>

                {activeDependencies.length > 0 && (
                    <div className="space-y-4 my-4">
                        {activeDependencies.map(([key, dep]) => {
                            const config = dependencyConfig[key] || { icon: FileText, label: key };
                            const IconComponent = config.icon;
                            const itemCount = dep.count || dep.total || 0;

                            return (
                                <div key={key} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                {dep.label || config.label}
                                            </span>
                                        </div>
                                        <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                                            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                                        </span>
                                    </div>

                                    {dep.items && dep.items.length > 0 && (
                                        <div className="border rounded-lg">
                                            {dep.items.length <= 3 ? (
                                                <div className="p-2 space-y-1">
                                                    {dep.items.map((item: any) => {
                                                        const content = (
                                                            <div className="flex items-center">
                                                                <div className="flex items-center flex-1">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-medium ml-2 text-sm">
                                                                            {item.name || item.tag || item.description || `Item ${item.id}`}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );

                                                        return config.route ? (
                                                            <Link
                                                                key={item.id}
                                                                href={route(config.route, item.id)}
                                                                className="block"
                                                            >
                                                                <Card className="p-2 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                                                                    {content}
                                                                </Card>
                                                            </Link>
                                                        ) : (
                                                            <Card key={item.id} className="p-2">
                                                                {content}
                                                            </Card>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <>
                                                    <ScrollArea className="h-[140px]">
                                                        <div className="p-2 space-y-1">
                                                            {dep.items.map((item: any) => {
                                                                const content = (
                                                                    <div className="flex items-center">
                                                                        <div className="flex items-center flex-1">
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="font-medium ml-2 text-sm">
                                                                                    {item.name || item.tag || item.description || `Item ${item.id}`}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );

                                                                return config.route ? (
                                                                    <Link
                                                                        key={item.id}
                                                                        href={route(config.route, item.id)}
                                                                        className="block"
                                                                    >
                                                                        <Card className="p-2 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                                                                            {content}
                                                                        </Card>
                                                                    </Link>
                                                                ) : (
                                                                    <Card key={item.id} className="p-2">
                                                                        {content}
                                                                    </Card>
                                                                );
                                                            })}
                                                        </div>
                                                    </ScrollArea>
                                                    {dep.items.length > 10 && (
                                                        <div className="text-xs text-muted-foreground p-2 text-center border-t">
                                                            Mostrando {Math.min(dep.items.length, 10)} de {dep.items.length} itens
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        autoFocus={false}
                    >
                        Entendi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 