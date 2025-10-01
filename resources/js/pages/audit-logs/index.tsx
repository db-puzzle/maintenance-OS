import React, { useState } from 'react';
import { router, usePage, Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Filter,
    Calendar as CalendarIcon,
    Download,
    Eye,
    User,
    Shield,
    Activity,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnConfig } from '@/types/shared';
import { type BreadcrumbItem } from '@/types';
interface AuditLog {
    id: number;
    event_type: string;
    event_action: string;
    event_description: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    impersonator?: {
        id: number;
        name: string;
    };
    auditable_type: string;
    auditable_id: number;
    changed_fields: Record<string, { old: unknown; new: unknown }>;
    metadata: Record<string, unknown>;
    ip_address: string;
    created_at: string;
}
interface Props {
    logs: {
        data: AuditLog[];
        links?: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
        meta?: {
            current_page: number;
            from: number;
            last_page: number;
            per_page: number;
            to: number;
            total: number;
        };
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
    };
    filters: {
        search: string;
        event_type: string;
        user_id: string;
        date_from: string;
        date_to: string;
    };
    eventTypes: string[];
    users: Array<{ id: number; name: string; email: string }>;
}
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Home', href: '/home' },
    { title: 'Settings', href: '#' },
    { title: 'Audit Logs', href: '/audit-logs' },
];

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

export default function AuditLogsIndex({ logs, filters, eventTypes, users }: Props) {
    const { auth } = usePage().props as Record<string, unknown>;
    const [search, setSearch] = useState(filters.search || '');
    const [localFilters, setLocalFilters] = useState(filters);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: filters.date_from ? new Date(filters.date_from) : undefined,
        to: filters.date_to ? new Date(filters.date_to) : undefined
    });

    // Only allow administrators
    const authUser = (auth as Record<string, unknown>).user as Record<string, unknown> | undefined;
    const userRoles = authUser?.roles as Array<{ name: string }> | undefined;
    if (!userRoles?.some((role) => role.name === 'Administrator')) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Audit Logs - Access Denied" />
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">Access Denied</h3>
                        <p className="text-gray-500">Only administrators can view audit logs.</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(route('audit-logs.index'), { ...filters, search: value }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const applyFilters = () => {
        const cleanedFilters = {
            ...localFilters,
            event_type: localFilters.event_type === 'all' ? '' : localFilters.event_type,
            user_id: localFilters.user_id === 'all' ? '' : localFilters.user_id,
            date_from: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
            date_to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
        };
        router.get(route('audit-logs.index'), cleanedFilters, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const exportLogs = () => {
        // Using window.location.href for file download - Inertia router doesn't handle file downloads
        window.location.href = route('audit-logs.export', localFilters);
    };

    const handlePageChange = (page: number) => {
        router.get(route('audit-logs.index'), { ...filters, page }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handlePerPageChange = (perPage: number) => {
        router.get(route('audit-logs.index'), { ...filters, per_page: perPage, page: 1 }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const getEventBadgeVariant = (eventType: string) => {
        if (eventType.includes('created')) return 'default';
        if (eventType.includes('updated')) return 'secondary';
        if (eventType.includes('deleted')) return 'destructive';
        if (eventType.includes('granted')) return 'default';
        if (eventType.includes('revoked')) return 'destructive';
        return 'outline';
    };

    const getEventIcon = (eventType: string) => {
        if (eventType.includes('user')) return <User className="w-4 h-4" />;
        if (eventType.includes('role') || eventType.includes('permission')) return <Shield className="w-4 h-4" />;
        return <Activity className="w-4 h-4" />;
    };

    // Define columns for EntityDataTable
    const columns: ColumnConfig[] = [
        {
            key: 'event_type',
            label: 'Event',
            sortable: false,
            width: 'w-[200px]',
            render: (_, row) => {
                const log = row as unknown as AuditLog;
                return (
                    <div className="flex items-center gap-2">
                        {getEventIcon(log.event_type)}
                        <Badge variant={getEventBadgeVariant(log.event_type)}>
                            {log.event_action}
                        </Badge>
                    </div>
                );
            },
        },
        {
            key: 'event_description',
            label: 'Description',
            sortable: false,
            width: 'w-[300px]',
            render: (_, row) => {
                const log = row as unknown as AuditLog;
                return (
                    <div>
                        <p className="font-medium">{log.event_description}</p>
                        {log.impersonator && (
                            <p className="text-xs text-orange-600">
                                Impersonated by {log.impersonator.name}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'user',
            label: 'User',
            sortable: false,
            width: 'w-[200px]',
            render: (_, row) => {
                const log = row as unknown as AuditLog;
                return (
                    <div className="text-sm">
                        <p className="font-medium">{log.user.name}</p>
                        <p className="text-muted-foreground">{log.user.email}</p>
                    </div>
                );
            },
        },
        {
            key: 'ip_address',
            label: 'IP Address',
            sortable: false,
            width: 'w-[150px]',
            render: (value) => {
                return <code className="text-xs">{value as string}</code>;
            },
        },
        {
            key: 'created_at',
            label: 'Time',
            sortable: false,
            width: 'w-[180px]',
            render: (value) => {
                return (
                    <div className="text-sm">
                        <p>{format(new Date(value as string), 'MMM d, yyyy')}</p>
                        <p className="text-muted-foreground">
                            {formatDistanceToNow(new Date(value as string), { addSuffix: true })}
                        </p>
                    </div>
                );
            },
        },
    ];

    // Prepare pagination data
    const pagination = logs.meta ? {
        current_page: logs.meta.current_page,
        last_page: logs.meta.last_page,
        per_page: logs.meta.per_page,
        total: logs.meta.total,
        from: logs.meta.from,
        to: logs.meta.to,
    } : {
        current_page: logs.current_page,
        last_page: logs.last_page,
        per_page: logs.per_page,
        total: logs.total,
        from: 1,
        to: logs.data.length,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Permission Audit Logs" />
            <ListLayout
                title="Permission Audit Logs"
                description="Track all permission-related changes in the system"
                searchPlaceholder="Search logs..."
                searchValue={search}
                onSearchChange={handleSearch}
                createButtonText=""
                actions={
                    <div className="flex items-center gap-2">
                        <Select
                            value={localFilters.event_type || 'all'}
                            onValueChange={(value) => setLocalFilters({ ...localFilters, event_type: value })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Events" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Events</SelectItem>
                                {eventTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={localFilters.user_id || 'all'}
                            onValueChange={(value) => setLocalFilters({ ...localFilters, user_id: value })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !dateRange.from && "text-muted-foreground"
                                )}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "PPP")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="range"
                                    required={false}
                                    selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                                    onSelect={(range) => {
                                        if (range && 'from' in range) {
                                            setDateRange({ from: range.from, to: range.to });
                                        } else {
                                            setDateRange({ from: undefined, to: undefined });
                                        }
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                        <Button onClick={applyFilters} variant="default" size="sm">
                            <Filter className="w-4 h-4 mr-2" />
                            Apply Filters
                        </Button>
                        <Button onClick={exportLogs} variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                }
            >
                <div className="-mt-4 space-y-4">
                    {/* Audit Logs Table */}
                    <EntityDataTable
                        data={logs.data as unknown as Record<string, unknown>[]}
                        columns={columns}
                        loading={false}
                        onRowClick={(log) => {
                            setSelectedLog(log as unknown as AuditLog);
                            setShowDetails(true);
                        }}
                        emptyMessage="No audit logs found"
                        actions={(log) => (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedLog(log as unknown as AuditLog);
                                    setShowDetails(true);
                                }}
                            >
                                <Eye className="w-4 h-4" />
                            </Button>
                        )}
                    />
                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <EntityPagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onPerPageChange={handlePerPageChange}
                            perPageOptions={[10, 20, 30, 50, 100]}
                        />
                    )}
                </div>
            </ListLayout>
            {/* Log Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">Event</h4>
                                    <p className="mt-1">{selectedLog.event_type}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">Action</h4>
                                    <Badge variant={getEventBadgeVariant(selectedLog.event_type)}>
                                        {selectedLog.event_action}
                                    </Badge>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">User</h4>
                                    <p className="mt-1">{selectedLog.user.name} ({selectedLog.user.email})</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">Time</h4>
                                    <p className="mt-1">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">IP Address</h4>
                                    <code className="mt-1">{selectedLog.ip_address}</code>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">Entity</h4>
                                    <p className="mt-1">{selectedLog.auditable_type} #{selectedLog.auditable_id}</p>
                                </div>
                            </div>
                            {selectedLog.impersonator && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <p className="text-sm text-orange-800">
                                        This action was performed by <strong>{selectedLog.impersonator.name}</strong> while impersonating the user.
                                    </p>
                                </div>
                            )}
                            {Object.keys(selectedLog.changed_fields).length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Changes</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                        {Object.entries(selectedLog.changed_fields).map(([field, change]: [string, { old: unknown; new: unknown }]) => (
                                            <div key={field} className="flex items-start gap-4">
                                                <span className="font-medium text-sm w-32">{field}:</span>
                                                <div className="flex-1 text-sm">
                                                    <span className="text-red-600">
                                                        {JSON.stringify(change.old) || 'null'}
                                                    </span>
                                                    <span className="mx-2">→</span>
                                                    <span className="text-green-600">
                                                        {JSON.stringify(change.new) || 'null'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Additional Information</h4>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <pre className="text-sm">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 