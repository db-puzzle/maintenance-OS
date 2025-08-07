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
    ChevronRight,
    GitBranch
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
import { ManufacturingRoute, ManufacturingStep, WorkCell } from '@/types/production';
import { Form } from '@/types/work-order';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import RouteBuilderCore from '@/components/production/RouteBuilderCore';
interface Props {
    routing: ManufacturingRoute;
    steps: ManufacturingStep[];
    canManage: boolean;
    canExecute: boolean;
    routingId: number;
    templates?: RouteTemplate[];
    workCells?: WorkCell[];
    stepTypes?: Record<string, string>;
    forms?: Form[];
    openRouteBuilder?: string | null;
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
type ViewMode = 'empty' | 'create' | 'builder' | 'viewer';
export default function RoutingStepsTab({
    routing,
    steps,
    canManage,
    canExecute,
    routingId,
    templates = [],
    workCells = [],
    stepTypes = {},
    forms = [],
    openRouteBuilder
}: Props) {
    const { props } = usePage();
    const flash = props.flash as any;
    // Check URL params from props
    const openRouteBuilderParam = openRouteBuilder || null;
    // Check if we should start in builder mode
    const shouldStartInBuilder = (!steps || steps.length === 0) ||
        flash?.openRouteBuilder ||
        openRouteBuilderParam === '1';
    // Determine the correct view mode
    const determineViewMode = (): ViewMode => {
        if (shouldStartInBuilder && canManage) return 'builder';
        if (steps && steps.length > 0) return 'viewer';
        return 'empty';
    };
    const initialViewMode = determineViewMode();
    const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
    const [selectedTemplate, setSelectedTemplate] = useState<RouteTemplate | null>(null);
    const [showRouteDialog, setShowRouteDialog] = useState(false);
    // Reset view mode when conditions change
    useEffect(() => {
        const correctMode = determineViewMode();
        if (viewMode !== correctMode) {
            setViewMode(correctMode);
        }
    }, [steps?.length, openRouteBuilderParam, flash?.openRouteBuilder]);
    // Clean up URL param after using it
    useEffect(() => {
        if (openRouteBuilderParam === '1' && routingId) {
            // Navigate to the same page without the query parameter
            router.visit(route('production.routing.show', { routing: routingId }), {
                preserveState: true,
                preserveScroll: true,
                replace: true
            });
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
        setData: (error: unknown) => setData(name as any, value),
        errors: errors as Partial<Record<string, string>>,
        clearErrors: (...fields: string[]) => clearErrors(...(fields as any)),
    };
    const handleCreateRoute = () => {
        post(route('production.routing.steps.from-template', routingId), {
            onSuccess: () => {
                toast.success('Etapas criadas com sucesso');
                setShowRouteDialog(false);
                reset();
                setSelectedTemplate(null);
            },
            onError: () => {
                toast.error('Erro ao criar etapas');
            }
        });
    };
    const handleTemplateSelect = (template: RouteTemplate) => {
        setSelectedTemplate(template);
        setData('template_id', template.id.toString());
        setData('name', `${template.name} - ${routing.name}`);
        setData('description', template.description || '');
    };
    const handleOpenCustomStepsDialog = () => {
        if (!canManage) {
            toast.error('Você não tem permissão para gerenciar etapas');
            return;
        }
        // If routing already has steps, go directly to builder
        if (steps && steps.length > 0) {
            setViewMode('builder');
            return;
        }
        // Otherwise, create empty steps structure and open builder
        router.post(route('production.routing.steps.initialize', routingId), {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Estrutura de etapas criada com sucesso');
                setViewMode('builder');
            },
            onError: (errors) => {
                if (typeof errors === 'object' && errors !== null) {
                    const errorMessages = Object.values(errors).flat();
                    if (errorMessages.length > 0) {
                        toast.error(errorMessages[0] as string);
                    } else {
                        toast.error('Erro ao criar estrutura de etapas.');
                    }
                } else if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error('Erro ao criar estrutura de etapas.');
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
    // Main content rendering
    return (
        <>
            {(() => {
                // Builder mode - show route builder inside the tab (edit mode)
                if (viewMode === 'builder') {
                    return (
                        <div className="h-[calc(100vh-12rem)]">
                            <RouteBuilderCore
                                routing={{
                                    id: routing.id || 0,
                                    manufacturing_order_id: routing.manufacturing_order_id,
                                    item_id: routing.item_id,
                                    route_template_id: routing.route_template_id,
                                    name: routing.name || '',
                                    description: routing.description,
                                    is_active: routing.is_active || false,
                                    created_by: routing.created_by,
                                    created_at: routing.created_at,
                                    updated_at: routing.updated_at,
                                    steps: steps || []
                                }}
                                workCells={workCells}
                                stepTypes={stepTypes}
                                forms={forms}
                                can={{
                                    manage_steps: canManage
                                }}
                                embedded={true}
                                onSave={() => {
                                    setViewMode('viewer');
                                    router.reload({ only: ['effectiveSteps'] });
                                }}
                                onCancel={() => setViewMode('viewer')}
                                viewMode={false}
                            />
                        </div>
                    );
                }
                // Viewer mode - show route builder in view-only mode
                if (viewMode === 'viewer' && steps && steps.length > 0) {
                    return (
                        <div className="h-[calc(100vh-12rem)]">
                            <RouteBuilderCore
                                routing={{
                                    id: routing.id || 0,
                                    manufacturing_order_id: routing.manufacturing_order_id,
                                    item_id: routing.item_id,
                                    route_template_id: routing.route_template_id,
                                    name: routing.name || '',
                                    description: routing.description,
                                    is_active: routing.is_active || false,
                                    created_by: routing.created_by,
                                    created_at: routing.created_at,
                                    updated_at: routing.updated_at,
                                    steps: steps || []
                                }}
                                workCells={workCells}
                                stepTypes={stepTypes}
                                forms={forms}
                                can={{
                                    manage_steps: canManage
                                }}
                                embedded={true}
                                onCancel={() => setViewMode('viewer')}
                                viewMode={true}
                                onEdit={() => setViewMode('builder')}
                            />
                        </div>
                    );
                }
                // Empty/Create state - no steps exist
                const canCreate = canManage;
                if (!steps || steps.length === 0) {
                    return (
                        <div className="flex min-h-[400px] items-center justify-center px-6 lg:px-8 py-6">
                            <div className="w-full">
                                <EmptyCard
                                    icon={Workflow}
                                    title="Nenhuma etapa definida"
                                    description={
                                        canCreate
                                            ? "Configure as etapas de produção para este roteiro"
                                            : "Nenhuma etapa foi configurada para este roteiro"
                                    }
                                    primaryButtonText={canCreate ? "Configurar Etapas" : undefined}
                                    primaryButtonAction={canCreate ? () => setViewMode('create') : undefined}
                                />
                                {!canManage && (
                                    <div className="mt-4">
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Você não tem permissão para gerenciar etapas deste roteiro.
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
                        <div className="space-y-6 px-6 lg:px-8 py-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Configurar Etapas do Roteiro</h3>
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
                                    <Card className="group cursor-pointer hover:border-ring hover:ring-ring/10 hover:bg-input-focus transition-[color,box-shadow,border-color,background-color]"
                                        onClick={() => setShowRouteDialog(true)}>
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
                                                    Configure rapidamente as etapas baseadas em templates pré-definidos
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    {/* Custom Steps Option */}
                                    <Card
                                        className="group cursor-pointer hover:border-ring hover:ring-ring/10 hover:bg-input-focus transition-[color,box-shadow,border-color,background-color]"
                                        onClick={handleOpenCustomStepsDialog}
                                    >
                                        <CardContent className="p-6 text-center">
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="p-4 bg-muted group-hover:bg-background rounded-full transition-colors">
                                                    <Plus className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-2">
                                                    <CardTitle className="text-lg">Etapas Customizadas</CardTitle>
                                                    <CardDescription className="text-sm font-medium">Criação manual</CardDescription>
                                                </div>
                                                <p className="text-sm text-muted-foreground text-center">
                                                    Configure manualmente cada etapa do processo produtivo
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
            {/* Template Selection Dialog */}
            <Dialog open={showRouteDialog} onOpenChange={handleCloseDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Configurar Etapas do Template</DialogTitle>
                        <DialogDescription>
                            Configure as etapas baseadas no template selecionado
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-6 py-4">
                            {selectedTemplate && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Template Selecionado</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Nome:</span>
                                                <span className="font-medium">{selectedTemplate.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Etapas:</span>
                                                <span className="font-medium">{selectedTemplate.steps_count}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Tempo Estimado:</span>
                                                <span className="font-medium">{formatTime(selectedTemplate.estimated_time)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    As etapas do template serão copiadas para este roteiro. Você poderá editá-las posteriormente.
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
                            disabled={processing || !selectedTemplate}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Criar Etapas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}