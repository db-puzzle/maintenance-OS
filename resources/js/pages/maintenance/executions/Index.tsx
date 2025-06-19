import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Download, Eye, FileText } from 'lucide-react';
import type { PaginatedExecutions, ExecutionFilters, FilterOption, SortOption } from '@/types/maintenance';

interface ExecutionIndexProps {
    executions: PaginatedExecutions;
    filters: ExecutionFilters;
    filterOptions: {
        assets: FilterOption[];
        routines: FilterOption[];
        executors: FilterOption[];
        statuses: FilterOption[];
    };
    sortOptions: SortOption[];
    currentSort: {
        column: string;
        direction: 'asc' | 'desc';
    };
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
        title: 'Executions',
        href: '/maintenance/executions',
    },
];

const ExecutionIndex: React.FC<ExecutionIndexProps> = ({
    executions,
    filters,
    filterOptions,
    sortOptions,
    currentSort,
}) => {
    const [selectedExecutions, setSelectedExecutions] = useState<number[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedExecutions(executions.data.map(e => e.id));
        } else {
            setSelectedExecutions([]);
        }
    };

    const handleSelectExecution = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedExecutions([...selectedExecutions, id]);
        } else {
            setSelectedExecutions(selectedExecutions.filter(eId => eId !== id));
        }
    };

    const applyFilters = () => {
        router.get('/maintenance/executions', localFilters as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSort = (column: string) => {
        const direction = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
        router.get('/maintenance/executions', {
            ...filters,
            sort_by: column,
            sort_direction: direction,
        } as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleExportSelected = () => {
        if (selectedExecutions.length === 0) return;

        // TODO: Implement export modal
        console.log('Export selected:', selectedExecutions);
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
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Executions - Maintenance" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">Routine Executions</h1>
                        <p className="text-muted-foreground">
                            View and manage all routine execution records
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleExportSelected}
                            disabled={selectedExecutions.length === 0}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Selected ({selectedExecutions.length})
                        </Button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search executions..."
                        className="pl-10"
                        value={localFilters.search || ''}
                        onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    />
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Filters</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Status</label>
                                    <Select
                                        value={localFilters.status?.[0] || ''}
                                        onValueChange={(value) => setLocalFilters({ ...localFilters, status: value ? [value] : [] })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All statuses</SelectItem>
                                            {filterOptions.statuses.map((status) => (
                                                <SelectItem key={status.value} value={status.value.toString()}>
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">Asset</label>
                                    <Select
                                        value={localFilters.asset_ids?.[0]?.toString() || ''}
                                        onValueChange={(value) => setLocalFilters({ ...localFilters, asset_ids: value ? [parseInt(value)] : [] })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All assets" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All assets</SelectItem>
                                            {filterOptions.assets.map((asset) => (
                                                <SelectItem key={asset.value} value={asset.value.toString()}>
                                                    {asset.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">Routine</label>
                                    <Select
                                        value={localFilters.routine_ids?.[0]?.toString() || ''}
                                        onValueChange={(value) => setLocalFilters({ ...localFilters, routine_ids: value ? [parseInt(value)] : [] })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All routines" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All routines</SelectItem>
                                            {filterOptions.routines.map((routine) => (
                                                <SelectItem key={routine.value} value={routine.value.toString()}>
                                                    {routine.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">Executor</label>
                                    <Select
                                        value={localFilters.executor_ids?.[0]?.toString() || ''}
                                        onValueChange={(value) => setLocalFilters({ ...localFilters, executor_ids: value ? [parseInt(value)] : [] })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All executors" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All executors</SelectItem>
                                            {filterOptions.executors.map((executor) => (
                                                <SelectItem key={executor.value} value={executor.value.toString()}>
                                                    {executor.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end mt-4 gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setLocalFilters({});
                                        router.get('/maintenance/executions', {}, {
                                            preserveState: true,
                                            preserveScroll: true,
                                        });
                                    }}
                                >
                                    Clear Filters
                                </Button>
                                <Button onClick={applyFilters}>
                                    Apply Filters
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Executions Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedExecutions.length === executions.data.length && executions.data.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleSort('id')}
                                    >
                                        ID
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleSort('routine_name')}
                                    >
                                        Routine
                                    </TableHead>
                                    <TableHead>Asset</TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleSort('executor_name')}
                                    >
                                        Executor
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleSort('status')}
                                    >
                                        Status
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleSort('started_at')}
                                    >
                                        Started At
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleSort('duration')}
                                    >
                                        Duration
                                    </TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {executions.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            No executions found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    executions.data.map((execution) => (
                                        <TableRow key={execution.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedExecutions.includes(execution.id)}
                                                    onCheckedChange={(checked) => handleSelectExecution(execution.id, checked as boolean)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">#{execution.id}</TableCell>
                                            <TableCell>{execution.routine.name}</TableCell>
                                            <TableCell>
                                                {execution.assets.length > 0
                                                    ? execution.assets[0].tag
                                                    : execution.primary_asset_tag || 'N/A'}
                                            </TableCell>
                                            <TableCell>{execution.executor.name}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(execution.status)}>
                                                    {execution.status.replace('_', ' ')}
                                                </Badge>
                                                {execution.status === 'in_progress' && (
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {execution.progress}%
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {formatDate(execution.started_at)}
                                            </TableCell>
                                            <TableCell>
                                                {execution.duration_minutes
                                                    ? `${execution.duration_minutes}m`
                                                    : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link href={`/maintenance/executions/${execution.id}`}>
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => console.log('Export single:', execution.id)}
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {executions.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {executions.from || 0} to {executions.to || 0} of {executions.total} results
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const prevPage = executions.current_page - 1;
                                    if (prevPage >= 1) {
                                        router.get('/maintenance/executions', {
                                            ...filters,
                                            page: prevPage,
                                        } as any);
                                    }
                                }}
                                disabled={executions.current_page <= 1}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center px-3 text-sm">
                                Page {executions.current_page} of {executions.last_page}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const nextPage = executions.current_page + 1;
                                    if (nextPage <= executions.last_page) {
                                        router.get('/maintenance/executions', {
                                            ...filters,
                                            page: nextPage,
                                        } as any);
                                    }
                                }}
                                disabled={executions.current_page >= executions.last_page}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default ExecutionIndex; 