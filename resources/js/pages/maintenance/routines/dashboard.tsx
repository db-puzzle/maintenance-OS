import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import DashboardLayout from '@/layouts/dashboards/dashboard-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { ColumnConfig } from '@/types/shared';
import { Head, router } from '@inertiajs/react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import {
    AlertCircle,
    BarChart3,
    Calendar as CalendarIcon,
    CheckCircle,
    ChevronDown,
    Clock,
    Eye,
    FileText,
    Minus,
    Search,
    TrendingDown,
    TrendingUp,
    XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

// Types for dashboard
interface Stats {
    total: number;
    completed: number;
    in_progress: number;
    overdue: number;
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
    dailyTrend: Record<string, unknown>[];
    performanceMetrics: PerformanceMetrics;
    filters: Record<string, unknown>;
    filterOptions: Record<string, unknown>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Rotinas',
        href: '/maintenance/routines',
    },
    {
        title: 'Dashboard',
        href: '/maintenance/routines/dashboard',
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
        label: 'Completed',
        color: 'hsl(var(--chart-1))',
    },
    overdue: {
        label: 'Overdue',
        color: 'hsl(var(--chart-2))',
    },
} satisfies ChartConfig;

const RoutineDashboard: React.FC<RoutineDashboardProps> = ({
    stats: rawStats,
    recentExecutions,
    dailyTrend,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    performanceMetrics,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filters,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filterOptions,
}) => {
    // Handle transition from 'failed' to 'overdue' in backend data
    const stats = {
        ...rawStats,
        overdue: rawStats.overdue ?? (rawStats as Stats & { failed?: number }).failed ?? 0
    };
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
        return urlParams.get('status') || 'All';
    });
    const [timeframe, setTimeframe] = useState('Daily');
    const [searchQuery, setSearchQuery] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('search') || '';
    });

    // Track mobile view
    const [isMobile, setIsMobile] = useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Column visibility state
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_columnVisibility, _setColumnVisibility] = useState<Record<string, boolean>>({
        id: true,
        status: true,
        routine_name: true,
        asset_tag: true,
        executor_name: true,
        started_at: true,
        duration_minutes: true,
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
                <Badge className={cn('flex w-fit items-center gap-1', getStatusColor(row.status as string))}>
                    <span className="hidden sm:inline">{getStatusIcon(row.status as string)}</span>
                    <span className="hidden sm:inline">{(row.status as string).replace('_', ' ')}</span>
                    <span className="sm:hidden">{(row.status as string).charAt(0).toUpperCase()}</span>
                </Badge>
            ),
        },
        {
            key: 'routine_name',
            label: 'Routine',
            sortable: true,
            width: 'w-[200px]',
            render: (value) => value as React.ReactNode,
        },
        {
            key: 'asset_tag',
            label: 'Asset',
            sortable: false,
            width: 'w-[150px]',
            render: (value) => (value as React.ReactNode) || 'N/A',
        },
        {
            key: 'executor_name',
            label: 'Executor',
            sortable: true,
            width: 'w-[150px]',
            render: (value, row) => (
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                            {(row.executor_name as string)
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline">{row.executor_name as React.ReactNode}</span>
                </div>
            ),
        },
        {
            key: 'started_at',
            label: 'Started',
            sortable: true,
            width: 'w-[150px]',
            render: (value) => getRelativeTime(value as string),
        },
        {
            key: 'duration_minutes',
            label: 'Duration',
            sortable: true,
            width: 'w-[100px]',
            render: (value) => formatDuration(value as number),
        },
    ];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
        switch (trend) {
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
                return 'bg-gray-100 text-gray-800';
            case 'overdue':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="mr-1 h-4 w-4" />;
            case 'in_progress':
                return <Clock className="mr-1 h-4 w-4" />;
            case 'overdue':
                return <AlertCircle className="mr-1 h-4 w-4" />;
            case 'cancelled':
                return <XCircle className="mr-1 h-4 w-4" />;
            default:
                return <AlertCircle className="mr-1 h-4 w-4" />;
        }
    };

    // Transform dailyTrend data for the chart
    const chartData =
        dailyTrend?.map((day) => {
            const dayData = day as { date: string; completed?: number; overdue?: number; failed?: number };
            return {
                date: dayData.date,
                completed: Number(dayData.completed || 0),
                overdue: Number(dayData.overdue || dayData.failed || 0),
            };
        }) || [];

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
            if (statusFilter !== 'All') {
                params.set('status', statusFilter.toLowerCase());
            }
            if (searchQuery) {
                params.set('search', searchQuery);
            }

            router.visit(`/maintenance/routines/dashboard?${params.toString()}`, {
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
        if (newStatus !== 'All') {
            params.set('status', newStatus.toLowerCase());
        }

        // Add search if set
        if (searchQuery) {
            params.set('search', searchQuery);
        }

        router.visit(`/maintenance/routines/dashboard?${params.toString()}`, {
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
            if (statusFilter !== 'All') {
                params.set('status', statusFilter.toLowerCase());
            }

            // Add search if set
            if (newSearch.trim()) {
                params.set('search', newSearch.trim());
            }

            router.visit(`/maintenance/routines/dashboard?${params.toString()}`, {
                preserveState: true,
                preserveScroll: true,
            });
        }, 500);
    };

    // Filter executions based on search
    const filteredExecutions = recentExecutions.filter((execution) => {
        const matchesSearch =
            searchQuery === '' ||
            execution.routine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            execution.executor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (execution.asset_tag && execution.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'All' || execution.status === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    // Main dashboard content
    const dashboardContent = (
        <div className="flex flex-col gap-6 py-4 md:py-6">
            {/* Date Range and Filters */}
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-2">
                    <div className={cn('grid gap-2')}>
                        <Popover>
                            <PopoverTrigger asChild className="max-w-[300px]">
                                <Button
                                    id="date"
                                    variant={'outline'}
                                    className={cn('w-full max-w-[300px] justify-start text-left font-normal md:w-[300px]', !date && 'text-muted-foreground')}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                <span className="hidden sm:inline">
                                                    {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                                                </span>
                                                <span className="sm:hidden">
                                                    {format(date.from, 'MMM dd')} - {format(date.to, 'MMM dd')}
                                                </span>
                                            </>
                                        ) : (
                                            format(date.from, 'LLL dd, y')
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <div className="flex flex-col">
                                    <div className="flex gap-2 p-3 border-b">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const range = {
                                                    from: new Date(new Date().setDate(new Date().getDate() - 30)),
                                                    to: new Date()
                                                };
                                                setDate(range);
                                                handleDateChange(range);
                                            }}
                                        >
                                            Last 30 Days
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const range = {
                                                    from: new Date(new Date().setDate(new Date().getDate() - 7)),
                                                    to: new Date()
                                                };
                                                setDate(range);
                                                handleDateChange(range);
                                            }}
                                        >
                                            Last 7 Days
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const lastMonth = subMonths(new Date(), 1);
                                                const range = {
                                                    from: startOfMonth(lastMonth),
                                                    to: endOfMonth(lastMonth)
                                                };
                                                setDate(range);
                                                handleDateChange(range);
                                            }}
                                        >
                                            Last Month
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const lastWeek = subWeeks(new Date(), 1);
                                                const range = {
                                                    from: startOfWeek(lastWeek, { weekStartsOn: 0 }),
                                                    to: endOfWeek(lastWeek, { weekStartsOn: 0 })
                                                };
                                                setDate(range);
                                                handleDateChange(range);
                                            }}
                                        >
                                            Last Week
                                        </Button>
                                    </div>
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={handleDateChange}
                                        numberOfMonths={2}
                                        className="rounded-md border-0"
                                        weekStartsOn={0}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
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
                                <DropdownMenuRadioItem value="Overdue">Overdue</DropdownMenuRadioItem>
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
                            className={`${stats.trend.direction === 'up'
                                ? 'text-green-600'
                                : stats.trend.direction === 'down'
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                                }`}
                        >
                            {stats.trend.percentage > 0 ? '+' : ''}
                            {stats.trend.percentage}%
                        </span>
                    </p>
                    <p className="text-xl font-semibold md:text-3xl">{stats.total.toLocaleString()}</p>
                </div>
                <Separator orientation="vertical" className="hidden h-16! lg:block" />
                <div className="flex flex-1 flex-col gap-2">
                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                        Completed
                        <span className="text-green-600">+{stats.completion_rate}%</span>
                    </p>
                    <p className="text-xl font-semibold md:text-3xl">{stats.completed.toLocaleString()}</p>
                </div>
                <Separator orientation="vertical" className="hidden h-16! lg:block" />
                <div className="flex flex-1 flex-col gap-2">
                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                        In Progress
                        <span className="text-blue-600">+{stats.total > 0 ? ((stats.in_progress / stats.total) * 100).toFixed(1) : 0}%</span>
                    </p>
                    <p className="text-xl font-semibold md:text-3xl">{stats.in_progress.toLocaleString()}</p>
                </div>
                <Separator orientation="vertical" className="hidden h-16! lg:block" />
                <div className="flex flex-1 flex-col gap-2">
                    <p className="text-muted-foreground flex justify-between text-sm font-medium">
                        Overdue
                        <span className="text-red-600">+{stats.total > 0 ? ((stats.overdue / stats.total) * 100).toFixed(1) : 0}%</span>
                    </p>
                    <p className="text-xl font-semibold md:text-3xl">{stats.overdue.toLocaleString()}</p>
                </div>
            </div>

            {/* Chart */}
            {chartData && chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[200px] max-h-[280px] w-full sm:h-[280px]">
                    <AreaChart
                        data={chartData}
                        margin={{
                            left: isMobile ? 0 : 12,
                            right: isMobile ? 0 : 12,
                            top: 10,
                            bottom: 0
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            interval={isMobile ? 'preserveStartEnd' : 0}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return isMobile
                                    ? date.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric' })
                                    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={isMobile ? 0 : 40}
                            hide={isMobile}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <defs>
                            <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillOverdue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-overdue)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-overdue)" stopOpacity={0.1} />
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
                            dataKey="overdue"
                            type="natural"
                            fill="url(#fillOverdue)"
                            fillOpacity={0.4}
                            stroke="var(--color-overdue)"
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            ) : (
                <div className="flex h-[200px] w-full items-center justify-center rounded-lg border bg-muted/10 sm:h-[280px]">
                    <p className="text-muted-foreground">No data available for the selected period</p>
                </div>
            )}

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
                </div>

                {/* Table container with responsive wrapper */}
                <div className="relative overflow-hidden rounded-lg border">
                    <div className="overflow-auto">
                        <div className="min-w-[1000px]">
                            <EntityDataTable
                                data={filteredExecutions as unknown as Record<string, unknown>[]}
                                columns={columns}
                                loading={false}
                                onRowClick={(execution) => router.visit(`/maintenance/routines/executions/${execution.id}`)}
                                columnVisibility={_columnVisibility}
                                onSort={handleSort}
                                actions={(execution) => (
                                    <EntityActionDropdown
                                        additionalActions={[
                                            {
                                                label: 'View',
                                                icon: <Eye className="h-4 w-4" />,
                                                onClick: () => router.visit(`/maintenance/routines/executions/${execution.id}`),
                                            },
                                            {
                                                label: 'Export',
                                                icon: <FileText className="h-4 w-4" />,
                                                onClick: () => handleExportSingle(execution.id as number),
                                            },
                                        ]}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-end">
                    <Pagination className="hidden justify-end md:flex">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious href="#" />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">1</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#" isActive>
                                    2
                                </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">3</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext href="#" />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                    <div className="flex items-center justify-end space-x-2 md:hidden">
                        <Button variant="outline">Previous</Button>
                        <Button variant="outline">Next</Button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Routine Dashboard - Maintenance" />

            <DashboardLayout
                title="Rotinas de Manutenção"
                subtitle="Dashboard de execuções de rotinas"
                editRoute="/maintenance/routines"
                tabs={[]}
                showEditButton={false}
                actionButtons={
                    <Button size="sm" variant="outline" onClick={() => router.visit('/maintenance/routines')} className="max-w-[36px] md:max-w-none">
                        <BarChart3 className="h-4 w-4" />
                        <span className="ml-2 hidden md:block">View All Executions</span>
                    </Button>
                }
            >
                {dashboardContent}
            </DashboardLayout>
        </AppLayout>
    );
};

export default RoutineDashboard;
