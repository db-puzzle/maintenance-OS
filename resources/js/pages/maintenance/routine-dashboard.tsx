import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { ColumnConfig } from '@/types/shared';
import { AreaChart, Area, XAxis, CartesianGrid } from 'recharts';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    Download,
    MoreHorizontal,
    Plus,
    Search,
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart3,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye,
    FileText,
} from 'lucide-react';
import { useExportManager } from '@/hooks/use-export-manager';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

// Types from History.tsx
interface Stats {
    total: number;
    completed: number;
    in_progress: number;
    failed: number;
    completion_rate: number;
    trend: {
        direction: 'up' | 'down' | 'stable';
        percentage: number;
    };
}

interface ExecutionSummary {
    id: number;
    routine_name: string;
    asset_tag: string | null;
    executor_name: string;
    status: string;
    started_at: string;
    duration_minutes: number | null;
    progress: number;
}

interface PerformanceMetrics {
    average_duration_minutes: number;
    median_duration_minutes: number;
    fastest_execution_minutes: number;
    slowest_execution_minutes: number;
    total_execution_time_hours: number;
}

interface RoutineDashboardProps {
    stats: Stats;
    recentExecutions: ExecutionSummary[];
    dailyTrend: any[];
    performanceMetrics: PerformanceMetrics;
    filters: any;
    filterOptions: any;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Maintenance',
        href: '/maintenance/dashboard',
    },
    {
        title: 'Routine Dashboard',
        href: '/maintenance/routine-dashboard',
    },
];

// Utility functions
const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
};

const formatDuration = (minutes: number | null): string => {
    if (!minutes || minutes <= 0) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
};

const getRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(dateString);
};

const chartConfig = {
    completed: {
        label: "Completed",
        color: "hsl(var(--chart-1))",
    },
    failed: {
        label: "Failed",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig;

const RoutineDashboard: React.FC<RoutineDashboardProps> = ({
    stats,
    recentExecutions,
    dailyTrend,
    performanceMetrics,
    filters,
    filterOptions,
}) => {
    const [date, setDate] = useState<DateRange | undefined>(() => {
        // Initialize from URL params or use default range
        const urlParams = new URLSearchParams(window.location.search);
        const dateFrom = urlParams.get('date_from');
        const dateTo = urlParams.get('date_to');

        if (dateFrom && dateTo) {
            return {
                from: new Date(dateFrom),
                to: new Date(dateTo),
            };
        }

        return {
            from: new Date(new Date().setDate(new Date().getDate() - 30)),
            to: new Date(),
        };
    });
    const [statusFilter, setStatusFilter] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('status') || "All";
    });
    const [timeframe, setTimeframe] = useState("Daily");
    const [searchQuery, setSearchQuery] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('search') || "";
    });
    const [isExporting, setIsExporting] = useState(false);
    const { addExport, updateExport } = useExportManager();

    // Column visibility state
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('routineDashboardColumnsVisibility');
            if (saved) {
                return JSON.parse(saved);
            }
        }
        return {
            id: true,
            status: true,
            routine_name: true,
            asset_tag: true,
            executor_name: true,
            started_at: true,
            duration_minutes: true,
        };
    });

    // Column configuration for EntityDataTable
    const columns: ColumnConfig[] = [
        {
            key: 'id',
            label: 'ID',
            sortable: true,
            width: 'w-[80px]',
            render: (value) => `#${value}`,
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            width: 'w-[120px]',
            render: (value, row) => (
                <Badge className={cn("flex items-center w-fit", getStatusColor(row.status))}>
                    {getStatusIcon(row.status)}
                    {row.status.replace('_', ' ')}
                </Badge>
            ),
        },
        {
            key: 'routine_name',
            label: 'Routine',
            sortable: true,
            width: 'w-[200px]',
            render: (value) => value,
        },
        {
            key: 'asset_tag',
            label: 'Asset',
            sortable: false,
            width: 'w-[150px]',
            render: (value) => value || 'N/A',
        },
        {
            key: 'executor_name',
            label: 'Executor',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>
                            {row.executor_name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                    </Avatar>
                    <span>{row.executor_name}</span>
                </div>
            ),
        },
        {
            key: 'started_at',
            label: 'Started',
            sortable: true,
            width: 'w-[150px]',
            render: (value) => getRelativeTime(value),
        },
        {
            key: 'duration_minutes',
            label: 'Duration',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => formatDuration(value),
        },
    ];

    const getTrendIcon = (direction: string) => {
        switch (direction) {
            case 'up':
                return <TrendingUp className="h-4 w-4 text-green-600" />;
            case 'down':
                return <TrendingDown className="h-4 w-4 text-red-600" />;
            default:
                return <Minus className="h-4 w-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 mr-1" />;
            case 'in_progress':
                return <Clock className="h-4 w-4 mr-1" />;
            case 'failed':
            case 'cancelled':
                return <XCircle className="h-4 w-4 mr-1" />;
            default:
                return <AlertCircle className="h-4 w-4 mr-1" />;
        }
    };

    // Transform dailyTrend data for the chart
    const chartData = dailyTrend?.map(day => ({
        date: day.date,
        completed: day.completed || 0,
        failed: day.failed || 0,
    })) || [];

    const handleExportReport = async () => {
        setIsExporting(true);
        try {
            const executionIds = recentExecutions.slice(0, 10).map(e => e.id);
            const response = await fetch('/maintenance/executions/export/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    execution_ids: executionIds,
                    format: 'pdf',
                    template: 'summary',
                    grouping: 'by_asset',
                    include_cover_page: true,
                    include_index: true,
                    separate_files: false,
                    include_images: true,
                    compress_images: true,
                    paper_size: 'A4',
                    delivery: { method: 'download' },
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Export failed');

            addExport({
                id: data.export_id,
                type: 'batch',
                description: `Dashboard Report - ${executionIds.length} executions`,
                status: 'processing',
                progress: 0,
            });

            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusResponse = await fetch(`/maintenance/executions/exports/${data.export_id}/status`, {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    });
                    const statusData = await statusResponse.json();

                    if (statusData.progress_percentage) {
                        updateExport(data.export_id, { progress: statusData.progress_percentage });
                    }

                    if (statusData.status === 'completed' && statusData.download_url) {
                        clearInterval(pollInterval);
                        updateExport(data.export_id, {
                            status: 'completed',
                            downloadUrl: statusData.download_url,
                            completedAt: new Date(),
                        });
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);
                        updateExport(data.export_id, {
                            status: 'failed',
                            error: 'Export failed. Please try again.',
                        });
                    }
                } catch (error) {
                    console.error('Status polling error:', error);
                }
            }, 2000);

            setTimeout(() => clearInterval(pollInterval), 300000);
        } catch (error) {
            console.error('Export error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to start export');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportSingle = (executionId: number) => {
        // TODO: Implement single export functionality
        console.log('Export single:', executionId);
    };

    const handleSort = (columnKey: string) => {
        // TODO: Implement sorting functionality
        console.log('Sort:', columnKey);
    };

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate);

        // Update URL and refresh data
        if (newDate?.from && newDate?.to) {
            const params = new URLSearchParams(window.location.search);
            params.set('date_from', newDate.from.toISOString().split('T')[0]);
            params.set('date_to', newDate.to.toISOString().split('T')[0]);

            // Keep existing filters
            if (statusFilter !== "All") {
                params.set('status', statusFilter.toLowerCase());
            }
            if (searchQuery) {
                params.set('search', searchQuery);
            }

            router.visit(`/maintenance/routine-dashboard?${params.toString()}`, {
                preserveState: true,
                preserveScroll: true,
            });
        }
    };

    const handleStatusFilterChange = (newStatus: string) => {
        setStatusFilter(newStatus);

        const params = new URLSearchParams();

        // Add date range if set
        if (date?.from && date?.to) {
            params.set('date_from', date.from.toISOString().split('T')[0]);
            params.set('date_to', date.to.toISOString().split('T')[0]);
        }

        // Add status filter if not "All"
        if (newStatus !== "All") {
            params.set('status', newStatus.toLowerCase());
        }

        // Add search if set
        if (searchQuery) {
            params.set('search', searchQuery);
        }

        router.visit(`/maintenance/routine-dashboard?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchChange = (newSearch: string) => {
        setSearchQuery(newSearch);

        // Debounce the search
        setTimeout(() => {
            const params = new URLSearchParams();

            // Add date range if set
            if (date?.from && date?.to) {
                params.set('date_from', date.from.toISOString().split('T')[0]);
                params.set('date_to', date.to.toISOString().split('T')[0]);
            }

            // Add status filter if not "All"
            if (statusFilter !== "All") {
                params.set('status', statusFilter.toLowerCase());
            }

            // Add search if set
            if (newSearch.trim()) {
                params.set('search', newSearch.trim());
            }

            router.visit(`/maintenance/routine-dashboard?${params.toString()}`, {
                preserveState: true,
                preserveScroll: true,
            });
        }, 500);
    };

    // Filter executions based on search
    const filteredExecutions = recentExecutions.filter(execution => {
        const matchesSearch = searchQuery === "" ||
            execution.routine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            execution.executor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (execution.asset_tag && execution.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === "All" || execution.status === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Routine Dashboard - Maintenance" />

            <div className="bg-background h-full overflow-auto">
                {/* Header */}
                <div className="border-border flex flex-col border-b px-4 py-4 md:px-6 md:py-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                Routine Executions
                            </h1>
                            <p className="text-muted-foreground">
                                Track and analyze routine execution performance
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.visit('/maintenance/executions')}>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                <span className="hidden md:block">View All</span>
                            </Button>
                            <Button variant="outline" onClick={handleExportReport} disabled={isExporting}>
                                <Download className="h-4 w-4 mr-2" />
                                <span className="hidden md:block">{isExporting ? 'Exporting...' : 'Export'}</span>
                            </Button>
                            <Button onClick={() => router.visit('/maintenance/routines/create')}>
                                <Plus className="h-4 w-4 mr-2" />
                                <span className="hidden md:block">New Routine</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-col gap-6 p-4 md:p-6">
                    {/* Date Range and Filters */}
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild className="max-w-[300px]">
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-[300px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground",
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (
                                            date.to ? (
                                                <>
                                                    {format(date.from, "MMM dd, y")} - {format(date.to, "MMM dd, y")}
                                                </>
                                            ) : (
                                                format(date.from, "MMM dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={handleDateChange}
                                        numberOfMonths={2}
                                        className="rounded-md border"
                                        weekStartsOn={0}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        Status: {statusFilter}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup value={statusFilter} onValueChange={handleStatusFilterChange}>
                                        <DropdownMenuRadioItem value="All">All</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="Completed">Completed</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="In_progress">In Progress</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="Failed">Failed</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        {timeframe}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuLabel>Time Period</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup value={timeframe} onValueChange={setTimeframe}>
                                        <DropdownMenuRadioItem value="Daily">Daily</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="Weekly">Weekly</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="Monthly">Monthly</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2 lg:flex lg:flex-row lg:gap-6">
                        <div className="flex flex-1 flex-col gap-2">
                            <p className="text-muted-foreground flex justify-between text-sm font-medium">
                                Total Executions
                                <span
                                    className={`${stats.trend.direction === "up"
                                        ? "text-green-600"
                                        : stats.trend.direction === "down"
                                            ? "text-red-600"
                                            : "text-gray-600"
                                        }`}
                                >
                                    {stats.trend.percentage > 0 ? "+" : ""}{stats.trend.percentage}%
                                </span>
                            </p>
                            <p className="text-xl font-semibold md:text-3xl">
                                {stats.total.toLocaleString()}
                            </p>
                        </div>
                        <Separator
                            orientation="vertical"
                            className="hidden h-16! lg:block"
                        />
                        <div className="flex flex-1 flex-col gap-2">
                            <p className="text-muted-foreground flex justify-between text-sm font-medium">
                                Completed
                                <span className="text-green-600">
                                    +{stats.completion_rate}%
                                </span>
                            </p>
                            <p className="text-xl font-semibold md:text-3xl">
                                {stats.completed.toLocaleString()}
                            </p>
                        </div>
                        <Separator
                            orientation="vertical"
                            className="hidden h-16! lg:block"
                        />
                        <div className="flex flex-1 flex-col gap-2">
                            <p className="text-muted-foreground flex justify-between text-sm font-medium">
                                In Progress
                                <span className="text-blue-600">
                                    +{stats.total > 0 ? ((stats.in_progress / stats.total) * 100).toFixed(1) : 0}%
                                </span>
                            </p>
                            <p className="text-xl font-semibold md:text-3xl">
                                {stats.in_progress.toLocaleString()}
                            </p>
                        </div>
                        <Separator
                            orientation="vertical"
                            className="hidden h-16! lg:block"
                        />
                        <div className="flex flex-1 flex-col gap-2">
                            <p className="text-muted-foreground flex justify-between text-sm font-medium">
                                Failed
                                <span className="text-red-600">
                                    +{stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}%
                                </span>
                            </p>
                            <p className="text-xl font-semibold md:text-3xl">
                                {stats.failed.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Chart */}
                    <ChartContainer config={chartConfig} className="max-h-[280px] w-full">
                        <AreaChart
                            data={chartData}
                            margin={{ left: 12, right: 12 }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <defs>
                                <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="fillFailed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-failed)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-failed)" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <Area
                                dataKey="completed"
                                type="natural"
                                fill="url(#fillCompleted)"
                                fillOpacity={0.4}
                                stroke="var(--color-completed)"
                                stackId="a"
                            />
                            <Area
                                dataKey="failed"
                                type="natural"
                                fill="url(#fillFailed)"
                                fillOpacity={0.4}
                                stroke="var(--color-failed)"
                                stackId="a"
                            />
                        </AreaChart>
                    </ChartContainer>

                    <Separator />

                    {/* Recent Executions Table */}
                    <div className="space-y-4">
                        <div className="flex flex-col justify-between gap-4 lg:flex-row">
                            <div className="relative w-full md:w-[300px]">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    placeholder="Search executions..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={handleExportReport} disabled={isExporting}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Results
                                </Button>
                            </div>
                        </div>

                        <EntityDataTable
                            data={filteredExecutions}
                            columns={columns}
                            loading={false}
                            onRowClick={(execution) => router.visit(`/maintenance/executions/${execution.id}`)}
                            columnVisibility={columnVisibility}
                            onSort={handleSort}
                            actions={(execution) => (
                                <EntityActionDropdown
                                    additionalActions={[
                                        {
                                            label: 'View',
                                            icon: <Eye className="h-4 w-4" />,
                                            onClick: () => router.visit(`/maintenance/executions/${execution.id}`),
                                        },
                                        {
                                            label: 'Export',
                                            icon: <FileText className="h-4 w-4" />,
                                            onClick: () => handleExportSingle(execution.id),
                                        },
                                    ]}
                                />
                            )}
                        />


                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default RoutineDashboard; 