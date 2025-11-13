import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    Building2,
    Database,
    Flag,
    RefreshCw,
    Settings,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';

// Component interfaces
interface Props {
    auth?: {
        user?: {
            name: string;
            email: string;
        } | null;
    };
    stats: {
        total: number;
        active: number;
        suspended: number;
        trial: number;
        by_plan?: Record<string, number>;
    };
    recentActivity: Array<{
        id: string;
        type: string;
        description: string;
        created_at: string;
    }>;
    tenantHealth: Array<{
        id: string;
        name: string;
        subdomain: string;
        domain: string;
        database_size: string;
        connections?: number;
        users: number;
        created: string;
    }>;
}

export default function AdminDashboard({ auth, stats, recentActivity, tenantHealth }: Props) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['stats', 'recentActivity', 'tenantHealth'] });
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Manual refresh handler
    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['stats', 'recentActivity', 'tenantHealth'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    // Quick actions configuration
    const quickActions = [
        {
            title: 'Manage Accounts',
            description: 'View and manage tenant accounts',
            href: '/accounts',
            icon: Building2,
            count: stats.total,
        },
        {
            title: 'Feature Flags',
            description: 'Control global and plan-based features',
            href: '/features',
            icon: Flag,
        },
        {
            title: 'System Health',
            description: 'Monitor system health and performance',
            href: '/health',
            icon: Database,
        },
        {
            title: 'Settings',
            description: 'Configure system settings',
            href: '#',
            icon: Settings,
        },
    ];

    // Format relative time
    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Header */}
                <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                    Admin Console
                                </h1>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Multi-Tenant Maintenance OS Management
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    size="sm"
                                    variant="outline"
                                >
                                    <RefreshCw
                                        className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                                    />
                                    Refresh
                                </Button>
                                <div className="flex items-center gap-2">
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
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Statistics Cards */}
                    <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                                <Building2 className="h-4 w-4 text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <p className="text-xs text-gray-500">All accounts in system</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Active</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                                <p className="text-xs text-gray-500">
                                    {stats.total > 0
                                        ? `${Math.round((stats.active / stats.total) * 100)}% of total`
                                        : 'No tenants yet'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Suspended</CardTitle>
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {stats.suspended}
                                </div>
                                <p className="text-xs text-gray-500">Requires attention</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">On Trial</CardTitle>
                                <Users className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
                                <p className="text-xs text-gray-500">Convert to paid</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Grid */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Recent Activity */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Recent Activity</CardTitle>
                                        <CardDescription>Latest system events</CardDescription>
                                    </div>
                                    <Activity className="h-5 w-5 text-gray-500" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {recentActivity.length === 0 ? (
                                        <p className="text-sm text-gray-500">No recent activity</p>
                                    ) : (
                                        recentActivity.map((activity) => (
                                            <div
                                                key={activity.id}
                                                className="flex items-start justify-between rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        {activity.description}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {activity.type}
                                                    </p>
                                                </div>
                                                <span className="ml-2 text-xs text-gray-500">
                                                    {formatRelativeTime(activity.created_at)}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {recentActivity.length > 0 && (
                                    <div className="mt-4">
                                        <Link href="/activity">
                                            <Button variant="outline" size="sm" className="w-full">
                                                View All Activity
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Tenant Health */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Tenant Health</CardTitle>
                                        <CardDescription>Database & usage overview</CardDescription>
                                    </div>
                                    <Database className="h-5 w-5 text-gray-500" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {tenantHealth.length === 0 ? (
                                        <p className="text-sm text-gray-500">
                                            No active tenants to monitor
                                        </p>
                                    ) : (
                                        tenantHealth.map((tenant) => (
                                            <Link
                                                key={tenant.id}
                                                href={`/accounts/${tenant.id}`}
                                                className="block"
                                            >
                                                <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium">{tenant.name}</p>
                                                            <Badge variant="outline" className="text-xs">
                                                                {tenant.subdomain}
                                                            </Badge>
                                                        </div>
                                                        <div className="mt-1 flex gap-3 text-xs text-gray-500">
                                                            <span>{tenant.database_size}</span>
                                                            <span>•</span>
                                                            <span>{tenant.users} users</span>
                                                            {tenant.connections !== undefined && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>
                                                                        {tenant.connections} connections
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-green-100 text-green-800"
                                                        >
                                                            Healthy
                                                        </Badge>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {tenant.created}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                                {tenantHealth.length > 0 && (
                                    <div className="mt-4">
                                        <Link href="/health">
                                            <Button variant="outline" size="sm" className="w-full">
                                                View System Health
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-8 space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            Quick Actions
                        </h2>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {quickActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Link key={action.title} href={action.href}>
                                        <Card className="transition-all hover:shadow-md">
                                            <CardHeader>
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-lg bg-primary/10 p-2">
                                                        <Icon className="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="text-lg">
                                                                {action.title}
                                                            </CardTitle>
                                                            {action.count !== undefined && (
                                                                <Badge variant="secondary">
                                                                    {action.count}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <CardDescription>{action.description}</CardDescription>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

