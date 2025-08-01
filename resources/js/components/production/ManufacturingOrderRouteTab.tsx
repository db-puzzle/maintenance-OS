import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import {
    Workflow,
    AlertCircle,
    Plus,
    FileText,
    Sparkles,
    Clock,
    Users,
    ChevronRight
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EmptyCard from '@/components/ui/empty-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextInput } from '@/components/TextInput';
import { ItemSelect } from '@/components/ItemSelect';
import { ManufacturingOrder, ManufacturingRoute, ManufacturingStep, WorkCell } from '@/types/production';
import { Form } from '@/types/work-order';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import RouteBuilderCore from '@/components/production/RouteBuilderCore';

interface Props {
    order: ManufacturingOrder;
    canCreateRoute: boolean;
    templates?: RouteTemplate[];
    workCells?: WorkCell[];
    stepTypes?: Record<string, string>;
    forms?: Form[];
}

interface RouteTemplate {
    id: number;
    name: string;
    description?: string;
    category?: string;
    steps_count: number;
    estimated_time: number;
    usage_count: number;
    last_used_at?: string;
}

type ViewMode = 'empty' | 'create' | 'builder' | 'routeViewer';

export default function ManufacturingOrderRouteTab({
    order,
    canCreateRoute,
    templates = [],
    workCells = [],
    stepTypes = {},
    forms = []
}: Props) {
    const { props } = usePage();
    const flash = props.flash as any;

    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const openRouteBuilderParam = urlParams.get('openRouteBuilder');

    // Check if we should start in builder mode (e.g., after creating a new route)
    const shouldStartInBuilder = (order.manufacturing_route &&
        (!order.manufacturing_route.steps || order.manufacturing_route.steps.length === 0)) ||
        flash?.openRouteBuilder ||
        openRouteBuilderParam === '1';

    // Determine the correct view mode
    const determineViewMode = (): ViewMode => {
        // Check if we have the necessary data
        if (!order || !order.id) return 'empty';

        if (shouldStartInBuilder && order.manufacturing_route) return 'builder';
        if (order.manufacturing_route) return 'routeViewer';
        return 'empty';
    };

    const initialViewMode = determineViewMode();

    const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
    const [selectedTemplate, setSelectedTemplate] = useState<RouteTemplate | null>(null);
    const [showRouteDialog, setShowRouteDialog] = useState(false);

    // Reset view mode when order or conditions change
    useEffect(() => {
        const correctMode = determineViewMode();
        if (viewMode !== correctMode) {
            setViewMode(correctMode);
        }
    }, [order?.id, order?.manufacturing_route?.id, openRouteBuilderParam, flash?.openRouteBuilder]);

    // Clean up URL param after using it
    useEffect(() => {
        if (openRouteBuilderParam === '1') {
            // Remove the query parameter from URL without page reload
            const url = new URL(window.location.href);
            url.searchParams.delete('openRouteBuilder');
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        description: '',
        template_id: '',
    });

    // Create a wrapper for form compatibility
    const form = {
        data,
        setData: (name: string, value: any) => setData(name as any, value),
        errors: errors as Partial<Record<string, string>>,
        clearErrors: (...fields: string[]) => clearErrors(...(fields as any)),
    };

    const handleCreateRoute = () => {
        post(route('production.orders.routes.store', order.id), {
            onSuccess: () => {
                toast.success('Roteiro criado com sucesso');
                setShowRouteDialog(false);
                reset();
                setSelectedTemplate(null);
                // The page will reload from the controller redirect
                // and shouldStartInBuilder will detect the new route without steps
            },
            onError: () => {
                toast.error('Erro ao criar roteiro');
            }
        });
    };

    const handleTemplateSelect = (template: RouteTemplate) => {
        setSelectedTemplate(template);
        setData('template_id', template.id.toString());
        setData('name', `${template.name} - ${order.order_number}`);
        setData('description', template.description || '');
    };

    const handleOpenCustomRouteDialog = () => {
        // Check if we can create a route first
        const canCreate = canCreateRoute && (order.status === 'draft' || order.status === 'planned');

        if (!canCreate) {
            if (!canCreateRoute) {
                toast.error('Você não tem permissão para criar roteiros');
            } else {
                toast.error(`Roteiros só podem ser criados para ordens em rascunho ou planejadas. Status atual: ${order.status}`);
            }
            return;
        }

        // Check if order already has a route
        if (order.manufacturing_route) {
            toast.error('Esta ordem já possui um roteiro');
            return;
        }

        // Use router.post directly with the data
        router.post(route('production.orders.routes.store', order.id), {
            name: `Roteiro Dedicado - ${order.order_number}`,
            description: `Roteiro customizado criado especificamente para a ordem de fabricação ${order.order_number}`,
            template_id: ''
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Roteiro criado com sucesso');
                // The page will reload from the controller redirect
                // and shouldStartInBuilder will detect the new route without steps
            },
            onError: (errors) => {
                if (typeof errors === 'object' && errors !== null) {
                    // Handle validation errors
                    const errorMessages = Object.values(errors).flat();
                    if (errorMessages.length > 0) {
                        toast.error(errorMessages[0] as string);
                    } else {
                        toast.error('Erro ao criar roteiro. Verifique os dados enviados.');
                    }
                } else if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error('Erro ao criar roteiro. Verifique se a ordem já possui um roteiro.');
                }
            }
        });
    };

    const handleCloseDialog = () => {
        setShowRouteDialog(false);
        reset();
        setSelectedTemplate(null);
        clearErrors();
    };

    const formatTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    };



    // Route Creation Dialog
    // Add a loading state check
    if (!order || !order.id) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Carregando...</div>
            </div>
        );
    }

    return (
        <>
            {/* Main content rendering */}
            {(() => {
                // Builder mode - show route builder inside the tab (edit mode)
                if (viewMode === 'builder' && order.manufacturing_route) {
                    return (
                        <div className="h-[calc(100vh-12rem)]">
                            <RouteBuilderCore
                                routing={{
                                    id: order.manufacturing_route.id || 0,
                                    manufacturing_order_id: order.manufacturing_route.manufacturing_order_id,
                                    item_id: order.manufacturing_route.item_id,
                                    route_template_id: order.manufacturing_route.route_template_id,
                                    name: order.manufacturing_route.name || '',
                                    description: order.manufacturing_route.description,
                                    is_active: order.manufacturing_route.is_active || false,
                                    created_by: order.manufacturing_route.created_by,
                                    created_at: order.manufacturing_route.created_at,
                                    updated_at: order.manufacturing_route.updated_at,
                                    steps: order.manufacturing_route.steps || []
                                }}
                                workCells={workCells}
                                stepTypes={stepTypes}
                                forms={forms}
                                can={{
                                    manage_steps: canCreateRoute
                                }}
                                embedded={true}
                                onSave={() => {
                                    setViewMode('routeViewer');
                                    router.reload({ only: ['order'] });
                                }}
                                onCancel={() => setViewMode('routeViewer')}
                                viewMode={false}
                            />
                        </div>
                    );
                }

                // Route viewer mode - show route builder in view-only mode
                if (viewMode === 'routeViewer' && order.manufacturing_route) {
                    return (
                        <div className="h-[calc(100vh-12rem)]">
                            <RouteBuilderCore
                                routing={{
                                    id: order.manufacturing_route.id || 0,
                                    manufacturing_order_id: order.manufacturing_route.manufacturing_order_id,
                                    item_id: order.manufacturing_route.item_id,
                                    route_template_id: order.manufacturing_route.route_template_id,
                                    name: order.manufacturing_route.name || '',
                                    description: order.manufacturing_route.description,
                                    is_active: order.manufacturing_route.is_active || false,
                                    created_by: order.manufacturing_route.created_by,
                                    created_at: order.manufacturing_route.created_at,
                                    updated_at: order.manufacturing_route.updated_at,
                                    steps: order.manufacturing_route.steps || []
                                }}
                                workCells={workCells}
                                stepTypes={stepTypes}
                                forms={forms}
                                can={{
                                    manage_steps: canCreateRoute
                                }}
                                embedded={true}
                                onCancel={() => setViewMode('routeViewer')}
                                viewMode={true}
                                onEdit={() => setViewMode('builder')}
                            />
                        </div>
                    );
                }

                // Empty state - no route exists
                if (viewMode === 'empty') {
                    const canCreate = canCreateRoute && (order.status === 'draft' || order.status === 'planned');

                    return (
                        <div className="flex min-h-[400px] items-center justify-center px-6 lg:px-8">
                            <div className="w-full">
                                <EmptyCard
                                    icon={Workflow}
                                    title="Nenhum roteiro"
                                    description={
                                        canCreate
                                            ? "Crie um roteiro de produção para esta ordem de fabricação"
                                            : "Nenhum roteiro foi criado para esta ordem"
                                    }
                                    primaryButtonText={canCreate ? "Criar Roteiro" : undefined}
                                    primaryButtonAction={canCreate ? () => setViewMode('create') : undefined
                                    }
                                />

                                {!canCreateRoute && (
                                    <div className="mt-4">
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Você não tem permissão para criar roteiros ou a ordem já foi liberada/completada.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }

                // Create mode - show creation options
                if (viewMode === 'create') {
                    return (
                        <div className="space-y-6 px-6 lg:px-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Criar Roteiro de Produção</h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setViewMode('empty')}
                                    >
                                        Cancelar
                                    </Button>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Template Option */}
                                    <Card className="group cursor-pointer hover:border-ring hover:ring-ring/10 hover:bg-input-focus transition-[color,box-shadow,border-color,background-color]" onClick={() => { }}>
                                        <CardContent className="p-6 text-center">
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="p-4 bg-muted group-hover:bg-background rounded-full transition-colors">
                                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-2">
                                                    <CardTitle className="text-lg">Usar Template</CardTitle>
                                                    <CardDescription className="text-sm font-medium">
                                                        <Badge variant="secondary" className="group-hover:bg-background transition-colors">
                                                            {templates.length} templates disponíveis
                                                        </Badge>
                                                    </CardDescription>
                                                </div>
                                                <p className="text-sm text-muted-foreground text-center">
                                                    Crie rapidamente um roteiro baseado em templates pré-definidos
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Custom Route Option */}
                                    <Card
                                        className="group cursor-pointer hover:border-ring hover:ring-ring/10 hover:bg-input-focus transition-[color,box-shadow,border-color,background-color]"
                                        onClick={handleOpenCustomRouteDialog}
                                    >
                                        <CardContent className="p-6 text-center">
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="p-4 bg-muted group-hover:bg-background rounded-full transition-colors">
                                                    <Plus className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-2">
                                                    <CardTitle className="text-lg">Roteiro Customizado</CardTitle>
                                                    <CardDescription className="text-sm font-medium">Criação rápida</CardDescription>
                                                </div>
                                                <p className="text-sm text-muted-foreground text-center">
                                                    Crie instantaneamente um roteiro dedicado para esta ordem
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Template List */}
                                {templates.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="font-medium">Templates Disponíveis</h4>
                                        <div className="space-y-2">
                                            {templates.map((template) => (
                                                <Card
                                                    key={template.id}
                                                    className="group cursor-pointer hover:border-ring hover:ring-ring/10 hover:bg-input-focus transition-[color,box-shadow,border-color,background-color]"
                                                    onClick={() => handleTemplateSelect(template)}
                                                >
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-start justify-between">
                                                            <div className="space-y-1">
                                                                <CardTitle className="text-base">{template.name}</CardTitle>
                                                                {template.description && (
                                                                    <CardDescription>{template.description}</CardDescription>
                                                                )}
                                                            </div>
                                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Workflow className="h-4 w-4" />
                                                                {template.steps_count} etapas
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-4 w-4" />
                                                                {formatTime(template.estimated_time)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Users className="h-4 w-4" />
                                                                Usado {template.usage_count}x
                                                            </span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }
            })()}

            {/* Route Creation Dialog */}
            <Dialog open={showRouteDialog} onOpenChange={handleCloseDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Novo Roteiro Personalizado</DialogTitle>
                        <DialogDescription>
                            Configure as informações básicas do roteiro de produção
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-6 py-4">
                            {/* Route Form */}

                            <TextInput
                                form={form}
                                name="name"
                                label="Nome do Roteiro"
                                placeholder="Ex: Roteiro de Montagem Principal"
                                required
                            />

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Descreva o processo de produção..."
                                    rows={4}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-600">{errors.description}</p>
                                )}
                            </div>



                            {/* Context Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Contexto da Ordem</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Ordem de Fabricação:</span>
                                            <span className="font-medium">{order.order_number}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Item:</span>
                                            <span className="font-medium">{order.item?.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Quantidade:</span>
                                            <span className="font-medium">{order.quantity} {order.unit_of_measure}</span>
                                        </div>
                                        {order.requested_date && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Data Solicitada:</span>
                                                <span className="font-medium">
                                                    {new Date(order.requested_date).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Após criar o roteiro, você será direcionado para configurar as etapas de produção.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </ScrollArea>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCloseDialog}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateRoute}
                            disabled={processing || !data.name}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Criar e Configurar Etapas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
} 