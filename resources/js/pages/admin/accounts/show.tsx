import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertCircle,
    Building2,
    Calendar,
    Database,
    DollarSign,
    HardDrive,
    Pencil,
    RefreshCw,
    Server,
    Trash2,
    Users,
} from 'lucide-react';

// Type definitions
interface Account {
    id: string;
    name: string;
    subdomain: string;
    status: 'active' | 'suspended' | 'maintenance';
    trial_ends_at: string | null;
    suspension_reason: string | null;
    suspended_at: string | null;
    created_at: string;
    metadata: Record<string, any>;
    domains: Array<{ domain: string }>;
    subscription: {
        plan: {
            id: number;
            name: string;
            price: string;
            features: {
                users: number;
                assets: number;
                work_orders: number;
                storage: string;
            };
        };
        status: string;
        trial_ends_at: string | null;
        starts_at: string | null;
    } | null;
}

interface Stats {
    database_size: string;
    connections: number;
    table_count: number;
    user_count: number;
    work_order_count: number;
    asset_count: number;
    created_at: string;
}

interface Props {
    auth?: {
        user?: {
            name: string;
            email: string;
        } | null;
    };
    account: Account;
    stats: Stats;
}

export default function AccountShow({ auth, account, stats }: Props) {
    // Get status badge configuration
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
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Calculate usage percentage
    const calculatePercentage = (current: number, limit: number): number => {
        if (!limit || limit === 0) return 0;
        return Math.min(100, Math.round((current / limit) * 100));
    };

    // Get progress color based on percentage
    const getProgressColor = (percentage: number): string => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    // Handle database operations
    const handleDatabaseOperation = (operation: string) => {
        const confirmations: Record<string, string> = {
            refresh:
                'Are you sure you want to refresh this database? This will DROP all tables and re-run migrations with seeds. This action cannot be undone!',
        };

        if (confirmations[operation]) {
            if (!confirm(confirmations[operation])) {
                return;
            }
        }

        router.post(
            `/accounts/${account.id}/${operation}`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    // Handle delete
    const handleDelete = () => {
        if (
            confirm(
                'Are you sure you want to delete this tenant? This will permanently delete the database and all associated data. This action cannot be undone.',
            )
        ) {
            router.delete(`/accounts/${account.id}`, {
                data: { confirm: true },
            });
        }
    };

    const statusBadge = getStatusBadge(account.status);
    const features = account.subscription?.plan.features;

    // Usage data
    const usageItems = features
        ? [
              {
                  label: 'Users',
                  current: stats.user_count,
                  limit: features.users,
                  icon: Users,
              },
              {
                  label: 'Assets',
                  current: stats.asset_count,
                  limit: features.assets,
                  icon: HardDrive,
              },
              {
                  label: 'Work Orders',
                  current: stats.work_order_count,
                  limit: features.work_orders,
                  icon: Building2,
              },
          ]
        : [];

    return (
        <>
            <Head title={`Account: ${account.name}`} />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Header */}
                <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Link href="/accounts">
                                        <Button variant="ghost" size="sm">
                                            ← Back to Accounts
                                        </Button>
                                    </Link>
                                </div>
                                <div className="mt-2 flex items-center gap-3">
                                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                        {account.name}
                                    </h1>
                                    <Badge variant="secondary" className={statusBadge.className}>
                                        {statusBadge.label}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {account.subdomain} • Created {formatDate(account.created_at)}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Link href={`/accounts/${account.id}/edit`}>
                                    <Button variant="outline">
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                </Link>
                                <Button variant="destructive" onClick={handleDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Suspension Warning */}
                    {account.status === 'suspended' && account.suspension_reason && (
                        <Card className="mb-6 border-red-200 bg-red-50">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                    <div>
                                        <p className="font-medium text-red-900">Account Suspended</p>
                                        <p className="mt-1 text-sm text-red-700">
                                            {account.suspension_reason}
                                        </p>
                                        {account.suspended_at && (
                                            <p className="mt-1 text-xs text-red-600">
                                                Suspended on {formatDate(account.suspended_at)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Left Column - Main Info */}
                        <div className="space-y-6 lg:col-span-2">
                            {/* Account Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Account Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">
                                                Account Name
                                            </p>
                                            <p className="mt-1 text-sm">{account.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">
                                                Subdomain
                                            </p>
                                            <p className="mt-1 text-sm">{account.subdomain}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Domain</p>
                                            <p className="mt-1 text-sm">
                                                <code className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                                                    {account.domains[0]?.domain || 'N/A'}
                                                </code>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Status</p>
                                            <div className="mt-1">
                                                <Badge
                                                    variant="secondary"
                                                    className={statusBadge.className}
                                                >
                                                    {statusBadge.label}
                                                </Badge>
                                            </div>
                                        </div>
                                        {account.metadata.admin_email && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">
                                                    Admin Email
                                                </p>
                                                <p className="mt-1 text-sm">
                                                    {account.metadata.admin_email}
                                                </p>
                                            </div>
                                        )}
                                        {account.metadata.admin_name && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">
                                                    Admin Name
                                                </p>
                                                <p className="mt-1 text-sm">
                                                    {account.metadata.admin_name}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Subscription Details */}
                            {account.subscription && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <DollarSign className="h-5 w-5" />
                                            Subscription & Plan
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">
                                                    Current Plan
                                                </p>
                                                <p className="mt-1 text-lg font-semibold">
                                                    {account.subscription.plan.name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Price</p>
                                                <p className="mt-1 text-lg font-semibold">
                                                    ${account.subscription.plan.price}/month
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">
                                                    Subscription Status
                                                </p>
                                                <p className="mt-1 text-sm capitalize">
                                                    {account.subscription.status}
                                                </p>
                                            </div>
                                            {account.trial_ends_at && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-500">
                                                        Trial Ends
                                                    </p>
                                                    <p className="mt-1 text-sm">
                                                        {formatDate(account.trial_ends_at)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Plan Features */}
                                        <div className="mt-4 rounded-lg border p-4">
                                            <p className="mb-3 text-sm font-medium">Plan Features</p>
                                            <div className="grid gap-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Users:</span>
                                                    <span className="font-medium">
                                                        {features.users}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Assets:</span>
                                                    <span className="font-medium">
                                                        {features.assets}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Work Orders:</span>
                                                    <span className="font-medium">
                                                        {features.work_orders}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Storage:</span>
                                                    <span className="font-medium">
                                                        {features.storage}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button variant="outline" className="w-full">
                                            Change Plan
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Usage & Limits */}
                            {features && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Server className="h-5 w-5" />
                                            Usage & Limits
                                        </CardTitle>
                                        <CardDescription>Current usage vs plan limits</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {usageItems.map((item) => {
                                            const Icon = item.icon;
                                            const percentage = calculatePercentage(
                                                item.current,
                                                item.limit,
                                            );
                                            const progressColor = getProgressColor(percentage);

                                            return (
                                                <div key={item.label} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4 text-gray-500" />
                                                            <span className="text-sm font-medium">
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-semibold">
                                                            {item.current} / {item.limit}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Progress
                                                            value={percentage}
                                                            className="h-2"
                                                        />
                                                        <div className="flex justify-between text-xs text-gray-500">
                                                            <span>{percentage}% used</span>
                                                            {percentage >= 90 && (
                                                                <span className="text-red-600">
                                                                    Near limit!
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Right Column - Database & Operations */}
                        <div className="space-y-6">
                            {/* Database Statistics */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Database className="h-5 w-5" />
                                        Database Statistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Database Size</p>
                                        <p className="mt-1 text-lg font-semibold">
                                            {stats.database_size}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Connections</p>
                                        <p className="mt-1 text-lg font-semibold">{stats.connections}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Tables</p>
                                        <p className="mt-1 text-lg font-semibold">
                                            {stats.table_count}
                                        </p>
                                    </div>
                                    <div className="pt-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => router.reload({ only: ['stats'] })}
                                        >
                                            <RefreshCw className="mr-2 h-3 w-3" />
                                            Refresh Stats
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Database Operations */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Database Operations</CardTitle>
                                    <CardDescription>Manage tenant database</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => handleDatabaseOperation('migrate')}
                                    >
                                        <Database className="mr-2 h-4 w-4" />
                                        Run Migrations
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => handleDatabaseOperation('seed')}
                                    >
                                        <Server className="mr-2 h-4 w-4" />
                                        Seed Database
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => handleDatabaseOperation('clear-cache')}
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Clear Cache
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => handleDatabaseOperation('optimize')}
                                    >
                                        <HardDrive className="mr-2 h-4 w-4" />
                                        Optimize
                                    </Button>
                                    <div className="pt-2">
                                        <Button
                                            variant="destructive"
                                            className="w-full justify-start"
                                            onClick={() => handleDatabaseOperation('refresh')}
                                        >
                                            <AlertCircle className="mr-2 h-4 w-4" />
                                            Refresh Database (Danger!)
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Timeline
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div>
                                        <p className="font-medium text-gray-500">Created</p>
                                        <p>{formatDate(account.created_at)}</p>
                                    </div>
                                    {account.subscription?.starts_at && (
                                        <div>
                                            <p className="font-medium text-gray-500">
                                                Subscription Started
                                            </p>
                                            <p>{formatDate(account.subscription.starts_at)}</p>
                                        </div>
                                    )}
                                    {account.trial_ends_at && (
                                        <div>
                                            <p className="font-medium text-gray-500">Trial Ends</p>
                                            <p>{formatDate(account.trial_ends_at)}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

