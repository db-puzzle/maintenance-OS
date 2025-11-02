# Admin Portal Interface Design

## Overview

This document details the design and implementation of the super-admin portal for managing all tenant accounts in the Maintenance OS multi-tenant system. The admin portal will be accessible at `admin.maintenance-os.com`.

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication System](#authentication-system)
3. [Dashboard Design](#dashboard-design)
4. [Account Management](#account-management)
5. [Subscription Management](#subscription-management)
6. [Plan Configuration](#plan-configuration)
7. [System Monitoring](#system-monitoring)
8. [Support Tools](#support-tools)
9. [UI Components](#ui-components)
10. [Security Features](#security-features)

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Inertia.js
- **UI Framework**: Tailwind CSS v4 + shadcn/ui components
- **Backend**: Laravel 12
- **Database**: Central PostgreSQL database
- **Charts**: Recharts for data visualization
- **Tables**: TanStack Table (React Table v8)

### Route Structure

```
admin.maintenance-os.com/
├── login                    # Admin authentication
├── dashboard               # Overview dashboard
├── accounts/              # Account management
│   ├── active            # Active accounts
│   ├── suspended         # Suspended accounts
│   ├── terminated        # Terminated accounts
│   └── {id}             # Account details
├── subscriptions/         # Subscription management
├── plans/                # Plan configuration
├── finances/             # Financial overview
├── system/               # System monitoring
├── support/              # Support tools
└── settings/             # Admin settings
```

## Authentication System

### Admin Login Page

```tsx
// resources/js/pages/admin/auth/login.tsx
import React from 'react';
import { useForm } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Mail } from 'lucide-react';

export default function AdminLogin() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
                    <CardDescription>
                        Sign in to manage Maintenance OS accounts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errors.email && (
                            <Alert variant="destructive">
                                <AlertDescription>{errors.email}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@maintenance-os.com"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="remember"
                                checked={data.remember}
                                onChange={e => setData('remember', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="remember" className="text-sm">
                                Remember me
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={processing}
                        >
                            {processing ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
```

### Admin Authentication Controller

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function showLogin(): Response
    {
        return Inertia::render('admin/auth/login');
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        if (Auth::guard('admin')->attempt($request->validated(), $request->boolean('remember'))) {
            $request->session()->regenerate();

            // Log admin activity
            activity()
                ->causedBy(Auth::guard('admin')->user())
                ->withProperties(['ip' => $request->ip()])
                ->log('Admin logged in');

            return redirect()->intended(route('admin.dashboard'));
        }

        return back()->withErrors([
            'email' => 'Invalid credentials.',
        ])->onlyInput('email');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('admin')->logout();
        
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
```

## Dashboard Design

### Main Dashboard Component

```tsx
// resources/js/pages/admin/dashboard.tsx
import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Building2, Users, CreditCard, AlertTriangle,
    TrendingUp, Clock, Database, HardDrive
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/number';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
    stats: {
        totalAccounts: number;
        activeAccounts: number;
        trialAccounts: number;
        suspendedAccounts: number;
        totalUsers: number;
        mrr: number;
        mrrGrowth: number;
        avgAccountValue: number;
        storageUsed: string;
        databasesSize: string;
    };
    revenueChart: Array<{
        date: string;
        revenue: number;
    }>;
    accountsChart: Array<{
        date: string;
        accounts: number;
        trial: number;
        paid: number;
    }>;
    recentActivity: Array<{
        id: number;
        account: string;
        action: string;
        timestamp: string;
    }>;
    alerts: Array<{
        id: number;
        type: 'warning' | 'error' | 'info';
        message: string;
        timestamp: string;
    }>;
}

export default function AdminDashboard({
    stats,
    revenueChart,
    accountsChart,
    recentActivity,
    alerts
}: DashboardProps) {
    const statCards = [
        {
            title: 'Total Accounts',
            value: formatNumber(stats.totalAccounts),
            subValue: `${stats.activeAccounts} active`,
            icon: Building2,
            trend: stats.mrrGrowth > 0 ? 'up' : 'down',
        },
        {
            title: 'Monthly Recurring Revenue',
            value: formatCurrency(stats.mrr),
            subValue: `${stats.mrrGrowth > 0 ? '+' : ''}${stats.mrrGrowth}% vs last month`,
            icon: CreditCard,
            trend: stats.mrrGrowth > 0 ? 'up' : 'down',
        },
        {
            title: 'Total Users',
            value: formatNumber(stats.totalUsers),
            subValue: `Avg ${formatCurrency(stats.avgAccountValue)}/account`,
            icon: Users,
        },
        {
            title: 'System Health',
            value: `${stats.suspendedAccounts} suspended`,
            subValue: `${stats.trialAccounts} on trial`,
            icon: AlertTriangle,
            trend: stats.suspendedAccounts > 0 ? 'warning' : 'good',
        },
    ];

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        System overview and key metrics
                    </p>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                    <div className="space-y-2">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`p-4 rounded-lg flex items-start space-x-3 ${
                                    alert.type === 'error'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                                        : alert.type === 'warning'
                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                                }`}
                            >
                                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{alert.message}</p>
                                    <p className="text-xs opacity-75">{alert.timestamp}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {statCards.map((stat, index) => (
                        <Card key={index}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.title}
                                </CardTitle>
                                <stat.icon className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {stat.subValue}
                                </p>
                                {stat.trend && (
                                    <div className="mt-2">
                                        {stat.trend === 'up' && (
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                        )}
                                        {stat.trend === 'down' && (
                                            <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Charts */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={revenueChart}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#4f46e5"
                                        fill="#4f46e5"
                                        fillOpacity={0.1}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Account Growth</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={accountsChart}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="trial" fill="#fbbf24" name="Trial" />
                                    <Bar dataKey="paid" fill="#4f46e5" name="Paid" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity & System Info */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentActivity.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="flex items-start space-x-3 text-sm"
                                    >
                                        <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p>
                                                <span className="font-medium">{activity.account}</span>
                                                {' '}{activity.action}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {activity.timestamp}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>System Resources</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Database className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm">Total Database Size</span>
                                </div>
                                <span className="text-sm font-medium">{stats.databasesSize}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <HardDrive className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm">Storage Used</span>
                                </div>
                                <span className="text-sm font-medium">{stats.storageUsed}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
```

## Account Management

### Account List Table

```tsx
// resources/js/pages/admin/accounts/index.tsx
import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Eye, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { Account } from '@/types/admin';
import { formatDate } from '@/utils/date';

interface AccountsPageProps {
    accounts: {
        data: Account[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
        };
    };
    filters: {
        search?: string;
        status?: string;
        plan?: string;
    };
}

export default function AccountsPage({ accounts, filters }: AccountsPageProps) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/accounts', { search }, { preserveState: true });
    };

    const columns = [
        {
            header: 'Account',
            accessor: 'name',
            cell: ({ row }: any) => (
                <div>
                    <p className="font-medium">{row.original.name}</p>
                    <p className="text-sm text-gray-500">{row.original.subdomain}.maintenance-os.com</p>
                </div>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: ({ row }: any) => {
                const status = row.original.status;
                const variant = status === 'active' ? 'success' : 
                               status === 'suspended' ? 'warning' : 'destructive';
                return <Badge variant={variant}>{status}</Badge>;
            },
        },
        {
            header: 'Plan',
            accessor: 'subscription',
            cell: ({ row }: any) => (
                <div>
                    <p className="font-medium">{row.original.subscription?.plan.name || 'No plan'}</p>
                    {row.original.trial_ends_at && (
                        <p className="text-sm text-gray-500">
                            Trial ends {formatDate(row.original.trial_ends_at)}
                        </p>
                    )}
                </div>
            ),
        },
        {
            header: 'Users',
            accessor: 'users_count',
            cell: ({ value }: any) => formatNumber(value),
        },
        {
            header: 'Created',
            accessor: 'created_at',
            cell: ({ value }: any) => formatDate(value),
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: ({ row }: any) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.visit(`/admin/accounts/${row.original.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {row.original.status === 'active' && (
                            <DropdownMenuItem 
                                onClick={() => handleSuspend(row.original.id)}
                                className="text-yellow-600"
                            >
                                <Ban className="mr-2 h-4 w-4" />
                                Suspend Account
                            </DropdownMenuItem>
                        )}
                        {row.original.status === 'suspended' && (
                            <DropdownMenuItem 
                                onClick={() => handleActivate(row.original.id)}
                                className="text-green-600"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate Account
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                            onClick={() => handleTerminate(row.original.id)}
                            className="text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Terminate Account
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    const handleSuspend = (accountId: string) => {
        if (confirm('Are you sure you want to suspend this account?')) {
            router.post(`/admin/accounts/${accountId}/suspend`);
        }
    };

    const handleActivate = (accountId: string) => {
        router.post(`/admin/accounts/${accountId}/activate`);
    };

    const handleTerminate = (accountId: string) => {
        if (confirm('Are you sure you want to terminate this account? This action cannot be undone.')) {
            router.post(`/admin/accounts/${accountId}/terminate`);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Accounts
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage all tenant accounts
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <form onSubmit={handleSearch} className="flex-1 max-w-sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="search"
                                placeholder="Search accounts..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </form>
                    
                    <select
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={filters.status || ''}
                        onChange={(e) => router.get('/admin/accounts', { ...filters, status: e.target.value })}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="terminated">Terminated</option>
                    </select>
                    
                    <select
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={filters.plan || ''}
                        onChange={(e) => router.get('/admin/accounts', { ...filters, plan: e.target.value })}
                    >
                        <option value="">All Plans</option>
                        <option value="starter">Starter</option>
                        <option value="professional">Professional</option>
                        <option value="enterprise">Enterprise</option>
                    </select>
                </div>

                <DataTable
                    columns={columns}
                    data={accounts.data}
                    pagination={accounts.meta}
                    onPageChange={(page) => router.get('/admin/accounts', { ...filters, page })}
                />
            </div>
        </AdminLayout>
    );
}
```

### Account Detail View

```tsx
// resources/js/pages/admin/accounts/show.tsx
import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AccountOverview from './components/AccountOverview';
import AccountUsers from './components/AccountUsers';
import AccountSubscription from './components/AccountSubscription';
import AccountActivity from './components/AccountActivity';
import AccountDatabase from './components/AccountDatabase';
import { Account } from '@/types/admin';

interface AccountDetailProps {
    account: Account;
    users: any[];
    activity: any[];
    databaseInfo: {
        size: string;
        tableCount: number;
        recordCounts: Record<string, number>;
    };
}

export default function AccountDetail({ 
    account, 
    users, 
    activity, 
    databaseInfo 
}: AccountDetailProps) {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {account.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {account.subdomain}.maintenance-os.com
                        </p>
                    </div>
                    <Badge 
                        variant={account.status === 'active' ? 'success' : 'warning'}
                        className="text-sm"
                    >
                        {account.status}
                    </Badge>
                </div>

                {/* Alerts */}
                {account.status === 'suspended' && (
                    <Alert variant="warning">
                        <AlertTitle>Account Suspended</AlertTitle>
                        <AlertDescription>
                            Reason: {account.suspension_reason || 'Not specified'}
                            <br />
                            Suspended at: {formatDate(account.suspended_at)}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
                        <TabsTrigger value="subscription">Subscription</TabsTrigger>
                        <TabsTrigger value="database">Database</TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6">
                        <AccountOverview account={account} />
                    </TabsContent>

                    <TabsContent value="users" className="mt-6">
                        <AccountUsers account={account} users={users} />
                    </TabsContent>

                    <TabsContent value="subscription" className="mt-6">
                        <AccountSubscription account={account} />
                    </TabsContent>

                    <TabsContent value="database" className="mt-6">
                        <AccountDatabase account={account} info={databaseInfo} />
                    </TabsContent>

                    <TabsContent value="activity" className="mt-6">
                        <AccountActivity account={account} activity={activity} />
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
```

## Subscription Management

### Subscription Overview

```tsx
// resources/js/pages/admin/subscriptions/index.tsx
import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/utils/format';

interface SubscriptionsPageProps {
    stats: {
        totalSubscriptions: number;
        activeSubscriptions: number;
        trialSubscriptions: number;
        canceledSubscriptions: number;
        mrr: number;
        averageRevenue: number;
        churnRate: number;
        growthRate: number;
    };
    subscriptions: any[];
    upcomingRenewals: any[];
    recentCancellations: any[];
}

export default function SubscriptionsPage({ 
    stats, 
    subscriptions, 
    upcomingRenewals,
    recentCancellations 
}: SubscriptionsPageProps) {
    const activeColumns = [
        {
            header: 'Account',
            accessor: 'account',
            cell: ({ row }: any) => (
                <div>
                    <p className="font-medium">{row.original.account.name}</p>
                    <p className="text-sm text-gray-500">{row.original.account.subdomain}</p>
                </div>
            ),
        },
        {
            header: 'Plan',
            accessor: 'plan',
            cell: ({ row }: any) => row.original.plan.name,
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: ({ row }: any) => (
                <Badge variant={row.original.status === 'active' ? 'success' : 'warning'}>
                    {row.original.status}
                </Badge>
            ),
        },
        {
            header: 'Amount',
            accessor: 'amount',
            cell: ({ row }: any) => formatCurrency(row.original.plan.price),
        },
        {
            header: 'Next Billing',
            accessor: 'current_period_end',
            cell: ({ value }: any) => formatDate(value),
        },
    ];

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Subscriptions
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage and monitor all subscriptions
                    </p>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Monthly Recurring Revenue</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{formatCurrency(stats.mrr)}</p>
                            <p className="text-sm text-gray-500">
                                {stats.growthRate > 0 ? '+' : ''}{stats.growthRate}% growth
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Active Subscriptions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                            <p className="text-sm text-gray-500">
                                {stats.trialSubscriptions} on trial
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Average Revenue</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{formatCurrency(stats.averageRevenue)}</p>
                            <p className="text-sm text-gray-500">Per account</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Churn Rate</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{stats.churnRate}%</p>
                            <p className="text-sm text-gray-500">Last 30 days</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="active">
                    <TabsList>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="renewals">Upcoming Renewals</TabsTrigger>
                        <TabsTrigger value="cancellations">Recent Cancellations</TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Active Subscriptions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <DataTable columns={activeColumns} data={subscriptions} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="renewals" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Upcoming Renewals</CardTitle>
                                <CardDescription>Next 7 days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DataTable columns={activeColumns} data={upcomingRenewals} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="cancellations" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Cancellations</CardTitle>
                                <CardDescription>Last 30 days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recentCancellations.map((cancellation) => (
                                        <div key={cancellation.id} className="border-b pb-4 last:border-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium">{cancellation.account.name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {cancellation.plan.name} - Canceled {formatDate(cancellation.canceled_at)}
                                                    </p>
                                                    {cancellation.cancellation_reason && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Reason: {cancellation.cancellation_reason}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant="destructive">Canceled</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
```

## Plan Configuration

### Plan Management Interface

```tsx
// resources/js/pages/admin/plans/index.tsx
import React, { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Plan } from '@/types/admin';
import { formatCurrency } from '@/utils/number';

interface PlansPageProps {
    plans: Plan[];
    features: string[];
    resources: string[];
}

export default function PlansPage({ plans, features, resources }: PlansPageProps) {
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Plans & Pricing
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Configure subscription plans and limits
                        </p>
                    </div>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Plan
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <PlanForm 
                                features={features} 
                                resources={resources}
                                onSuccess={() => setShowCreateDialog(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {plans.map((plan) => (
                        <Card key={plan.id} className="relative">
                            {plan.is_active && (
                                <Badge className="absolute -top-3 right-4">Active</Badge>
                            )}
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    {plan.name}
                                    <span className="text-2xl">
                                        {formatCurrency(plan.price)}
                                        <span className="text-sm font-normal">/{plan.interval}</span>
                                    </span>
                                </CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Limits</h4>
                                    <ul className="space-y-1 text-sm">
                                        {plan.limits.map((limit) => (
                                            <li key={limit.resource_type} className="flex justify-between">
                                                <span className="text-gray-600">
                                                    {limit.resource_type.replace(/_/g, ' ')}
                                                </span>
                                                <span className="font-medium">
                                                    {limit.limit_value === -1 ? 'Custom' : limit.limit_value}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-2">Features</h4>
                                    <ul className="space-y-1 text-sm">
                                        {plan.features.filter(f => f.enabled).map((feature) => (
                                            <li key={feature.feature_key} className="flex items-center space-x-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                <span>{feature.feature_key.replace(/_/g, ' ')}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingPlan(plan)}
                                    >
                                        <Edit2 className="mr-1 h-3 w-3" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleActive(plan)}
                                    >
                                        {plan.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Edit Dialog */}
                <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
                    <DialogContent className="max-w-2xl">
                        {editingPlan && (
                            <PlanForm 
                                plan={editingPlan}
                                features={features} 
                                resources={resources}
                                onSuccess={() => setEditingPlan(null)}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );

    function handleToggleActive(plan: Plan) {
        router.patch(`/admin/plans/${plan.id}/toggle-active`);
    }
}

// Plan Form Component
function PlanForm({ 
    plan, 
    features, 
    resources, 
    onSuccess 
}: { 
    plan?: Plan;
    features: string[];
    resources: string[];
    onSuccess: () => void;
}) {
    const { data, setData, post, patch, processing, errors } = useForm({
        name: plan?.name || '',
        slug: plan?.slug || '',
        description: plan?.description || '',
        price: plan?.price || 0,
        interval: plan?.interval || 'monthly',
        trial_days: plan?.trial_days || 30,
        limits: resources.reduce((acc, resource) => {
            const existing = plan?.limits.find(l => l.resource_type === resource);
            acc[resource] = existing?.limit_value || 0;
            return acc;
        }, {} as Record<string, number>),
        features: features.reduce((acc, feature) => {
            const existing = plan?.features.find(f => f.feature_key === feature);
            acc[feature] = existing?.enabled || false;
            return acc;
        }, {} as Record<string, boolean>),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (plan) {
            patch(`/admin/plans/${plan.id}`, {
                onSuccess: onSuccess,
            });
        } else {
            post('/admin/plans', {
                onSuccess: onSuccess,
            });
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{plan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
                <DialogDescription>
                    Configure plan details, limits, and features.
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Plan Name</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            required
                        />
                        {errors.name && (
                            <p className="text-sm text-red-600">{errors.name}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="slug">Slug</Label>
                        <Input
                            id="slug"
                            value={data.slug}
                            onChange={e => setData('slug', e.target.value)}
                            required
                            disabled={!!plan}
                        />
                        {errors.slug && (
                            <p className="text-sm text-red-600">{errors.slug}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                        id="description"
                        value={data.description}
                        onChange={e => setData('description', e.target.value)}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="price">Price</Label>
                        <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={data.price}
                            onChange={e => setData('price', parseFloat(e.target.value))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="interval">Billing Interval</Label>
                        <select
                            id="interval"
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                            value={data.interval}
                            onChange={e => setData('interval', e.target.value)}
                        >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="trial_days">Trial Days</Label>
                        <Input
                            id="trial_days"
                            type="number"
                            value={data.trial_days}
                            onChange={e => setData('trial_days', parseInt(e.target.value))}
                            required
                        />
                    </div>
                </div>

                <div>
                    <h3 className="font-medium mb-3">Resource Limits</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        {resources.map((resource) => (
                            <div key={resource} className="flex items-center justify-between space-x-2">
                                <Label htmlFor={`limit_${resource}`} className="flex-1">
                                    {resource.replace(/_/g, ' ')}
                                </Label>
                                <Input
                                    id={`limit_${resource}`}
                                    type="number"
                                    className="w-24"
                                    value={data.limits[resource]}
                                    onChange={e => setData('limits', {
                                        ...data.limits,
                                        [resource]: parseInt(e.target.value),
                                    })}
                                    placeholder="-1 for custom"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-medium mb-3">Features</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        {features.map((feature) => (
                            <div key={feature} className="flex items-center justify-between space-x-2">
                                <Label htmlFor={`feature_${feature}`} className="flex-1">
                                    {feature.replace(/_/g, ' ')}
                                </Label>
                                <Switch
                                    id={`feature_${feature}`}
                                    checked={data.features[feature]}
                                    onCheckedChange={checked => setData('features', {
                                        ...data.features,
                                        [feature]: checked,
                                    })}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onSuccess}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Saving...' : 'Save Plan'}
                    </Button>
                </div>
            </form>
        </>
    );
}
```

## Security Features

### Admin Activity Logging

```php
<?php

namespace App\Services\Admin;

use App\Models\Central\AccountActivity;
use App\Models\Central\AdminActivity;
use Illuminate\Support\Facades\Auth;

class AdminActivityLogger
{
    public static function log(
        string $action,
        string $description,
        ?string $accountId = null,
        array $metadata = []
    ): void {
        $admin = Auth::guard('admin')->user();

        if (!$admin) {
            return;
        }

        $data = [
            'admin_id' => $admin->id,
            'action' => $action,
            'description' => $description,
            'metadata' => array_merge($metadata, [
                'user_agent' => request()->userAgent(),
                'session_id' => session()->getId(),
            ]),
            'ip_address' => request()->ip(),
        ];

        if ($accountId) {
            $data['account_id'] = $accountId;
            AccountActivity::create($data);
        } else {
            AdminActivity::create($data);
        }
    }
}
```

### Two-Factor Authentication

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\TwoFactorService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TwoFactorController extends Controller
{
    protected TwoFactorService $twoFactorService;

    public function __construct(TwoFactorService $twoFactorService)
    {
        $this->twoFactorService = $twoFactorService;
    }

    public function show()
    {
        $admin = auth('admin')->user();

        return Inertia::render('admin/security/two-factor', [
            'enabled' => $admin->two_factor_secret !== null,
            'qrCode' => $this->twoFactorService->generateQrCode($admin),
        ]);
    }

    public function enable(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $admin = auth('admin')->user();
        $secret = $request->session()->get('two_factor_secret');

        if (!$this->twoFactorService->verify($secret, $request->code)) {
            return back()->withErrors(['code' => 'Invalid verification code.']);
        }

        $admin->update([
            'two_factor_secret' => encrypt($secret),
        ]);

        AdminActivityLogger::log(
            'two_factor_enabled',
            'Enabled two-factor authentication'
        );

        return redirect()->route('admin.security.two-factor')
            ->with('success', 'Two-factor authentication enabled successfully.');
    }
}
```

## Admin Layout

```tsx
// resources/js/layouts/admin-layout.tsx
import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, Building2, CreditCard, Package,
    Settings, Users, Activity, HelpCircle, LogOut,
    ChevronDown
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const { admin } = usePage().props;

    const navigation = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Accounts', href: '/admin/accounts', icon: Building2 },
        { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
        { name: 'Plans', href: '/admin/plans', icon: Package },
        { name: 'System', href: '/admin/system', icon: Activity },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-xl font-bold">Admin Portal</h1>
                </div>
                
                <nav className="flex-1 space-y-1 p-4">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.name}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Main content */}
            <div className="pl-64">
                {/* Top bar */}
                <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
                    <div className="flex-1" />
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{admin.name}</span>
                            <ChevronDown className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <Users className="mr-2 h-4 w-4" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/admin/logout" method="post" as="button">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Page content */}
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
```

This comprehensive admin portal design provides a complete interface for managing the multi-tenant system, including account management, subscription handling, plan configuration, and system monitoring. The design follows modern UI patterns using React, TypeScript, and Tailwind CSS, ensuring a professional and user-friendly experience for system administrators.
