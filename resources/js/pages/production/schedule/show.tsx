import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Factory, Play, Pause, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { type BreadcrumbItem } from '@/types';
import { TextInput } from '@/components/TextInput';
import { ItemSelect } from '@/components/ItemSelect';
import { Separator } from '@/components/ui/separator';
import { useForm } from '@inertiajs/react';
import { cn } from '@/lib/utils';
// Field group component for consistent layout
function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="grid gap-4 md:grid-cols-2">{children}</div>
        </div>
    );
}
// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;
interface ManufacturingStep {
    id: number;
    step_number: number;
    step_type: 'standard' | 'quality_check' | 'rework';
    name: string;
    description: string | null;
    work_cell_id: number | null;
    status: 'pending' | 'queued' | 'in_progress' | 'on_hold' | 'completed' | 'skipped';
    setup_time_minutes: number;
    cycle_time_minutes: number;
    actual_start_time: string | null;
    actual_end_time: string | null;
    manufacturing_route: {
        id: number;
        name: string;
        manufacturing_order: {
            id: number;
            order_number: string;
            quantity: number;
            status: string;
            item: {
                id: number;
                item_number: string;
                name: string;
            };
        };
        item: {
            id: number;
            item_number: string;
            name: string;
        };
    };
    work_cell: {
        id: number;
        name: string;
    } | null;
    executions?: Array<{
        id: number;
        quantity_completed: number;
        quantity_scrapped: number;
        notes: string | null;
        executed_by: {
            id: number;
            name: string;
        };
        created_at: string;
    }>;
}
interface Props {
    schedule: ManufacturingStep;
}
export default function ProductionScheduleShow({ schedule }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Production',
            href: '/production',
        },
        {
            title: 'Schedule',
            href: '/production/schedules',
        },
        {
            title: `Step #${schedule.step_number}`,
            href: '#',
        },
    ];
    // Initialize form with schedule data
    const inertiaForm = useForm({
        step_type: schedule.step_type,
        name: schedule.name,
        description: schedule.description || '',
        work_cell_id: schedule.work_cell_id?.toString() || '',
        setup_time_minutes: schedule.setup_time_minutes,
        cycle_time_minutes: schedule.cycle_time_minutes,
        status: schedule.status,
        actual_start_time: schedule.actual_start_time || '',
        actual_end_time: schedule.actual_end_time || '',
    });
    // Create a wrapper that matches the TextInput interface
    const form = {
        data: inertiaForm.data as Record<string, string | number | boolean | File | null | undefined>,
        setData: (name: string, value: string | number | boolean | File | null | undefined) => {
            // Handle the type conversion for Inertia's setData
            const fieldName = name as keyof typeof inertiaForm.data;
            if (typeof value === 'string' || typeof value === 'number') {
                inertiaForm.setData(fieldName, value as string | number);
            } else if (value === null || value === undefined) {
                inertiaForm.setData(fieldName, '');
            } else {
                // For other types, convert to string
                inertiaForm.setData(fieldName, String(value));
            }
        },
        errors: inertiaForm.errors as Partial<Record<string, string>>,
        clearErrors: (...fields: string[]) => inertiaForm.clearErrors(...(fields as Array<keyof typeof inertiaForm.data>)),
    };
    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'outline',
            queued: 'secondary',
            in_progress: 'default',
            on_hold: 'destructive',
            completed: 'outline',
            skipped: 'destructive',
        };
        const colors: Record<string, string> = {
            pending: 'text-gray-600',
            queued: 'text-blue-600',
            in_progress: 'text-yellow-600',
            on_hold: 'text-orange-600',
            completed: 'text-green-600',
            skipped: 'text-red-600',
        };
        const labels: Record<string, string> = {
            pending: 'Pending',
            queued: 'Queued',
            in_progress: 'In Progress',
            on_hold: 'On Hold',
            completed: 'Completed',
            skipped: 'Skipped',
        };
        return (
            <Badge variant={variants[status] || 'default'} className={colors[status]}>
                {labels[status] || status}
            </Badge>
        );
    };
    const getStepTypeIcon = (type: string) => {
        switch (type) {
            case 'quality_check':
                return <CheckCircle className="h-4 w-4 text-blue-500" />;
            case 'rework':
                return <XCircle className="h-4 w-4 text-orange-500" />;
            default:
                return <Factory className="h-4 w-4 text-gray-500" />;
        }
    };
    const handleAction = (action: string, scheduleId: number) => {
        const routes: Record<string, string> = {
            start: route('production.schedules.start', { schedule: scheduleId }),
            complete: route('production.schedules.complete', { schedule: scheduleId }),
            hold: route('production.schedules.hold', { schedule: scheduleId }),
            resume: route('production.schedules.resume', { schedule: scheduleId }),
        };
        if (routes[action]) {
            if (action === 'complete' || action === 'hold') {
                router.visit(routes[action]);
            } else {
                router.post(routes[action]);
            }
        }
    };
    const tabs = [
        {
            id: 'details',
            label: 'Step Details',
            content: (
                <div className="space-y-6 py-6">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-4">
                        <div className="flex items-center gap-3">
                            {getStepTypeIcon(schedule.step_type)}
                            <div>
                                <p className="text-sm text-muted-foreground">Current Status</p>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(schedule.status)}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {schedule.status === 'pending' || schedule.status === 'queued' ? (
                                <Button onClick={() => handleAction('start', schedule.id)}>
                                    <Play className="mr-2 h-4 w-4" />
                                    Start Production
                                </Button>
                            ) : schedule.status === 'in_progress' ? (
                                <>
                                    <Button variant="default" onClick={() => handleAction('complete', schedule.id)}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Complete
                                    </Button>
                                    <Button variant="secondary" onClick={() => handleAction('hold', schedule.id)}>
                                        <Pause className="mr-2 h-4 w-4" />
                                        Put on Hold
                                    </Button>
                                </>
                            ) : schedule.status === 'on_hold' ? (
                                <Button onClick={() => handleAction('resume', schedule.id)}>
                                    <Play className="mr-2 h-4 w-4" />
                                    Resume
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Separator />
                    {/* Step Information */}
                    <FieldGroup title="Step Information">
                        <TextInput
                            form={form}
                            name="name"
                            label="Step Name"
                            placeholder="Step name"
                            view={true}
                        />
                        <ItemSelect
                            label="Step Type"
                            items={[
                                { id: 1, name: 'Standard', value: 'standard' },
                                { id: 2, name: 'Quality Check', value: 'quality_check' },
                                { id: 3, name: 'Rework', value: 'rework' },
                            ]}
                            value={schedule.step_type}
                            onValueChange={() => { }}
                            view={true}
                        />
                        <div className="md:col-span-2">
                            <TextInput
                                form={form}
                                name="description"
                                label="Description"
                                placeholder="No description"
                                view={true}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Work Cell</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {schedule.work_cell ? schedule.work_cell.name : 'Not assigned'}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Step Number</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                #{schedule.step_number}
                            </div>
                        </div>
                    </FieldGroup>
                    <Separator />
                    {/* Time Information */}
                    <FieldGroup title="Time Information">
                        <TextInput
                            form={form}
                            name="setup_time_minutes"
                            label="Setup Time (minutes)"
                            placeholder="0"
                            view={true}
                        />
                        <TextInput
                            form={form}
                            name="cycle_time_minutes"
                            label="Cycle Time (minutes)"
                            placeholder="0"
                            view={true}
                        />
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Total Cycle Time</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {schedule.cycle_time_minutes * schedule.manufacturing_route.manufacturing_order.quantity} minutes
                                <span className="text-muted-foreground ml-2">
                                    ({schedule.cycle_time_minutes} min × {schedule.manufacturing_route.manufacturing_order.quantity} units)
                                </span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Total Time</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm font-semibold">
                                {schedule.setup_time_minutes + (schedule.cycle_time_minutes * schedule.manufacturing_route.manufacturing_order.quantity)} minutes
                            </div>
                        </div>
                    </FieldGroup>
                    <Separator />
                    {/* Actual Times */}
                    <FieldGroup title="Actual Times">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Started At</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {schedule.actual_start_time
                                    ? format(new Date(schedule.actual_start_time), 'PPp')
                                    : 'Not started'}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Completed At</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {schedule.actual_end_time
                                    ? format(new Date(schedule.actual_end_time), 'PPp')
                                    : 'Not completed'}
                            </div>
                        </div>
                        {schedule.actual_start_time && schedule.actual_end_time && (
                            <>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Actual Duration</label>
                                    <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                        {Math.round(
                                            (new Date(schedule.actual_end_time).getTime() -
                                                new Date(schedule.actual_start_time).getTime()) /
                                            60000
                                        )}{' '}
                                        minutes
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Efficiency</label>
                                    <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                        <span className={cn(
                                            "font-medium",
                                            Math.round(
                                                ((schedule.setup_time_minutes + (schedule.cycle_time_minutes * schedule.manufacturing_route.manufacturing_order.quantity)) /
                                                    Math.round(
                                                        (new Date(schedule.actual_end_time).getTime() -
                                                            new Date(schedule.actual_start_time).getTime()) /
                                                        60000
                                                    )) * 100
                                            ) >= 90 ? "text-green-600" :
                                                Math.round(
                                                    ((schedule.setup_time_minutes + (schedule.cycle_time_minutes * schedule.manufacturing_route.manufacturing_order.quantity)) /
                                                        Math.round(
                                                            (new Date(schedule.actual_end_time).getTime() -
                                                                new Date(schedule.actual_start_time).getTime()) /
                                                            60000
                                                        )) * 100
                                                ) >= 70 ? "text-yellow-600" : "text-red-600"
                                        )}>
                                            {Math.round(
                                                ((schedule.setup_time_minutes + (schedule.cycle_time_minutes * schedule.manufacturing_route.manufacturing_order.quantity)) /
                                                    Math.round(
                                                        (new Date(schedule.actual_end_time).getTime() -
                                                            new Date(schedule.actual_start_time).getTime()) /
                                                        60000
                                                    )) * 100
                                            )}%
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </FieldGroup>
                </div>
            ),
        },
        {
            id: 'order',
            label: 'Manufacturing Order',
            content: (
                <div className="space-y-6 py-6">
                    <FieldGroup title="Order Information">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Order Number</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                <Link
                                    href={route('production.orders.show', { order: schedule.manufacturing_route.manufacturing_order.id })}
                                    className="font-medium text-primary hover:underline"
                                >
                                    {schedule.manufacturing_route.manufacturing_order.order_number}
                                </Link>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Status</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm capitalize">
                                {schedule.manufacturing_route.manufacturing_order.status}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Quantity</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {schedule.manufacturing_route.manufacturing_order.quantity} units
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Route</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {schedule.manufacturing_route.name}
                            </div>
                        </div>
                    </FieldGroup>
                    <Separator />
                    <FieldGroup title="Item Information">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Item Number</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {schedule.manufacturing_route.manufacturing_order.item.item_number}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Item Name</label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {schedule.manufacturing_route.manufacturing_order.item.name}
                            </div>
                        </div>
                    </FieldGroup>
                </div>
            ),
        },
        {
            id: 'history',
            label: 'Execution History',
            content: (
                <div className="py-6">
                    {schedule.executions && schedule.executions.length > 0 ? (
                        <div className="space-y-4">
                            {schedule.executions.map((execution) => (
                                <div key={execution.id} className="rounded-lg border p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Completed</p>
                                                    <p className="font-medium">{execution.quantity_completed} units</p>
                                                </div>
                                                {execution.quantity_scrapped > 0 && (
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Scrapped</p>
                                                        <p className="font-medium text-destructive">{execution.quantity_scrapped} units</p>
                                                    </div>
                                                )}
                                            </div>
                                            {execution.notes && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Notes</p>
                                                    <p className="text-sm">{execution.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{execution.executed_by.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(execution.created_at), 'PPp')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium">No Execution History</h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                No executions have been recorded for this step yet.
                            </p>
                        </div>
                    )}
                </div>
            ),
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Production Schedule - Step #${schedule.step_number}`} />
            <ShowLayout
                title={`Step #${schedule.step_number} - ${schedule.name}`}
                subtitle={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="capitalize">{schedule.step_type.replace('_', ' ')}</span>
                        {schedule.work_cell && (
                            <>
                                <span className="text-muted-foreground">•</span>
                                <span>{schedule.work_cell.name}</span>
                            </>
                        )}
                    </span>
                }
                editRoute={['pending', 'queued'].includes(schedule.status) ? route('production.schedules.edit', { schedule: schedule.id }) : ''}
                showEditButton={['pending', 'queued'].includes(schedule.status)}
                tabs={tabs}
            />
        </AppLayout>
    );
} 