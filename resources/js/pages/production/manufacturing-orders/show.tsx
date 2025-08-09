import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { router, usePage } from '@inertiajs/react';
import {
    Package,
    Calendar,
    GitBranch,
    AlertCircle,
    CheckCircle,
    Clock,
    Play,
    XCircle,
    FileText,
    QrCode
} from 'lucide-react';
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
import { ManufacturingOrder, RouteTemplate, WorkCell } from '@/types/production';
import { Form } from '@/types/work-order';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import HierarchicalConfiguration from '@/components/production/HierarchicalConfiguration';
import ManufacturingOrderRouteTab from '@/components/production/ManufacturingOrderRouteTab';
import axios from 'axios';
import { toast } from 'sonner';
interface Props {
    order: ManufacturingOrder;
    canRelease: boolean;
    canCancel: boolean;
    canCreateRoute: boolean;
    canManageRoutes?: boolean;
    templates?: RouteTemplate[]; // Route templates for creating new routes
    workCells?: WorkCell[];
    stepTypes?: Record<string, string>;
    forms?: Form[];
}
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
function StatCard({ label, value, icon: Icon, className }: { label: string; value: string | number; icon: React.ElementType; className?: string }) {
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
export default function ShowManufacturingOrder({ order, canRelease, canCancel, canCreateRoute, canManageRoutes = false, templates = [], workCells = [], stepTypes = {}, forms = [] }: Props) {
    const { props } = usePage();
    const flash = props.flash as { openRouteBuilder?: string | boolean } | undefined;
    const [generatingQr, setGeneratingQr] = useState(false);
    // Check URL params - passed from backend
    const openRouteBuilderParam = props.openRouteBuilder || null;
    // Create a form instance for view-only display
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
    // Create a wrapper that matches the TextInput interface
    const form = {
        data: inertiaForm.data as any,
        setData: (name: string, value: unknown) => inertiaForm.setData(name as any, value),
        errors: inertiaForm.errors as Partial<Record<string, string>>,
        clearErrors: (...fields: string[]) => inertiaForm.clearErrors(...fields as any),
    };
    const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case 'draft':
                return 'secondary';
            case 'planned':
                return 'outline';
            case 'released':
            case 'in_progress':
            case 'completed':
                return 'default';
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
            case 'released':
                return <Play className="h-4 w-4" />;
            case 'in_progress':
                return <Clock className="h-4 w-4" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };
    const progress = order.quantity > 0
        ? Math.round((order.quantity_completed / order.quantity) * 100)
        : 0;
    const breadcrumbs = [
        { title: 'Production', href: '/production' },
        { title: 'Manufacturing Orders', href: '/production/orders' },
        { title: order.order_number, href: '' }
    ];
    const handleRelease = () => {
        router.post(route('production.orders.release', order.id), {}, {
            onSuccess: () => {
                // Success handled by controller
            },
        });
    };
    const handleCancel = () => {
        if (confirm('Are you sure you want to cancel this order?')) {
            router.post(route('production.orders.cancel', order.id), {
                reason: 'Cancelled by user'
            });
        }
    };
    const handleGenerateQrTag = async () => {
        setGeneratingQr(true);
        try {
            const response = await axios.post(route('production.qr-tags.order', order.id));
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
                    {/* Progress Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Order Progress</h3>
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
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Overall Completion</span>
                                    <span className="font-medium">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-3" />
                            </div>
                        </div>
                    </div>
                    <Separator />
                    {/* Order Information */}
                    <FieldGroup>
                        <TextInput
                            form={form}
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
                            label="Source Type"
                            items={[
                                { id: 1, name: 'Manual', value: 'manual' },
                                { id: 2, name: 'Sales Order', value: 'sales_order' },
                                { id: 3, name: 'Forecast', value: 'forecast' },
                            ]}
                            value={form.data.source_type}
                            onValueChange={() => { }}
                            view={true}
                        />
                        <TextInput
                            form={form}
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
                                        href={route('production.orders.show', order.parent_id)}
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
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Item Number</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {order.item?.item_number || '—'}
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
                            form={form}
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
                                        href={route('production.bom.show', order.bill_of_material_id)}
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
                            form={form}
                            name="requested_date"
                            label="Requested Date"
                            placeholder="Not set"
                            view={true}
                        />
                        <TextInput
                            form={form}
                            name="planned_start_date"
                            label="Planned Start"
                            placeholder="Not set"
                            view={true}
                        />
                        <TextInput
                            form={form}
                            name="actual_start_date"
                            label="Actual Start"
                            placeholder="Not set"
                            view={true}
                        />
                        <TextInput
                            form={form}
                            name="actual_end_date"
                            label="Actual End"
                            placeholder="Not set"
                            view={true}
                        />
                    </FieldGroup>
                    {/* Parent-Child Configuration */}
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
                                                href={route('production.orders.show', order.parent_id)}
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
                                            {/* View All button temporarily disabled - route not implemented yet */}
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
        ...((order.child_orders_count > 0 || (order.children && order.children.length > 0)) ? [{
            id: 'children',
            label: `Child Orders (${order.child_orders_count || (order.children?.length || 0)})`,
            content: (
                <div className="h-[calc(100vh-300px)]">
                    {/* Show current order as root of the tree */}
                    <HierarchicalConfiguration
                        type="manufacturing-order"
                        orders={[{
                            ...order,
                            children: order.children || []
                        }]}
                        showActions={false}
                        canEdit={false}
                        routeTemplates={templates}
                        canManageRoutes={canManageRoutes}
                    />
                </div>
            )
        }] : []),
        {
            id: 'routes',
            label: 'Routes & Steps',
            fullWidth: true,
            content: (
                <ManufacturingOrderRouteTab
                    order={order}
                    canCreateRoute={canCreateRoute}
                    templates={templates}
                    workCells={workCells}
                    stepTypes={stepTypes}
                    forms={forms}
                    openRouteBuilder={openRouteBuilderParam as string | null | undefined}
                />
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
    // Check if order has a route
    const hasRoute = (order as ManufacturingOrder).has_route || (order.manufacturing_route && order.manufacturing_route.steps && order.manufacturing_route.steps.length > 0);
    const shouldShowRelease = ['draft', 'planned'].includes(order.status);
    // Additional actions for the header
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
                {shouldShowRelease && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={0}>
                                <Button
                                    onClick={handleRelease}
                                    disabled={!canRelease || !hasRoute}
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    Release
                                </Button>
                            </span>
                        </TooltipTrigger>
                        {!hasRoute && (
                            <TooltipContent>
                                <p>Configure a manufacturing route before releasing</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <ShowLayout
                title={order.order_number}
                subtitle={subtitle}
                tabs={tabs}
                defaultActiveTab={(flash?.openRouteBuilder || openRouteBuilderParam === '1') ? "routes" : "overview"}
                actions={headerActions}
                showEditButton={false}
            />
        </AppLayout>
    );
} 