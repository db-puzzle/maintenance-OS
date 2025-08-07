import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DependencyResult } from '@/types/shared';
import { Link } from '@inertiajs/react';
import { AlertCircle, FileText, Layers, MapPin, Package } from 'lucide-react';
// Declare the global route function from Ziggy
declare const route: (name: string, params?: string | number | Record<string, string | number>) => string;
interface EntityDependenciesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityName: string;
    dependencies: DependencyResult | null;
}
// Map dependency keys to icons and routes
const dependencyConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; route?: string; label: string }> = {
    areas: { icon: MapPin, route: 'asset-hierarchy.areas.show', label: 'Áreas' },
    sectors: { icon: Layers, route: 'asset-hierarchy.sectors.show', label: 'Setores' },
    assets: { icon: Package, route: 'asset-hierarchy.assets.show', label: 'Ativos' },
    asset: { icon: Package, route: 'asset-hierarchy.assets.show', label: 'Ativos' },
    routines: { icon: FileText, label: 'Rotinas' },
};
export function EntityDependenciesDialog({ open, onOpenChange, entityName, dependencies }: EntityDependenciesDialogProps) {
    // Filter out dependencies with zero count
    const activeDependencies = dependencies ? Object.entries(dependencies.dependencies).filter(([, dep]) => (dep.count || dep.total || 0) > 0) : [];
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
                <DialogTitle className="flex items-center gap-2">
                    <AlertCircle className="text-destructive h-5 w-5" />
                    Não é possível excluir {entityName === 'planta' ? 'esta' : 'este'} {entityName}
                </DialogTitle>
                <DialogDescription>
                    {entityName === 'planta' ? 'Esta' : 'Este'} {entityName} possui itens vinculados e não pode ser{' '}
                    {entityName === 'planta' ? 'excluída' : 'excluído'} até que todos sejam excluídos ou movidos.
                </DialogDescription>
                {activeDependencies.length > 0 && (
                    <div className="my-4 space-y-4">
                        {activeDependencies.map(([key, dep]) => {
                            const config = dependencyConfig[key] || { icon: FileText, label: key };
                            const IconComponent = config.icon;
                            const itemCount = dep.count || dep.total || 0;
                            return (
                                <div key={key} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <IconComponent className="text-muted-foreground h-4 w-4" />
                                            <span className="text-sm font-medium">{dep.label || config.label}</span>
                                        </div>
                                        <span className="bg-destructive/10 text-destructive rounded-full px-2 py-1 text-xs font-medium">
                                            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                                        </span>
                                    </div>
                                    {dep.items && dep.items.length > 0 && (
                                        <div className="rounded-lg border">
                                            {dep.items.length <= 3 ? (
                                                <div className="space-y-1 p-2">
                                                    {dep.items.map((item: { id: number; name?: string; tag?: string; description?: string }) => {
                                                        const content = (
                                                            <div className="flex items-center">
                                                                <div className="flex flex-1 items-center">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="ml-2 text-sm font-medium">
                                                                            {item.name || item.tag || item.description || `Item ${item.id}`}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                        return config.route ? (
                                                            <Link key={item.id} href={route(config.route, item.id)} className="block">
                                                                <Card className="hover:bg-accent hover:text-accent-foreground cursor-pointer p-2 transition-colors">
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
                                                        <div className="space-y-1 p-2">
                                                            {dep.items.map(
                                                                (item: { id: number; name?: string; tag?: string; description?: string }) => {
                                                                    const content = (
                                                                        <div className="flex items-center">
                                                                            <div className="flex flex-1 items-center">
                                                                                <div className="min-w-0 flex-1">
                                                                                    <div className="ml-2 text-sm font-medium">
                                                                                        {item.name ||
                                                                                            item.tag ||
                                                                                            item.description ||
                                                                                            `Item ${item.id}`}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                    return config.route ? (
                                                                        <Link key={item.id} href={route(config.route, item.id)} className="block">
                                                                            <Card className="hover:bg-accent hover:text-accent-foreground cursor-pointer p-2 transition-colors">
                                                                                {content}
                                                                            </Card>
                                                                        </Link>
                                                                    ) : (
                                                                        <Card key={item.id} className="p-2">
                                                                            {content}
                                                                        </Card>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    </ScrollArea>
                                                    {dep.items.length > 10 && (
                                                        <div className="text-muted-foreground border-t p-2 text-center text-xs">
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
                    <Button variant="outline" onClick={() => onOpenChange(false)} autoFocus={false}>
                        Entendi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
