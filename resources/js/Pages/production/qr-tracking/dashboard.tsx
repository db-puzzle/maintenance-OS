import React from 'react';
import { Head } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { QrCode, Package, Users, Activity, Eye, BarChart3, TrendingUp } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Props {
    statistics: {
        total_scans: number;
        today_scans: number;
        active_items: number;
        unique_operators: number;
    };
    recent_events: Array<{
        id: number;
        qr_code: string;
        event_type: string;
        event_data: any;
        scanned_at: string;
        scanned_by: {
            id: number;
            name: string;
        } | null;
    }>;
    event_type_distribution: Record<string, number>;
    daily_trends: Array<{
        date: string;
        count: number;
    }>;
}

const eventTypeColors: Record<string, string> = {
    generated: '#10b981',
    printed: '#3b82f6',
    scan: '#8b5cf6',
    start_production: '#f59e0b',
    complete_production: '#22c55e',
    ship: '#ef4444',
};

const eventTypeLabels: Record<string, string> = {
    generated: 'Generated',
    printed: 'Printed',
    scan: 'Scanned',
    start_production: 'Production Started',
    complete_production: 'Production Completed',
    ship: 'Shipped',
    production: 'Production',
    inventory: 'Inventory',
    quality: 'Quality',
    shipping: 'Shipping',
};

export default function QrTrackingDashboard({ statistics, recent_events, event_type_distribution, daily_trends }: Props) {
    // Prepare data for pie chart
    const pieData = Object.entries(event_type_distribution).map(([type, count]) => ({
        name: eventTypeLabels[type] || type,
        value: count,
        color: eventTypeColors[type] || '#94a3b8',
    }));

    // Prepare data for bar chart
    const barData = daily_trends.map(item => ({
        date: format(new Date(item.date), 'MMM dd'),
        scans: item.count,
    }));

    return (
        <>
            <Head title="QR Tracking Dashboard" />

            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">QR Code Tracking</h1>
                        <p className="text-muted-foreground mt-1">
                            Monitor QR code scans and production tracking activity
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href="/production/tracking/scan">
                                <QrCode className="w-4 h-4 mr-2" />
                                Scan QR Code
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/production/qr-tracking">
                                <Eye className="w-4 h-4 mr-2" />
                                View All Events
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{statistics.total_scans.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">All time</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Scans</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{statistics.today_scans.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Since midnight</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{statistics.active_items.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">With QR codes</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unique Operators</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{statistics.unique_operators.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Active scanners</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="recent">Recent Activity</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Daily Trends */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Daily Scan Trends</CardTitle>
                                    <CardDescription>Number of scans per day (last 7 days)</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={barData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="scans" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                            No scan data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Event Type Distribution */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Event Type Distribution</CardTitle>
                                    <CardDescription>Breakdown of scan events by type</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                            No event data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="recent" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Scan Events</CardTitle>
                                <CardDescription>Latest QR code scanning activity</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recent_events.length > 0 ? (
                                    <div className="space-y-4">
                                        {recent_events.map((event) => (
                                            <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                                            {event.qr_code}
                                                        </code>
                                                        <Badge variant="outline">
                                                            {eventTypeLabels[event.event_type] || event.event_type}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {event.scanned_by ? (
                                                            <span>Scanned by {event.scanned_by.name}</span>
                                                        ) : (
                                                            <span>System generated</span>
                                                        )}
                                                        {' • '}
                                                        {format(new Date(event.scanned_at), 'MMM dd, yyyy HH:mm')}
                                                    </div>
                                                    {event.event_data?.item_number && (
                                                        <div className="text-sm">
                                                            Item: {event.event_data.item_number}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No recent scan events
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
} 