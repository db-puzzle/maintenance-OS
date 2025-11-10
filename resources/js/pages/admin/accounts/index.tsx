import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TextInput } from '@/components/TextInput';
import { createFormAdapter } from '@/utils/form-adapters';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

// Type definitions
interface Account {
    id: string;
    name: string;
    subdomain: string;
    status: 'active' | 'suspended' | 'maintenance';
    trial_ends_at: string | null;
    created_at: string;
    domains: Array<{ domain: string }>;
    subscription: {
        plan: {
            name: string;
            price: string;
        };
        status: string;
    } | null;
}

interface PaginatedAccounts {
    data: Account[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface Props {
    auth?: {
        user?: {
            name: string;
            email: string;
        } | null;
    };
    accounts: PaginatedAccounts;
    filters: {
        search?: string;
        status?: string;
    };
    statistics: {
        total: number;
        active: number;
        suspended: number;
        trial: number;
    };
}

export default function AccountsIndex({ auth, accounts, filters, statistics }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    // Create a form adapter for the search field using the utility function
     
    const searchFormAdapter = createFormAdapter({
        data: { search },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setData: ((keyOrData: any, maybeValue?: any) => {
            // Handle different call signatures
            if (typeof keyOrData === 'string') {
                // (key, value) signature
                if (keyOrData === 'search') {
                    setSearch(maybeValue as string);
                }
            } else if (typeof keyOrData === 'function') {
                // (fn) signature - functional update
                const newData = keyOrData({ search });
                if ('search' in newData) {
                    setSearch(newData.search);
                }
            } else if (typeof keyOrData === 'object') {
                // (data) signature - object update
                if ('search' in keyOrData) {
                    setSearch(keyOrData.search);
                }
            }
        }) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        errors: {},
        clearErrors: () => {},
    });

    // Debounce search to avoid too many requests
    const debouncedSearch = useDebounce(search, 500);

    // Apply filters when debounced search or status changes
    React.useEffect(() => {
        // Only apply filters if they differ from what's already loaded
        const currentSearch = filters.search || '';
        const currentStatus = filters.status || '';

        // Skip if filters haven't changed from what was already loaded
        if (debouncedSearch === currentSearch && status === currentStatus) {
            return;
        }

        const params = new URLSearchParams();

        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        }

        if (status) {
            params.set('status', status);
        }

        const queryString = params.toString();
        const url = `/accounts${queryString ? `?${queryString}` : ''}`;

        router.visit(url, {
            method: 'get',
            preserveState: true,
            preserveScroll: true,
            only: ['accounts'],
        });
    }, [debouncedSearch, status, filters.search, filters.status]);

    // Get status badge variant and color
    const getStatusBadge = (accountStatus: Account['status']) => {
        const config = {
            active: { label: 'Active', className: 'bg-green-100 text-green-800' },
            suspended: { label: 'Suspended', className: 'bg-red-100 text-red-800' },
            maintenance: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-800' },
        };

        return config[accountStatus];
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Handle delete account
    const handleDelete = (accountId: string) => {
        if (
            confirm(
                'Are you sure you want to delete this tenant? This will permanently delete the database and all associated data. This action cannot be undone.',
            )
        ) {
            router.delete(`/accounts/${accountId}`, {
                data: { confirm: true },
                preserveScroll: true,
            });
        }
    };

    return (
        <>
            <Head title="Manage Accounts" />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Header */}
                <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Link href="/">
                                        <Button variant="ghost" size="sm">
                                            ← Back to Dashboard
                                        </Button>
                                    </Link>
                                </div>
                                <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                    Tenant Accounts
                                </h1>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Manage all tenant accounts in the system
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                {auth?.user && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {auth.user.name}
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.post('/logout')}
                                >
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Statistics Cards */}
                    <div className="mb-8 grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs">Total Accounts</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{statistics.total}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs">Active</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {statistics.active}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs">Suspended</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {statistics.suspended}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs">On Trial</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">
                                    {statistics.trial}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters and Actions */}
                    <Card className="mb-6">
                        <CardHeader>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>All Accounts</CardTitle>
                                    <CardDescription>
                                        {accounts.total} {accounts.total === 1 ? 'account' : 'accounts'}{' '}
                                        total
                                    </CardDescription>
                                </div>
                                <Link href="/accounts/create">
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Account
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Filter Controls */}
                            <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                                <div className="flex-1">
                                    <TextInput
                                        form={searchFormAdapter}
                                        name="search"
                                        label="Search"
                                        placeholder="Search by name or subdomain..."
                                    />
                                </div>
                                <div className="w-full sm:w-48">
                                    <label className="text-sm font-medium">Status</label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                            <SelectItem value="maintenance">Maintenance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {status && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-1 h-6 text-xs"
                                            onClick={() => setStatus('')}
                                        >
                                            Clear filter
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Accounts Table */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Domain</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {accounts.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center">
                                                    <div className="flex flex-col items-center justify-center py-12">
                                                        <Building2 className="mb-4 h-12 w-12 text-gray-400" />
                                                        <p className="text-sm text-gray-500">
                                                            No accounts found
                                                        </p>
                                                        {(search || status) && (
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                Try adjusting your filters
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            accounts.data.map((account) => {
                                                const statusBadge = getStatusBadge(account.status);

                                                return (
                                                    <TableRow key={account.id}>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">
                                                                    {account.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {account.subdomain}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className="text-xs text-gray-600">
                                                                {account.domains[0]?.domain || 'N/A'}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="secondary"
                                                                className={statusBadge.className}
                                                            >
                                                                {statusBadge.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {account.subscription ? (
                                                                <div>
                                                                    <div className="font-medium">
                                                                        {account.subscription.plan.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        ${account.subscription.plan.price}
                                                                        /mo
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-gray-500">
                                                                    No plan
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                {formatDate(account.created_at)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0"
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <Link
                                                                        href={`/accounts/${account.id}`}
                                                                    >
                                                                        <DropdownMenuItem>
                                                                            <Eye className="mr-2 h-4 w-4" />
                                                                            View Details
                                                                        </DropdownMenuItem>
                                                                    </Link>
                                                                    <Link
                                                                        href={`/accounts/${account.id}/edit`}
                                                                    >
                                                                        <DropdownMenuItem>
                                                                            <Pencil className="mr-2 h-4 w-4" />
                                                                            Edit
                                                                        </DropdownMenuItem>
                                                                    </Link>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            handleDelete(account.id)
                                                                        }
                                                                        className="text-red-600"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {accounts.last_page > 1 && (
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-sm text-gray-500">
                                        Showing {accounts.from} to {accounts.to} of {accounts.total}{' '}
                                        results
                                    </div>
                                    <div className="flex gap-2">
                                        {Array.from({ length: accounts.last_page }, (_, i) => i + 1).map(
                                            (page) => {
                                                const params = new URLSearchParams();
                                                params.set('page', page.toString());
                                                if (search) {
                                                    params.set('search', search);
                                                }
                                                if (status) {
                                                    params.set('status', status);
                                                }

                                                return (
                                                    <Link
                                                        key={page}
                                                        href={`/accounts?${params.toString()}`}
                                                        preserveScroll
                                                    >
                                                        <Button
                                                            variant={
                                                                page === accounts.current_page
                                                                    ? 'default'
                                                                    : 'outline'
                                                            }
                                                            size="sm"
                                                        >
                                                            {page}
                                                        </Button>
                                                    </Link>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </main>
            </div>
        </>
    );
}

