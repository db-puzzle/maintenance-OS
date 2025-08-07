import { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    ArrowLeft,
    Shield,
    UserPlus,
    Building2,
    MapPin,
    Hash,
    Search,
    ChevronRight,
    ChevronDown,
    Copy
} from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import axios from 'axios';
interface User {
    id: number;
    name: string;
    email: string;
    roles: Array<{ id: number; name: string }>;
    permissions: Array<{ id: number; name: string }>;
}
interface Permission {
    id: number;
    name: string;
    exists?: boolean;
}
interface PermissionNode {
    id: number;
    name: string;
    type: 'plant' | 'area' | 'sector' | 'asset';
    permissions: string[];
    children?: PermissionNode[];
}
interface HistoryItem {
    id: number;
    action: string;
    user: { id: number; name: string };
    permission?: string;
    role?: string;
    created_at: string;
}
interface Props {
    user: User;
    permissionHierarchy: PermissionNode[];
    grantablePermissions: Permission[];
    permissionHistory: HistoryItem[];
    roles: Array<{ id: number; name: string }>;
    users: User[];
    canGrantPermissions: boolean;
}
export default function UserPermissions({
    user,
    permissionHierarchy,
    permissionHistory,
    roles: initialRoles,
    users: initialUsers,
    canGrantPermissions
}: Props) {
    const getInitials = useInitials();
    const initials = getInitials(user.name);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [showRoleDialog, setShowRoleDialog] = useState(false);
    const [showCopyDialog, setShowCopyDialog] = useState(false);
    const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
    const [entities, setEntities] = useState<{ plants: Record<string, unknown>[], areas: Record<string, unknown>[], sectors: Record<string, unknown>[] }>({ plants: [], areas: [], sectors: [] });
    const { data: roleData, setData: setRoleData, post: postRole, processing: processingRole } = useForm({
        role_id: '',
        entity_type: '',
        entity_id: '',
        assign_role: true as boolean,
    });
    const { data: copyData, setData: setCopyData, post: postCopy, processing: processingCopy } = useForm({
        source_user_id: '',
        merge: false as boolean,
    });
    useEffect(() => {
        // Load available permissions
        axios.get(`/users/${user.id}/permissions/available`)
            .then(response => setAvailablePermissions(response.data.permissions))
            .catch(error => console.error('Error loading available permissions:', error));
        // Roles are already provided via props, no need to load them
        // Load entities
        Promise.all([
            axios.get('/asset-hierarchy/plants'),
            axios.get('/asset-hierarchy/areas'),
            axios.get('/asset-hierarchy/sectors')
        ]).then(([plants, areas, sectors]) => {
            setEntities({
                plants: plants.data.plants || [],
                areas: areas.data.areas || [],
                sectors: sectors.data.sectors || []
            });
        }).catch(error => console.error('Error loading entities:', error));
        // Users are already provided via props, no need to load them
    }, [user.id]);
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
    const handleGrantPermissions = () => {
        const permissions = Array.from(selectedPermissions);
        router.post(`/users/${user.id}/permissions/grant`, { permissions }, {
            onSuccess: () => {
                setSelectedPermissions(new Set());
                // Reload available permissions
                axios.get(`/users/${user.id}/permissions/available`)
                    .then(response => setAvailablePermissions(response.data.permissions));
            }
        });
    };
    const handleRevokePermission = (permission: string) => {
        if (confirm(`Are you sure you want to revoke the permission "${permission}"?`)) {
            router.post(`/users/${user.id}/permissions/revoke`, { permissions: [permission] });
        }
    };
    const handleRoleApplication = (e: React.FormEvent) => {
        e.preventDefault();
        postRole(`/users/${user.id}/roles/apply`, {
            onSuccess: () => setShowRoleDialog(false)
        });
    };
    const handleCopyPermissions = (e: React.FormEvent) => {
        e.preventDefault();
        postCopy(`/users/${user.id}/permissions/copy/${user.id}`, {
            onSuccess: () => setShowCopyDialog(false)
        });
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
                return <Shield className="h-4 w-4" />;
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
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
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
                            <Badge variant="secondary" className="text-xs">
                                {node.permissions.length} permissions
                            </Badge>
                        </div>
                        {node.permissions.length > 0 && (
                            <div className="grid gap-2 ml-6">
                                {node.permissions.map((permission) => (
                                    <div key={permission} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                        <code className="text-sm">{permission}</code>
                                        {canGrantPermissions && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRevokePermission(permission)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                Revoke
                                            </Button>
                                        )}
                                    </div>
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
    const filterPermissions = (permissions: Permission[]) => {
        if (!searchQuery) return permissions;
        return permissions.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };
    return (
        <AppLayout>
            <Head title={`Permissions - ${user.name}`} />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
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
                            <h2 className="text-2xl font-bold tracking-tight">Manage Permissions</h2>
                            <p className="text-muted-foreground">{user.name} • {user.email}</p>
                        </div>
                    </div>
                    {canGrantPermissions && (
                        <div className="flex gap-2">
                            <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Apply Role
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <form onSubmit={handleRoleApplication}>
                                        <DialogHeader>
                                            <DialogTitle>Apply Role to Entity</DialogTitle>
                                            <DialogDescription>
                                                Select a role and entity to grant all associated permissions
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="role">Role</Label>
                                                <Select
                                                    value={roleData.role_id}
                                                    onValueChange={(value) => setRoleData('role_id', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {initialRoles?.map((role) => (
                                                            <SelectItem key={role.id} value={role.id.toString()}>
                                                                {role.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="entity-type">Entity Type</Label>
                                                <Select
                                                    value={roleData.entity_type}
                                                    onValueChange={(value) => setRoleData('entity_type', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select entity type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Plant">Plant</SelectItem>
                                                        <SelectItem value="Area">Area</SelectItem>
                                                        <SelectItem value="Sector">Sector</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {roleData.entity_type && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="entity">Entity</Label>
                                                    <Select
                                                        value={roleData.entity_id}
                                                        onValueChange={(value) => setRoleData('entity_id', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={`Select ${roleData.entity_type.toLowerCase()}`} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(roleData.entity_type === 'Plant' ? entities.plants :
                                                                roleData.entity_type === 'Area' ? entities.areas :
                                                                    entities.sectors)?.map((entity: Record<string, unknown>) => (
                                                                        <SelectItem key={String(entity.id)} value={String(entity.id)}>
                                                                            {String(entity.name)}
                                                                        </SelectItem>
                                                                    ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="assign-role"
                                                    checked={roleData.assign_role}
                                                    onCheckedChange={(checked) => setRoleData('assign_role', !!checked)}
                                                />
                                                <Label htmlFor="assign-role" className="text-sm font-normal">
                                                    Also assign the role to the user
                                                </Label>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setShowRoleDialog(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={processingRole}>
                                                Apply Permissions
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy Permissions
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <form onSubmit={handleCopyPermissions}>
                                        <DialogHeader>
                                            <DialogTitle>Copy Permissions from User</DialogTitle>
                                            <DialogDescription>
                                                Copy all permissions from another user to {user.name}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="source-user">Source User</Label>
                                                <Select
                                                    value={copyData.source_user_id}
                                                    onValueChange={(value) => setCopyData('source_user_id', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select user to copy from" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {initialUsers?.filter(u => u.id !== user.id).map((u) => (
                                                            <SelectItem key={u.id} value={u.id.toString()}>
                                                                {u.name} ({u.permissions?.length || 0} permissions)
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="merge"
                                                    checked={copyData.merge}
                                                    onCheckedChange={(checked) => setCopyData('merge', !!checked)}
                                                />
                                                <Label htmlFor="merge" className="text-sm font-normal">
                                                    Merge with existing permissions (keep current permissions)
                                                </Label>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setShowCopyDialog(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={processingCopy}>
                                                Copy Permissions
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>
                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Permissions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{user.permissions.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Assigned Roles
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-1">
                                {user.roles.map((role) => (
                                    <Badge key={role.id} variant="secondary">
                                        {role.name}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Available to Grant
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{availablePermissions.length}</p>
                        </CardContent>
                    </Card>
                </div>
                {/* Tabs */}
                <Tabs defaultValue="current" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="current">Current Permissions</TabsTrigger>
                        <TabsTrigger value="grant">Grant Permissions</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="current" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Current Permissions</CardTitle>
                                <CardDescription>
                                    Permissions organized by entity hierarchy
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {permissionHierarchy.length > 0 ? (
                                    <ScrollArea className="h-[600px] pr-4">
                                        <div className="space-y-4">
                                            {permissionHierarchy.map((node) => renderPermissionNode(node))}
                                        </div>
                                    </ScrollArea>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                        No permissions assigned
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="grant" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Grant New Permissions</CardTitle>
                                <CardDescription>
                                    Select permissions to grant to this user
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search permissions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="max-w-sm"
                                    />
                                </div>
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-2">
                                        {filterPermissions(availablePermissions).map((permission) => (
                                            <div key={permission.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                                                <Checkbox
                                                    id={`perm-${permission.id}`}
                                                    checked={selectedPermissions.has(permission.name)}
                                                    onCheckedChange={(checked) => {
                                                        const next = new Set(selectedPermissions);
                                                        if (checked) {
                                                            next.add(permission.name);
                                                        } else {
                                                            next.delete(permission.name);
                                                        }
                                                        setSelectedPermissions(next);
                                                    }}
                                                />
                                                <Label
                                                    htmlFor={`perm-${permission.id}`}
                                                    className="flex-1 text-sm font-mono cursor-pointer"
                                                >
                                                    {permission.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {selectedPermissions.size > 0 && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                {selectedPermissions.size} permissions selected
                                            </p>
                                            <Button
                                                onClick={handleGrantPermissions}
                                                disabled={selectedPermissions.size === 0}
                                            >
                                                Grant Selected Permissions
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="history" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Permission History</CardTitle>
                                <CardDescription>
                                    Recent permission changes for this user
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="space-y-3">
                                        {permissionHistory.map((item) => (
                                            <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-sm">
                                                        <span className="font-medium">{item.user.name}</span>{' '}
                                                        <span className="text-muted-foreground">
                                                            {item.action === 'permission.granted' && 'granted'}
                                                            {item.action === 'permission.revoked' && 'revoked'}
                                                            {item.action === 'role.assigned' && 'assigned role'}
                                                            {item.action === 'role.removed' && 'removed role'}
                                                        </span>{' '}
                                                        {item.permission && (
                                                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                                {item.permission}
                                                            </code>
                                                        )}
                                                        {item.role && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {item.role}
                                                            </Badge>
                                                        )}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(item.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
} 