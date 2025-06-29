import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    Calendar,
    Filter,
    Download,
    Activity
} from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';
import { format } from 'date-fns';

interface User {
    id: number;
    name: string;
    email: string;
}

interface ActivityLog {
    id: number;
    action: string;
    user: User;
    affectedUser?: User;
    created_at: string;
    details: any;
}

interface Props {
    user: User;
    activities: {
        data: ActivityLog[];
        links: any;
        meta: any;
    };
    filters: {
        action?: string;
        date_from?: string;
        date_to?: string;
    };
    availableActions: string[];
}

export default function UserActivity({ user, activities, filters, availableActions }: Props) {
    const getInitials = useInitials();
    const initials = getInitials(user.name);

    const [localFilters, setLocalFilters] = useState({
        action: filters.action || '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
    });

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
    };

    const applyFilters = () => {
        const params: any = {};
        if (localFilters.action) params.action = localFilters.action;
        if (localFilters.date_from) params.date_from = localFilters.date_from;
        if (localFilters.date_to) params.date_to = localFilters.date_to;

        router.get(`/users/${user.id}/activity`, params, { preserveState: true });
    };

    const clearFilters = () => {
        setLocalFilters({ action: '', date_from: '', date_to: '' });
        router.get(`/users/${user.id}/activity`);
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            'permission.granted': 'Permission Granted',
            'permission.revoked': 'Permission Revoked',
            'role.assigned': 'Role Assigned',
            'role.removed': 'Role Removed',
            'user.created': 'User Created',
            'user.updated': 'User Updated',
            'user.deleted': 'User Deleted',
            'user.login': 'User Login',
            'user.logout': 'User Logout',
        };
        return labels[action] || action;
    };

    const getActionColor = (action: string) => {
        if (action.includes('granted') || action.includes('assigned') || action.includes('created')) {
            return 'bg-green-100 text-green-800';
        }
        if (action.includes('revoked') || action.includes('removed') || action.includes('deleted')) {
            return 'bg-red-100 text-red-800';
        }
        if (action.includes('updated')) {
            return 'bg-blue-100 text-blue-800';
        }
        return 'bg-gray-100 text-gray-800';
    };

    const formatDetails = (details: any) => {
        if (!details || typeof details !== 'object') return null;

        const entries = Object.entries(details).filter(([key]) =>
            !['user_id', 'affected_user_id', 'created_at', 'updated_at'].includes(key)
        );

        if (entries.length === 0) return null;

        return (
            <div className="mt-2 space-y-1">
                {entries.map(([key, value]) => (
                    <div key={key} className="text-xs text-muted-foreground">
                        <span className="font-medium">{key.replace(/_/g, ' ')}:</span>{' '}
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title={`Activity - ${user.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" asChild>
                        <Link href={`/users/${user.id}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">User Activity</h2>
                        <p className="text-muted-foreground">{user.name} • {user.email}</p>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="action">Action Type</Label>
                                <Select
                                    value={localFilters.action}
                                    onValueChange={(value) => handleFilterChange('action', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All actions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All actions</SelectItem>
                                        {availableActions.map((action) => (
                                            <SelectItem key={action} value={action}>
                                                {getActionLabel(action)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_from">From Date</Label>
                                <Input
                                    type="date"
                                    id="date_from"
                                    value={localFilters.date_from}
                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_to">To Date</Label>
                                <Input
                                    type="date"
                                    id="date_to"
                                    value={localFilters.date_to}
                                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                />
                            </div>

                            <div className="flex items-end gap-2">
                                <Button onClick={applyFilters} className="flex-1">
                                    Apply Filters
                                </Button>
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Activity List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Activity Log</CardTitle>
                                <CardDescription>
                                    All activity related to {user.name}
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {activities.data.length > 0 ? (
                            <div className="space-y-4">
                                {activities.data.map((activity) => (
                                    <div key={activity.id} className="border rounded-lg p-4 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={getActionColor(activity.action)}>
                                                        {getActionLabel(activity.action)}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        {format(new Date(activity.created_at), 'PPp')}
                                                    </span>
                                                </div>

                                                <p className="text-sm">
                                                    <span className="font-medium">{activity.user.name}</span>
                                                    {activity.action.includes('granted') && ' granted '}
                                                    {activity.action.includes('revoked') && ' revoked '}
                                                    {activity.action.includes('assigned') && ' assigned '}
                                                    {activity.action.includes('removed') && ' removed '}
                                                    {activity.action.includes('created') && ' created '}
                                                    {activity.action.includes('updated') && ' updated '}
                                                    {activity.action.includes('deleted') && ' deleted '}
                                                    {activity.affectedUser && (
                                                        <>
                                                            {activity.affectedUser.id === user.id ? (
                                                                <span className="font-medium">this user</span>
                                                            ) : (
                                                                <span className="font-medium">{activity.affectedUser.name}</span>
                                                            )}
                                                        </>
                                                    )}
                                                </p>

                                                {formatDetails(activity.details)}
                                            </div>

                                            <Activity className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                No activity found
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {activities.meta.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {activities.meta.from} to {activities.meta.to} of {activities.meta.total} activities
                        </p>
                        <div className="flex gap-2">
                            {activities.links.map((link: any, index: number) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
} 