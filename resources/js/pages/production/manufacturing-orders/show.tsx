import React, { useState } from 'react';
import { Link, router, usePage, useForm } from '@inertiajs/react';
import {
    Package,
    GitBranch,
    AlertCircle,
    CheckCircle,
    Clock,
    Play,
    XCircle,
    FileText,
    QrCode,
    Ban,
    PlayCircle,
    TrendingUp,
    Percent,
    Check,
    Info,
    Save,
    ClipboardCheck,
    Calendar,
} from 'lucide-react';
import StackIcon from '@/components/stack-icon';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { TextInput } from '@/components/TextInput';
import { ItemSelect } from '@/components/ItemSelect';
import StateButton from '@/components/StateButton';
import ManufacturingOrderHierarchicalView, { ManufacturingOrderTreeNode } from '@/components/production/ManufacturingOrderHierarchicalView';
import ManufacturingOrderRouteTab from '@/components/production/ManufacturingOrderRouteTab';
import { ReportProductionDialog } from '@/components/production/ReportProductionDialog';
import { SaveAsTemplateDialog } from '@/components/production/templates/SaveAsTemplateDialog';
import { DirectExecution } from '@/components/production/templates/DirectExecution';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import { createFormAdapter } from '@/utils/form-adapters';
import { cn } from '@/lib/utils';
import { ManufacturingOrder, RouteTemplate, WorkCell, WorkUnitsBreakdown } from '@/types/production';
import { Form } from '@/types/work-order';
import type { BreadcrumbItem } from '@/types';

interface Props {
    order: ManufacturingOrder;
    canPlan?: boolean;
    canSchedule?: boolean;
    canRelease: boolean;
    canStart?: boolean;
    canHold?: boolean;
    canResume?: boolean;
    canCancel: boolean;
    canCreateRoute: boolean;
    canManageRoutes?: boolean;
    canReportProduction?: boolean;
    templates?: RouteTemplate[];
    workCells?: WorkCell[];
    stepTypes?: Record<string, string>;
    forms?: Form[];
    plants?: {
        id: number;
        name: string;
    }[];
    shifts?: {
        id: number;
        name: string;
    }[];
    manufacturers?: {
        id: number;
        name: string;
    }[];
}

// Helper Components
function FieldGroup({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            <div className="grid gap-4 md:grid-cols-4">
                {children}
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    className
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    className?: string;
}) {
    return (
        <div className="flex items-center gap-4 rounded-lg border p-4">
            <div className={cn("p-2 rounded-lg", className)}>
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );
}

function WorkUnitsBreakdownDisplay({
    breakdown,
    level = 0
}: {
    breakdown: WorkUnitsBreakdown;
    level?: number;
}) {
    const indent = level * 24;
    const progressPercentage = breakdown.expected_units > 0
        ? Math.round((breakdown.completed_units / breakdown.expected_units) * 100)
        : 0;

    return (
        <div className="space-y-2">
            <div style={{ marginLeft: `${indent}px` }} className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                        {breakdown.order_number}
                        {breakdown.step_count && (
                            <span className="text-muted-foreground ml-2">
                                ({breakdown.step_count} steps)
                            </span>
                        )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {breakdown.completed_units}/{breakdown.expected_units} units
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Progress value={progressPercentage} className="h-2 flex-1" />
                    <span className="text-xs font-medium w-12 text-right">{progressPercentage}%</span>
                </div>
            </div>
            {breakdown.children && breakdown.children.length > 0 && (
                <div className="border-l-2 border-muted ml-3">
                    {breakdown.children.map((child, index) => (
                        <WorkUnitsBreakdownDisplay key={index} breakdown={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Main Component
export default function ShowManufacturingOrder({
    order,
    canPlan = false,
    canSchedule = false,
    canRelease,
    canStart = false,
    canHold = false,
    canResume = false,
    canCancel,
    canCreateRoute,
    canManageRoutes: _canManageRoutes = false,
    canReportProduction = false,
    templates = [],
    workCells = [],
    stepTypes = {},
    forms = [],
    plants,
    shifts,
    manufacturers
}: Props) {
    const { props } = usePage();
    const flash = props.flash as { openRouteBuilder?: string | boolean; fromQrScan?: boolean } | undefined;

    // State
    const [generatingQr, setGeneratingQr] = useState(false);
    const [reportProductionOpen, setReportProductionOpen] = useState(false);
    const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);

    // Form setup
    const inertiaForm = useForm({
        order_number: order.order_number,
        item_id: order.item_id?.toString() || '',
        priority: order.priority,
        source_type: order.source_type || 'manual',
        source_reference: order.source_reference || '',
        quantity: order.quantity,
        unit_of_measure: order.unit_of_measure,
        requested_date: order.requested_date ? new Date(order.requested_date).toLocaleDateString() : '',
        planned_start_date: order.planned_start_date ? new Date(order.planned_start_date).toLocaleDateString() : '',
        actual_start_date: order.actual_start_date ? new Date(order.actual_start_date).toLocaleDateString() : '',
        actual_end_date: order.actual_end_date ? new Date(order.actual_end_date).toLocaleDateString() : '',
        status: order.status,
        bom_id: order.bill_of_material_id?.toString() || '',
    });

    const formAdapter = createFormAdapter({
        data: inertiaForm.data,
        setData: inertiaForm.setData,
        errors: inertiaForm.errors,
        clearErrors: inertiaForm.clearErrors
    });

    // Computed values
    const openRouteBuilderParam = props.openRouteBuilder || null;
    const simpleProgress = order.quantity > 0
        ? Math.round((order.quantity_completed / order.quantity) * 100)
        : 0;
    const smartProgress = order.smart_progress_percentage ?? simpleProgress;
    const hasChildren = order.child_orders_count > 0;
    const hasRoute = order.has_route || order.manufacturing_route;
    const shouldShowRelease = ['draft', 'planned', 'scheduled'].includes(order.status);

    // Breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/home' },
        { title: 'Ordens de Manufatura', href: '/production/orders' },
        { title: order.order_number, href: '' }
    ];

    // Helper functions
    const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case 'draft':
                return 'secondary';
            case 'planned':
            case 'scheduled':
                return 'outline';
            case 'released':
            case 'in_progress':
            case 'completed':
                return 'default';
            case 'on_hold':
                return 'secondary';
            case 'cancelled':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'draft':
                return <FileText className="h-4 w-4" />;
            case 'planned':
                return <Calendar className="h-4 w-4" />;
            case 'scheduled':
                return <Clock className="h-4 w-4" />;
            case 'released':
                return <Play className="h-4 w-4" />;
            case 'in_progress':
                return <PlayCircle className="h-4 w-4" />;
            case 'on_hold':
                return <Ban className="h-4 w-4" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    // Event handlers
    const handlePlan = () => {
        router.visit(window.route('production.planning.index', { selectedMO: order.id }));
    };

    const handleSchedule = () => {
        router.post(window.route('production.orders.schedule', order.id), {}, {
            onSuccess: () => {
                // Success handled by controller
            },
        });
    };

    const handleRelease = () => {
        router.post(window.route('production.orders.release', order.id), {}, {
            onSuccess: () => {
                // Success handled by controller
            },
        });
    };

    const handleStart = () => {
        router.post(window.route('production.orders.start', order.id), {}, {
            onSuccess: () => {
                // Success handled by controller
            },
        });
    };

    const handleHold = () => {
        const reason = prompt('Please provide a reason for putting this order on hold (optional):');
        router.post(window.route('production.orders.hold', order.id), {
            reason: reason || undefined
        }, {
            onSuccess: () => {
                // Success handled by controller
            },
        });
    };

    const handleResume = () => {
        router.post(window.route('production.orders.resume', order.id), {}, {
            onSuccess: () => {
                // Success handled by controller
            },
        });
    };

    const handleCancel = () => {
        if (confirm('Are you sure you want to cancel this order?')) {
            router.post(window.route('production.orders.cancel', order.id), {
                reason: 'Cancelled by user'
            });
        }
    };

    const handleGenerateQrTag = async () => {
        setGeneratingQr(true);
        try {
            const response = await axios.post(window.route('production.qr-tags.order', order.id));
            if (response.data.success && response.data.pdf_url) {
                window.open(response.data.pdf_url, '_blank');
                toast.success('Etiqueta QR gerada com sucesso!');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Erro ao gerar etiqueta QR');
            } else {
                toast.error('Erro ao gerar etiqueta QR');
            }
        } finally {
            setGeneratingQr(false);
        }
    };

    // Tab definitions
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            content: (
                <div className="space-y-6 py-6">
                    {flash?.fromQrScan && (
                        <Alert className="mb-4">
                            <QrCode className="h-4 w-4" />
                            <AlertDescription>
                                Scanned via QR code.
                                {order.has_route && order.manufacturing_route?.current_active_step && (
                                    <Link
                                        href={window.route('production.steps.execute', order.manufacturing_route.current_active_step.id)}
                                        className="ml-2 underline"
                                    >
                                        Go to current step
                                    </Link>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Quantities */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <StatCard
                                label="Ordered"
                                value={order.quantity}
                                icon={Package}
                                className="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                            />
                            <StatCard
                                label="Completed"
                                value={order.quantity_completed}
                                icon={CheckCircle}
                                className="bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                            />
                            <StatCard
                                label="Scrapped"
                                value={order.quantity_scrapped}
                                icon={XCircle}
                                className="bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                            />
                        </div>
                    </div>

                    {/* Direct Production Reporting */}
                    {canReportProduction &&
                        ['released', 'in_progress'].includes(order.status) &&
                        (!order.has_route || (order.manufacturing_route && (!order.manufacturing_route.steps || order.manufacturing_route.steps.length === 0))) && (
                            <>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Direct Production Reporting</h3>
                                    <div className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">Report Production</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Report production quantities directly without route steps
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => setReportProductionOpen(true)}
                                                variant="default"
                                                className="gap-2"
                                            >
                                                <ClipboardCheck className="h-4 w-4" />
                                                Report Production
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <Separator />
                            </>
                        )}

                    {/* Order Information */}
                    <FieldGroup>
                        <TextInput
                            form={formAdapter}
                            name="order_number"
                            label="Order Number"
                            placeholder="Order Number"
                            view={true}
                        />
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Priority</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                <span className={cn(
                                    "font-medium",
                                    order.priority >= 80 && "text-red-600",
                                    order.priority >= 60 && order.priority < 80 && "text-orange-600",
                                    order.priority >= 40 && order.priority < 60 && "text-yellow-600",
                                    order.priority < 40 && "text-gray-600"
                                )}>
                                    {order.priority}
                                </span>
                            </div>
                        </div>
                        <ItemSelect
                            label="Razão da Ordem"
                            items={[
                                { id: 'manual', name: 'Manual' },
                                { id: 'sales_order', name: 'Sales Order' },
                                { id: 'forecast', name: 'Forecast' },
                            ]}
                            value={String(formAdapter.data.source_type || 'manual')}
                            onValueChange={() => { }}
                            view={true}
                        />
                        <TextInput
                            form={formAdapter}
                            name="source_reference"
                            label="Reference"
                            placeholder="No reference"
                            view={true}
                        />
                        {order.parent_id && (
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Parent Order</label>
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    <Link
                                        href={window.route('production.orders.show', order.parent_id)}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {order.parent?.order_number}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </FieldGroup>

                    {/* Item Details */}
                    <FieldGroup>
                        <div className="md:col-span-4 lg:col-span-1">
                            <label className="text-sm font-medium mb-2 block">Item Image</label>
                            <ItemImagePreview
                                primaryImageUrl={order.item?.primary_image_url}
                                primaryImageData={order.item?.primary_image_data}
                                imageCount={order.item?.primary_image_url ? 1 : 0}
                                className="w-24 h-24 cursor-pointer"
                                onClick={(e) => {
                                    e?.stopPropagation();
                                    if (order.item?.id) {
                                        router.visit(window.route('production.items.show', order.item.id));
                                    }
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Item Number</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {order.item ? (
                                    <Link
                                        href={window.route('production.items.show', order.item.id)}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {order.item.item_number}
                                    </Link>
                                ) : '—'}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Item Name</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {order.item?.name || '—'}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Category</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {typeof order.item?.category === 'string' ? order.item.category : order.item?.category?.name || '—'}
                            </div>
                        </div>
                        <TextInput
                            form={formAdapter}
                            name="unit_of_measure"
                            label="Unit of Measure"
                            placeholder="—"
                            view={true}
                        />
                        {order.bill_of_material_id && (
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">BOM</label>
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    <Link
                                        href={window.route('production.bom.show', order.bill_of_material_id)}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {order.bill_of_material?.bom_number}
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </FieldGroup>

                    {/* Schedule */}
                    <FieldGroup>
                        <TextInput
                            form={formAdapter}
                            name="requested_date"
                            label="Requested Date"
                            placeholder="Not set"
                            view={true}
                        />
                        <TextInput
                            form={formAdapter}
                            name="planned_start_date"
                            label="Planned Start"
                            placeholder="Not set"
                            view={true}
                        />
                        <TextInput
                            form={formAdapter}
                            name="actual_start_date"
                            label="Actual Start"
                            placeholder="Not set"
                            view={true}
                        />
                        <TextInput
                            form={formAdapter}
                            name="actual_end_date"
                            label="Actual End"
                            placeholder="Not set"
                            view={true}
                        />
                    </FieldGroup>

                    {/* Parent-Child Info */}
                    {(order.parent_id || order.child_orders_count > 0 || (order.children && order.children.length > 0)) && (
                        <>
                            <Separator />
                            <div className="space-y-4">
                                {order.parent_id && (
                                    <Alert>
                                        <GitBranch className="h-4 w-4" />
                                        <AlertDescription>
                                            This is a child order of{' '}
                                            <Link
                                                href={window.route('production.orders.show', order.parent_id)}
                                                className="font-medium text-primary hover:underline"
                                            >
                                                {order.parent?.order_number}
                                            </Link>
                                        </AlertDescription>
                                    </Alert>
                                )}
                                {(order.child_orders_count > 0 || (order.children && order.children.length > 0)) && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">Child Orders</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {order.completed_child_orders_count || 0} of {order.child_orders_count || (order.children?.length || 0)} completed
                                                </p>
                                            </div>
                                        </div>
                                        {order.auto_complete_on_children && (
                                            <Alert>
                                                <CheckCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    This order will auto-complete when all child orders are finished
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )
        },
        {
            id: 'progress',
            label: 'Progress',
            content: (
                <div className="space-y-6 py-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        Progresso Geral
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Tracks work units across all steps and child orders</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </h3>

                    {/* Progress Overview */}
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Progress value={smartProgress} className="h-4 flex-1" />
                                <span className="text-sm font-medium w-12 text-right">{Math.round(smartProgress)}%</span>
                            </div>
                            {order.progress_calculated_at && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Progress updated {new Date(order.progress_calculated_at).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Work Units Breakdown */}
                    {order.work_units_breakdown && (hasChildren || hasRoute) ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                Work Units Breakdown
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Each unit passing through each step counts as one work unit</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </h3>
                            <WorkUnitsBreakdownDisplay breakdown={order.work_units_breakdown} />
                        </div>
                    ) : (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                {!hasRoute && !hasChildren
                                    ? "This order has no manufacturing route or child orders. Progress is based on quantity completed."
                                    : "Work units breakdown is not available for this order."}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Progress Statistics */}
                    <Separator />
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Progress Statistics</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="border rounded-lg p-4">
                                <p className="text-sm text-muted-foreground">Total Expected Work Units</p>
                                <p className="text-2xl font-bold">
                                    {order.work_units_breakdown?.expected_units || order.quantity}
                                </p>
                            </div>
                            <div className="border rounded-lg p-4">
                                <p className="text-sm text-muted-foreground">Completed Work Units</p>
                                <p className="text-2xl font-bold">
                                    {order.work_units_breakdown?.completed_units || order.quantity_completed}
                                </p>
                            </div>
                            <div className="border rounded-lg p-4">
                                <p className="text-sm text-muted-foreground">Remaining Work Units</p>
                                <p className="text-2xl font-bold">
                                    {(order.work_units_breakdown?.expected_units || order.quantity) -
                                        (order.work_units_breakdown?.completed_units || order.quantity_completed)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        ...(order.bill_of_material_id ? [
            {
                id: 'dependencies',
                label: 'Dependências',
                content: (
                    <div className="space-y-6 py-6">
                        <h3 className="text-lg font-semibold">Parent-Child Dependencies</h3>

                        {/* BOM Information */}
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Esta ordem está usando a BOM{' '}
                                <Link
                                    href={window.route('production.bom.show', order.bill_of_material_id)}
                                    className="font-medium text-primary hover:underline"
                                >
                                    {order.bill_of_material?.bom_number}
                                </Link>
                            </AlertDescription>
                        </Alert>

                        {/* Release Dependencies */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-2">Release Configuration</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Configure quando a ordem pai pode ser liberada para produção.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <StateButton
                                        icon={PlayCircle}
                                        title="A Qualquer Momento"
                                        description="A ordem pai pode ser liberada mesmo se as ordens filhas não estiverem prontas"
                                        selected={order.can_release_before_children !== false}
                                        onClick={() => { }}
                                        disabled={true}
                                    />
                                    <StateButton
                                        icon={Ban}
                                        title="Após Ordens Filhas"
                                        description="A ordem pai deve esperar pelas ordens filhas serem liberadas antes de ser liberada"
                                        selected={order.can_release_before_children === false}
                                        onClick={() => { }}
                                        disabled={true}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Production Dependencies */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-2">Production Start Dependencies</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Configure quando a ordem pai pode começar a ser produzida com base no progresso das ordens filhas.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <StateButton
                                        icon={PlayCircle}
                                        title="Todas as Ordens Filhas Completas"
                                        description="A ordem pai só pode iniciar após todas as ordens filhas serem concluídas"
                                        selected={order.dependency_type === 'all_children_released'}
                                        onClick={() => { }}
                                        disabled={true}
                                    />
                                    <StateButton
                                        icon={Ban}
                                        title="Sem Dependências"
                                        description="A ordem pai pode começar a qualquer momento, independentemente das ordens filhas"
                                        selected={order.dependency_type === 'none' || !order.dependency_type}
                                        onClick={() => { }}
                                        disabled={true}
                                    />
                                    <StateButton
                                        icon={TrendingUp}
                                        title="Baseado em Quantidade"
                                        description="A ordem pai só pode iniciar após as ordens filhas concluírem uma quantidade específica"
                                        selected={order.dependency_type === 'children_quantity'}
                                        onClick={() => { }}
                                        disabled={true}
                                    />
                                    <StateButton
                                        icon={Percent}
                                        title="Baseado em Porcentagem"
                                        description="A ordem pai só pode iniciar após as ordens filhas concluírem uma porcentagem específica de sua quantidade total"
                                        selected={order.dependency_type === 'children_percentage'}
                                        onClick={() => { }}
                                        disabled={true}
                                    />
                                </div>

                                {/* Quantity Configuration */}
                                {order.dependency_type === 'children_quantity' && (
                                    <div className="mt-6 p-4 rounded-lg border bg-muted/50">
                                        <label className="text-sm font-medium">Quantidade Mínima Requerida</label>
                                        <div className="mt-2">
                                            <span className="text-lg font-semibold">{order.dependency_minimum_quantity || 0}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Total de unidades que devem ser concluídas em todas as ordens filhas
                                        </p>
                                    </div>
                                )}

                                {/* Percentage Configuration */}
                                {order.dependency_type === 'children_percentage' && (
                                    <div className="mt-6 p-4 rounded-lg border bg-muted/50">
                                        <label className="text-sm font-medium">Porcentagem Mínima Requerida</label>
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <Progress value={order.dependency_minimum_percentage || 0} className="h-2 flex-1" />
                                                <span className="font-medium">{order.dependency_minimum_percentage || 0}%</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Porcentagem de quantidade produzida por cada uma das ordens filhas
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Auto-Complete Configuration */}
                        {(order.child_orders_count > 0 || order.bill_of_material_id) && (
                            <div className="space-y-4">
                                <h4 className="font-medium mb-3">Conclusão da Ordem</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <StateButton
                                        icon={Check}
                                        title="Concluir Automaticamente"
                                        description="A ordem será automaticamente concluída quando todas as ordens filhas forem concluídas"
                                        selected={order.auto_complete_on_children === true && !order.has_route}
                                        onClick={() => { }}
                                        disabled={true}
                                    />
                                    <StateButton
                                        icon={Ban}
                                        title="Concluir Manualmente"
                                        description={order.has_route
                                            ? "A ordem será concluída quando todas as etapas de roteamento forem completadas"
                                            : "A ordem precisará ser concluída manualmente, mesmo após todas as ordens filhas serem concluídas"}
                                        selected={order.auto_complete_on_children === false || order.has_route || false}
                                        onClick={() => { }}
                                        disabled={true}
                                    />
                                </div>

                                {order.has_route && order.manufacturing_route?.steps && order.manufacturing_route.steps.length > 0 && (
                                    <Alert className="mt-4">
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            Esta ordem possui etapas de roteamento. A conclusão automática foi desabilitada e a ordem será concluída quando todas as etapas forem completadas.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {!order.has_route && order.auto_complete_on_children === true && (
                                    <Alert className="mt-4">
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            Se etapas de roteamento forem adicionadas posteriormente, a conclusão automática será desabilitada.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        {order.child_orders_count === 0 && !order.bill_of_material_id && (
                            <div className="space-y-4">
                                <h4 className="font-medium mb-3">Conclusão da Ordem</h4>
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Esta ordem não possui ordens filhas e deve ser concluída manualmente ou através de etapas de roteamento.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </div>
                )
            }
        ] : []),
        ...((order.child_orders_count > 0 || (order.children && order.children.length > 0)) ? [{
            id: 'children',
            label: 'Child Orders',
            content: (
                <ManufacturingOrderHierarchicalView
                    orders={[{
                        ...order,
                        children: order.children || []
                    } as ManufacturingOrderTreeNode]}
                    showActions={false}
                    routeTemplates={templates}
                />
            )
        }] : []),
        {
            id: 'routes',
            label: 'Routes & Steps',
            fullWidth: true,
            content: (
                <div className="space-y-4">
                    {order.manufacturing_route && order.manufacturing_route.steps && order.manufacturing_route.steps.length > 0 && (
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold">{order.manufacturing_route.name}</h3>
                                {order.manufacturing_route.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {order.manufacturing_route.description}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSaveAsTemplateOpen(true)}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Save as Template
                            </Button>
                        </div>
                    )}

                    {order.has_route && (!order.manufacturing_route?.steps || !order.manufacturing_route.steps.length) && (
                        <DirectExecution order={order} />
                    )}

                    {(!order.has_route || (order.manufacturing_route?.steps && order.manufacturing_route.steps.length > 0)) && (
                        <ManufacturingOrderRouteTab
                            order={order}
                            canCreateRoute={canCreateRoute}
                            templates={templates}
                            workCells={workCells}
                            stepTypes={stepTypes}
                            forms={forms}
                            plants={plants}
                            shifts={shifts}
                            manufacturers={manufacturers}
                            openRouteBuilder={openRouteBuilderParam as string | null | undefined}
                        />
                    )}
                </div>
            )
        },
        {
            id: 'history',
            label: 'History',
            content: (
                <div className="space-y-4 py-6">
                    <h3 className="text-lg font-semibold">Order History</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                            <div>
                                <p className="font-medium">Order Created</p>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(order.created_at).toLocaleString()}
                                    {order.created_by_user && ` by ${order.created_by_user.name}`}
                                </p>
                            </div>
                        </div>
                        {order.actual_start_date && (
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                                <div>
                                    <p className="font-medium">Production Started</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(order.actual_start_date).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}
                        {order.actual_end_date && (
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                                <div>
                                    <p className="font-medium">Production Completed</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(order.actual_end_date).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
        }
    ];

    // Subtitle
    const subtitle = (
        <>
            <span>{order.item?.name || 'Manufacturing Order'}</span>
            {' '}
            <Badge variant={getStatusBadgeVariant(order.status)} className="ml-2">
                {getStatusIcon(order.status)}
                <span className="ml-1">{order.status}</span>
            </Badge>
        </>
    );

    // Header actions
    const headerActions = (
        <TooltipProvider>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateQrTag}
                    disabled={generatingQr}
                >
                    <QrCode className="h-4 w-4 mr-2" />
                    {generatingQr ? 'Gerando...' : 'Gerar QR'}
                </Button>

                {shouldShowRelease && canRelease && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={0}>
                                <Button
                                    onClick={handleRelease}
                                    disabled={!canRelease}
                                    variant="outline"
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    Release
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{order.status === 'draft' ? 'Direct release to production floor' : 'Release scheduled order to production'}</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {order.status === 'draft' && canPlan && hasRoute && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={0}>
                                <Button
                                    onClick={handlePlan}
                                >
                                    <StackIcon className="h-4 w-4 mr-2" />
                                    Plan
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Move to planned status (requires route with work cells)</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {order.status === 'planned' && canSchedule && (
                    <Button
                        onClick={handleSchedule}
                        variant="outline"
                    >
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule
                    </Button>
                )}

                {order.status === 'released' && canStart && (
                    <Button
                        onClick={handleStart}
                        variant="default"
                    >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Production
                    </Button>
                )}

                {order.status === 'in_progress' && canHold && (
                    <Button
                        onClick={handleHold}
                        variant="outline"
                    >
                        <Ban className="h-4 w-4 mr-2" />
                        Hold
                    </Button>
                )}

                {order.status === 'on_hold' && canResume && (
                    <Button
                        onClick={handleResume}
                        variant="default"
                    >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Resume
                    </Button>
                )}

                {canCancel && (
                    <Button variant="destructive" onClick={handleCancel}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                )}
            </div>
        </TooltipProvider>
    );

    return (
        <>
            <AppLayout breadcrumbs={breadcrumbs} enableCompressedMode={true}>
                <ShowLayout
                    title={order.order_number}
                    subtitle={subtitle}
                    editRoute=""
                    tabs={tabs}
                    defaultActiveTab={(flash?.openRouteBuilder || openRouteBuilderParam === '1') ? "routes" : "overview"}
                    actions={headerActions}
                    showEditButton={false}
                />
            </AppLayout>

            <ReportProductionDialog
                order={order}
                open={reportProductionOpen}
                onOpenChange={setReportProductionOpen}
            />

            {order.manufacturing_route && (
                <SaveAsTemplateDialog
                    manufacturingRoute={order.manufacturing_route}
                    open={saveAsTemplateOpen}
                    onOpenChange={setSaveAsTemplateOpen}
                />
            )}
        </>
    );
}
