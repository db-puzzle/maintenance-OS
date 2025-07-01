import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    Edit,
    Key,
    Shield,
    Activity,
    ChevronRight,
    Building2,
    MapPin,
    Hash,
    Eye,
} from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { format } from 'date-fns';

interface User {
    id: number;
    name: string;
    email: string;
    roles: Array<{ id: number; name: string }>;
    permissions: Array<{ id: number; name: string }>;
    created_at: string;
    updated_at: string;
}

interface PermissionNode {
    id: number;
    name: string;
    type: 'plant' | 'area' | 'sector' | 'asset';
    permissions: string[];
    children?: PermissionNode[];
}

interface ActivityLog {
    id: number;
    action: string;
    user: { id: number; name: string };
    created_at: string;
    details: any;
}

interface Props {
    user: User;
    permissionHierarchy: PermissionNode[];
    activityLogs: ActivityLog[];
    canEditUser: boolean;
    canManagePermissions: boolean;
}

export default function UserShow({
    user,
    permissionHierarchy,
    activityLogs,
    canEditUser,
    canManagePermissions
}: Props) {
    const getInitials = useInitials();
    const initials = getInitials(user.name);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const getRoleBadgeColor = (roleName: string) => {
        switch (roleName) {
            case 'Administrator':
                return 'bg-red-500 text-white hover:bg-red-600';
            case 'Plant Manager':
                return 'bg-blue-500 text-white hover:bg-blue-600';
            case 'Area Manager':
                return 'bg-green-500 text-white hover:bg-green-600';
            case 'Sector Manager':
                return 'bg-yellow-500 text-white hover:bg-yellow-600';
            case 'Maintenance Supervisor':
                return 'bg-purple-500 text-white hover:bg-purple-600';
            case 'Technician':
                return 'bg-orange-500 text-white hover:bg-orange-600';
            case 'Viewer':
                return 'bg-gray-500 text-white hover:bg-gray-600';
            default:
                return 'bg-gray-200 text-gray-800 hover:bg-gray-300';
        }
    };

    const getNodeIcon = (type: string) => {
        switch (type) {
            case 'plant':
                return <Building2 className="h-4 w-4" />;
            case 'area':
                return <MapPin className="h-4 w-4" />;
            case 'sector':
                return <Hash className="h-4 w-4" />;
            default:
                return <Eye className="h-4 w-4" />;
        }
    };

    const renderPermissionNode = (node: PermissionNode, depth = 0) => {
        const nodeKey = `${node.type}-${node.id}`;
        const isExpanded = expandedNodes.has(nodeKey);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div key={nodeKey} className={cn('space-y-2', depth > 0 && 'ml-6')}>
                <div className="flex items-start gap-2">
                    {hasChildren && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleNode(nodeKey)}
                        >
                            <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
                        </Button>
                    )}
                    {!hasChildren && <div className="w-6" />}

                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            {getNodeIcon(node.type)}
                            <span className="font-medium">{node.name}</span>
                            <Badge variant="outline" className="text-xs">
                                {node.type}
                            </Badge>
                        </div>

                        {node.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1 ml-6">
                                {node.permissions.map((permission) => (
                                    <Badge key={permission} variant="secondary" className="text-xs">
                                        {permission}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="space-y-2">
                        {node.children!.map((child) => renderPermissionNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const formatActivityTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes} minutes ago`;
        } else if (hours < 24) {
            return `${hours} hours ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <AppLayout>
            <Head title={`User - ${user.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">{user.name}</h2>
                            <p className="text-muted-foreground">{user.email}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {canEditUser && (
                            <Button variant="outline" asChild>
                                <Link href={`/users/${user.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit User
                                </Link>
                            </Button>
                        )}
                        {canManagePermissions && (
                            <Button asChild>
                                <Link href={`/users/${user.id}/permissions`}>
                                    <Key className="mr-2 h-4 w-4" />
                                    Manage Permissions
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* User Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>User Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Roles</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {user.roles.length > 0 ? (
                                        user.roles.map((role) => (
                                            <Badge
                                                key={role.id}
                                                className={getRoleBadgeColor(role.name)}
                                            >
                                                {role.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">No roles assigned</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Permissions</p>
                                <p className="text-2xl font-bold">{user.permissions.length}</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Created</p>
                                <p className="text-sm">{new Date(user.created_at).toLocaleString()}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                                <p className="text-sm">{new Date(user.updated_at).toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="permissions" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="permissions">
                            <Shield className="mr-2 h-4 w-4" />
                            Permissions
                        </TabsTrigger>
                        <TabsTrigger value="activity">
                            <Activity className="mr-2 h-4 w-4" />
                            Activity
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="permissions" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Permission Hierarchy</CardTitle>
                                <CardDescription>
                                    Permissions organized by entity hierarchy
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {permissionHierarchy.length > 0 ? (
                                    <div className="space-y-4">
                                        {permissionHierarchy.map((node) => renderPermissionNode(node))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                        No permissions assigned
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="activity" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>
                                    Permission changes and user actions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {activityLogs.length > 0 ? (
                                    <div className="space-y-4">
                                        {activityLogs.map((log) => (
                                            <div key={log.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-sm">
                                                        <span className="font-medium">{log.user.name}</span>{' '}
                                                        <span className="text-muted-foreground">{log.action}</span>
                                                    </p>
                                                    {log.details && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {JSON.stringify(log.details)}
                                                        </p>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatActivityTime(log.created_at)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                        No recent activity
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
} 