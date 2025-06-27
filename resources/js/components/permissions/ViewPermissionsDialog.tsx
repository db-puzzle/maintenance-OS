import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    FileText,
    Package,
    MapPin,
    Layers,
    Settings,
    Users,
    Key,
    Wrench,
    Database,
    Calendar,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

interface Permission {
    id: number;
    name: string;
    resource: string;
    action: string;
    display_name?: string;
    description?: string;
}

interface Role {
    id: number;
    name: string;
    is_system: boolean;
    permissions_count: number;
    users_count: number;
    permissions?: Permission[];
}

interface ViewPermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role | null;
    loading?: boolean;
}

// Map resources to icons and labels
const resourceConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
    plants: { icon: Layers, label: 'Plantas', color: 'text-green-600' },
    areas: { icon: MapPin, label: 'Áreas', color: 'text-blue-600' },
    sectors: { icon: Database, label: 'Setores', color: 'text-purple-600' },
    assets: { icon: Package, label: 'Ativos', color: 'text-orange-600' },
    'asset-types': { icon: Settings, label: 'Tipos de Ativos', color: 'text-indigo-600' },
    manufacturers: { icon: Wrench, label: 'Fabricantes', color: 'text-yellow-600' },
    routines: { icon: Calendar, label: 'Rotinas', color: 'text-pink-600' },
    forms: { icon: FileText, label: 'Formulários', color: 'text-cyan-600' },
    users: { icon: Users, label: 'Usuários', color: 'text-red-600' },
    roles: { icon: Shield, label: 'Papéis', color: 'text-emerald-600' },
    permissions: { icon: Key, label: 'Permissões', color: 'text-violet-600' },
};

// Map actions to human-readable labels
const actionLabels: Record<string, string> = {
    'view': 'Visualizar',
    'create': 'Criar',
    'update': 'Editar',
    'delete': 'Excluir',
    'export': 'Exportar',
    'import': 'Importar',
    'manage': 'Gerenciar',
    'execute': 'Executar',
};

export function ViewPermissionsDialog({
    open,
    onOpenChange,
    role,
    loading = false
}: ViewPermissionsDialogProps) {

    if (!role) return null;

    // Group permissions by resource
    const groupedPermissions = role.permissions?.reduce((acc, perm) => {
        const resource = perm.resource || 'unknown';
        if (!acc[resource]) acc[resource] = [];
        acc[resource].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>) || {};

    // Sort resources by label
    const sortedResources = Object.entries(groupedPermissions).sort(([a], [b]) => {
        const labelA = resourceConfig[a]?.label || a;
        const labelB = resourceConfig[b]?.label || b;
        return labelA.localeCompare(labelB);
    });

    const totalPermissions = role.permissions?.length || 0;
    const resourceCount = Object.keys(groupedPermissions).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
                <div>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                Permissões: {role.name}
                                {role.is_system && (
                                    <Badge variant="secondary" className="text-xs">Sistema</Badge>
                                )}
                            </div>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="mt-2 flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{totalPermissions}</span> permissões ativas
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="flex items-center gap-1.5">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{resourceCount}</span> recursos
                        </span>
                    </DialogDescription>
                </div>

                {loading ? (
                    <div className="flex flex-1 items-center justify-center py-8">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-sm text-muted-foreground">Carregando permissões...</p>
                        </div>
                    </div>
                ) : sortedResources.length > 0 ? (
                    <ScrollArea className="mt-6 flex-1 pr-4">
                        <div className="space-y-6 pb-4">
                            {sortedResources.map(([resource, permissions]) => {
                                const config = resourceConfig[resource] || {
                                    icon: FileText,
                                    label: resource.charAt(0).toUpperCase() + resource.slice(1),
                                    color: 'text-gray-600'
                                };
                                const IconComponent = config.icon;

                                // Sort permissions by action
                                const sortedPermissions = permissions.sort((a, b) =>
                                    (actionLabels[a.action] || a.action).localeCompare(actionLabels[b.action] || b.action)
                                );

                                return (
                                    <div key={resource} className="space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <div className="flex items-center gap-2">
                                                <IconComponent className={`h-5 w-5 ${config.color}`} />
                                                <h3 className="font-semibold">{config.label}</h3>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                {permissions.length} {permissions.length === 1 ? 'permissão' : 'permissões'}
                                            </Badge>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {sortedPermissions.map((permission) => (
                                                <Card
                                                    key={permission.id}
                                                    className="group border-muted/50 p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                                                            <Key className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="min-w-0 flex-1 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm">
                                                                    {actionLabels[permission.action] || permission.action}
                                                                </span>
                                                            </div>
                                                            {permission.display_name && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {permission.display_name}
                                                                </p>
                                                            )}
                                                            <p className="font-mono text-xs text-muted-foreground/70">
                                                                {permission.name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex flex-1 items-center justify-center py-8">
                        <div className="text-center">
                            <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">Nenhuma permissão atribuída</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Este papel não possui permissões configuradas
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 