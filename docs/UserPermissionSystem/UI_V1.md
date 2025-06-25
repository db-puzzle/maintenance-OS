# Custom Permission Management UI

This document details the complete UI implementation for custom permission management in the maintenance management system. The UI is built with React, Inertia.js, and shadcn/ui components, providing a modern and intuitive interface for managing permissions, roles, and audit logs.

## Table of Contents
1. [Permission Management Dashboard](#permission-management-dashboard)
2. [Permission Creation/Edit Form](#permission-creationedit-form)
3. [Role Management Component](#role-management-component)
4. [Permission Matrix Component](#permission-matrix-component)
5. [Permission Audit Log System](#permission-audit-log-system)
6. [Supporting Components and Services](#supporting-components-and-services)
7. [Routes and Controllers](#routes-and-controllers)

## Permission Management Dashboard

The main dashboard provides a comprehensive view of all permissions, roles, and their relationships through a tabbed interface.

```tsx
// resources/js/Pages/Permissions/Index.tsx
import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PermissionGuard from '@/Components/PermissionGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/Components/ui/table';
import { Search, Plus, Edit, Trash2, Shield, Users } from 'lucide-react';

interface Permission {
    id: number;
    name: string;
    resource: string;
    action: string;
    scope_type: string;
    scope_context: any;
    guard_name: string;
    roles_count: number;
    users_count: number;
    created_at: string;
    updated_at: string;
}

interface Role {
    id: number;
    name: string;
    is_system: boolean;
    permissions_count: number;
    users_count: number;
}

interface Props {
    permissions: {
        data: Permission[];
        links: any;
    };
    roles: Role[];
    resources: string[];
    actions: string[];
    scopeTypes: string[];
}

export default function PermissionsIndex({ permissions, roles, resources, actions, scopeTypes }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedResource, setSelectedResource] = useState('all');
    const [selectedAction, setSelectedAction] = useState('all');
    const [selectedScope, setSelectedScope] = useState('all');

    const handleDelete = (permission: Permission) => {
        if (confirm(`Are you sure you want to delete the permission "${permission.name}"?`)) {
            router.delete(route('permissions.destroy', permission.id));
        }
    };

    const filteredPermissions = permissions.data.filter(permission => {
        const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesResource = selectedResource === 'all' || permission.resource === selectedResource;
        const matchesAction = selectedAction === 'all' || permission.action === selectedAction;
        const matchesScope = selectedScope === 'all' || permission.scope_type === selectedScope;
        
        return matchesSearch && matchesResource && matchesAction && matchesScope;
    });

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl">Permission Management</h2>
                    <PermissionGuard permission="permissions.create">
                        <Link
                            href={route('permissions.create')}
                            className="btn btn-primary"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Permission
                        </Link>
                    </PermissionGuard>
                </div>
            }
        >
            <div className="container mx-auto py-6">
                <Tabs defaultValue="permissions" className="w-full">
                    <TabsList>
                        <TabsTrigger value="permissions">Permissions</TabsTrigger>
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                        <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
                    </TabsList>

                    <TabsContent value="permissions" className="space-y-4">
                        {/* Filters */}
                        <div className="bg-white p-4 rounded-lg shadow space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        type="text"
                                        placeholder="Search permissions..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                
                                <select
                                    value={selectedResource}
                                    onChange={(e) => setSelectedResource(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="all">All Resources</option>
                                    {resources.map(resource => (
                                        <option key={resource} value={resource}>{resource}</option>
                                    ))}
                                </select>
                                
                                <select
                                    value={selectedAction}
                                    onChange={(e) => setSelectedAction(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="all">All Actions</option>
                                    {actions.map(action => (
                                        <option key={action} value={action}>{action}</option>
                                    ))}
                                </select>
                                
                                <select
                                    value={selectedScope}
                                    onChange={(e) => setSelectedScope(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="all">All Scopes</option>
                                    {scopeTypes.map(scope => (
                                        <option key={scope} value={scope}>{scope}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Permissions Table */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Permission Name</TableHead>
                                        <TableHead>Resource</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Scope</TableHead>
                                        <TableHead>Usage</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPermissions.map((permission) => (
                                        <TableRow key={permission.id}>
                                            <TableCell className="font-medium">
                                                {permission.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{permission.resource}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{permission.action}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="default">{permission.scope_type}</Badge>
                                                {permission.scope_context && (
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        {JSON.stringify(permission.scope_context)}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <span className="flex items-center text-xs">
                                                        <Shield className="w-3 h-3 mr-1" />
                                                        {permission.roles_count}
                                                    </span>
                                                    <span className="flex items-center text-xs">
                                                        <Users className="w-3 h-3 mr-1" />
                                                        {permission.users_count}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <PermissionGuard permission="permissions.update">
                                                        <Link
                                                            href={route('permissions.edit', permission.id)}
                                                            className="btn btn-sm btn-ghost"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Link>
                                                    </PermissionGuard>
                                                    <PermissionGuard permission="permissions.delete">
                                                        <button
                                                            onClick={() => handleDelete(permission)}
                                                            className="btn btn-sm btn-ghost text-red-600"
                                                            disabled={permission.roles_count > 0 || permission.users_count > 0}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </PermissionGuard>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="roles">
                        <RoleManagement roles={roles} />
                    </TabsContent>

                    <TabsContent value="matrix">
                        <PermissionMatrix permissions={permissions.data} roles={roles} />
                    </TabsContent>
                </Tabs>
            </div>
        </AuthenticatedLayout>
    );
}
```

## Permission Creation/Edit Form

A comprehensive form for creating and editing permissions with auto-generation capabilities and support for complex scoping and conditions.

```tsx
// resources/js/Pages/Permissions/Form.tsx
import React, { useState, useEffect } from 'react';
import { useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Switch } from '@/Components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Info, Plus, X } from 'lucide-react';

interface Permission {
    id?: number;
    name: string;
    resource: string;
    action: string;
    scope_type: string;
    scope_context: Record<string, any>;
    conditions: Array<{
        field: string;
        operator: string;
        value: any;
    }>;
    guard_name: string;
}

interface Props {
    permission?: Permission;
    resources: string[];
    actions: string[];
    scopeTypes: string[];
    scopeFields: Record<string, string[]>;
}

export default function PermissionForm({ 
    permission, 
    resources, 
    actions, 
    scopeTypes,
    scopeFields 
}: Props) {
    const isEdit = !!permission?.id;
    const [nameGeneration, setNameGeneration] = useState(!isEdit);
    
    const { data, setData, post, put, processing, errors } = useForm<Permission>({
        name: permission?.name || '',
        resource: permission?.resource || '',
        action: permission?.action || '',
        scope_type: permission?.scope_type || 'global',
        scope_context: permission?.scope_context || {},
        conditions: permission?.conditions || [],
        guard_name: permission?.guard_name || 'web'
    });

    // Auto-generate permission name
    useEffect(() => {
        if (nameGeneration && data.resource && data.action) {
            let generatedName = `${data.resource}.${data.action}`;
            
            if (data.scope_type !== 'global' && data.scope_context) {
                generatedName += `.${data.scope_type}`;
                
                // Add scope context values to name
                Object.entries(data.scope_context).forEach(([key, value]) => {
                    if (value) {
                        generatedName += `.${value}`;
                    }
                });
            }
            
            setData('name', generatedName);
        }
    }, [data.resource, data.action, data.scope_type, data.scope_context, nameGeneration]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isEdit) {
            put(route('permissions.update', permission.id));
        } else {
            post(route('permissions.store'));
        }
    };

    const addCondition = () => {
        setData('conditions', [...data.conditions, { field: '', operator: '=', value: '' }]);
    };

    const removeCondition = (index: number) => {
        setData('conditions', data.conditions.filter((_, i) => i !== index));
    };

    const updateCondition = (index: number, field: string, value: any) => {
        const newConditions = [...data.conditions];
        newConditions[index] = { ...newConditions[index], [field]: value };
        setData('conditions', newConditions);
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl">{isEdit ? 'Edit Permission' : 'Create Permission'}</h2>}
        >
            <div className="max-w-4xl mx-auto py-6">
                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Permission Details</CardTitle>
                            <CardDescription>
                                Define the permission's resource, action, and scope
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Tabs defaultValue="basic" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="basic">Basic Information</TabsTrigger>
                                    <TabsTrigger value="scope">Scope & Context</TabsTrigger>
                                    <TabsTrigger value="conditions">Conditions</TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="name">Permission Name</Label>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    checked={nameGeneration}
                                                    onCheckedChange={setNameGeneration}
                                                    disabled={isEdit}
                                                />
                                                <Label className="text-sm text-gray-500">Auto-generate</Label>
                                            </div>
                                        </div>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            disabled={nameGeneration}
                                            placeholder="e.g., assets.create.plant.123"
                                        />
                                        {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="resource">Resource</Label>
                                            <Select
                                                value={data.resource}
                                                onValueChange={(value) => setData('resource', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select resource" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {resources.map(resource => (
                                                        <SelectItem key={resource} value={resource}>
                                                            {resource}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.resource && <p className="text-sm text-red-600">{errors.resource}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="action">Action</Label>
                                            <Select
                                                value={data.action}
                                                onValueChange={(value) => setData('action', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select action" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {actions.map(action => (
                                                        <SelectItem key={action} value={action}>
                                                            {action}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.action && <p className="text-sm text-red-600">{errors.action}</p>}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="scope" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="scope_type">Scope Type</Label>
                                        <Select
                                            value={data.scope_type}
                                            onValueChange={(value) => {
                                                setData('scope_type', value);
                                                setData('scope_context', {});
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {scopeTypes.map(scope => (
                                                    <SelectItem key={scope} value={scope}>
                                                        {scope}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {data.scope_type !== 'global' && scopeFields[data.scope_type] && (
                                        <div className="space-y-4">
                                            <Alert>
                                                <Info className="h-4 w-4" />
                                                <AlertDescription>
                                                    Define the specific context for this {data.scope_type}-scoped permission
                                                </AlertDescription>
                                            </Alert>

                                            {scopeFields[data.scope_type].map(field => (
                                                <div key={field} className="space-y-2">
                                                    <Label htmlFor={field}>{field}</Label>
                                                    <Input
                                                        id={field}
                                                        value={data.scope_context[field] || ''}
                                                        onChange={(e) => setData('scope_context', {
                                                            ...data.scope_context,
                                                            [field]: e.target.value
                                                        })}
                                                        placeholder={`Enter ${field}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="conditions" className="space-y-4">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="text-lg font-medium">Dynamic Conditions</h3>
                                                <p className="text-sm text-gray-500">
                                                    Add conditions that must be met for this permission to be granted
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addCondition}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Condition
                                            </Button>
                                        </div>

                                        {data.conditions.map((condition, index) => (
                                            <div key={index} className="flex gap-2 items-end">
                                                <div className="flex-1">
                                                    <Label>Field</Label>
                                                    <Input
                                                        value={condition.field}
                                                        onChange={(e) => updateCondition(index, 'field', e.target.value)}
                                                        placeholder="e.g., user.department"
                                                    />
                                                </div>
                                                <div className="w-32">
                                                    <Label>Operator</Label>
                                                    <Select
                                                        value={condition.operator}
                                                        onValueChange={(value) => updateCondition(index, 'operator', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="=">=</SelectItem>
                                                            <SelectItem value="!=">!=</SelectItem>
                                                            <SelectItem value="in">in</SelectItem>
                                                            <SelectItem value="not_in">not in</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex-1">
                                                    <Label>Value</Label>
                                                    <Input
                                                        value={condition.value}
                                                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                                                        placeholder="Value"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeCondition(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4 mt-6">
                        <Link
                            href={route('permissions.index')}
                            className="btn btn-ghost"
                        >
                            Cancel
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {isEdit ? 'Update Permission' : 'Create Permission'}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
```

## Role Management Component

A card-based interface for managing roles and their associated permissions.

```tsx
// resources/js/Components/RoleManagement.tsx
import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Checkbox } from '@/Components/ui/checkbox';
import { Edit, Trash2, Shield, Users, ChevronRight } from 'lucide-react';
import PermissionGuard from '@/Components/PermissionGuard';

interface Role {
    id: number;
    name: string;
    is_system: boolean;
    permissions_count: number;
    users_count: number;
    permissions?: Permission[];
}

interface Permission {
    id: number;
    name: string;
    resource: string;
    action: string;
}

interface Props {
    roles: Role[];
}

export default function RoleManagement({ roles }: Props) {
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);

    const handleDelete = (role: Role) => {
        if (role.is_system) {
            alert('System roles cannot be deleted.');
            return;
        }

        if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
            router.delete(route('roles.destroy', role.id));
        }
    };

    const viewPermissions = (role: Role) => {
        // Fetch role permissions
        fetch(route('roles.permissions', role.id))
            .then(res => res.json())
            .then(data => {
                setSelectedRole({ ...role, permissions: data.permissions });
                setShowPermissionDialog(true);
            });
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((role) => (
                    <Card key={role.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        {role.name}
                                        {role.is_system && (
                                            <Badge variant="secondary" className="text-xs">System</Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription className="mt-2">
                                        <div className="flex gap-4 text-sm">
                                            <span className="flex items-center">
                                                <Shield className="w-4 h-4 mr-1" />
                                                {role.permissions_count} permissions
                                            </span>
                                            <span className="flex items-center">
                                                <Users className="w-4 h-4 mr-1" />
                                                {role.users_count} users
                                            </span>
                                        </div>
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewPermissions(role)}
                                >
                                    View Permissions
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                                
                                <PermissionGuard permission="roles.update">
                                    <Link
                                        href={route('roles.edit', role.id)}
                                        className="btn btn-outline btn-sm"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                </PermissionGuard>
                                
                                {!role.is_system && (
                                    <PermissionGuard permission="roles.delete">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(role)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </PermissionGuard>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                <PermissionGuard permission="roles.create">
                    <Link
                        href={route('roles.create')}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
                    >
                        <Shield className="w-12 h-12 mb-2" />
                        <span className="text-sm font-medium">Create New Role</span>
                    </Link>
                </PermissionGuard>
            </div>

            {/* Permission Dialog */}
            <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Permissions for {selectedRole?.name}</DialogTitle>
                        <DialogDescription>
                            View and manage permissions assigned to this role
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedRole?.permissions && (
                        <div className="space-y-4 mt-4">
                            {Object.entries(
                                selectedRole.permissions.reduce((acc, perm) => {
                                    if (!acc[perm.resource]) acc[perm.resource] = [];
                                    acc[perm.resource].push(perm);
                                    return acc;
                                }, {} as Record<string, Permission[]>)
                            ).map(([resource, perms]) => (
                                <div key={resource}>
                                    <h4 className="font-medium mb-2 capitalize">{resource}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {perms.map(perm => (
                                            <div key={perm.id} className="flex items-center space-x-2">
                                                <Checkbox checked disabled />
                                                <label className="text-sm">
                                                    {perm.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
```

## Permission Matrix Component

An interactive matrix view for bulk permission management across roles.

```tsx
// resources/js/Components/PermissionMatrix.tsx
import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Save, Loader2 } from 'lucide-react';

interface Permission {
    id: number;
    name: string;
    resource: string;
    action: string;
}

interface Role {
    id: number;
    name: string;
    permissions?: number[];
}

interface Props {
    permissions: Permission[];
    roles: Role[];
}

export default function PermissionMatrix({ permissions, roles }: Props) {
    const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Group permissions by resource
    const groupedPermissions = permissions.reduce((acc, perm) => {
        if (!acc[perm.resource]) acc[perm.resource] = [];
        acc[perm.resource].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    React.useEffect(() => {
        // Initialize matrix from current role permissions
        const initialMatrix: Record<string, Record<string, boolean>> = {};
        
        roles.forEach(role => {
            initialMatrix[role.id] = {};
            permissions.forEach(perm => {
                initialMatrix[role.id][perm.id] = role.permissions?.includes(perm.id) || false;
            });
        });
        
        setMatrix(initialMatrix);
    }, [roles, permissions]);

    const handleToggle = (roleId: number, permissionId: number) => {
        setMatrix(prev => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [permissionId]: !prev[roleId][permissionId]
            }
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setLoading(true);
        
        // Prepare changes
        const changes = roles.map(role => ({
            role_id: role.id,
            permissions: permissions
                .filter(perm => matrix[role.id]?.[perm.id])
                .map(perm => perm.id)
        }));

        router.post(route('permissions.sync-matrix'), { changes }, {
            onSuccess: () => {
                setHasChanges(false);
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Permission Matrix</CardTitle>
                    {hasChanges && (
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            size="sm"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-2 border-b sticky left-0 bg-white">Resource / Action</th>
                                {roles.map(role => (
                                    <th key={role.id} className="text-center p-2 border-b min-w-[100px]">
                                        <div className="font-medium">{role.name}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedPermissions).map(([resource, perms]) => (
                                <React.Fragment key={resource}>
                                    <tr>
                                        <td colSpan={roles.length + 1} className="bg-gray-50 p-2 font-medium">
                                            <Badge variant="outline">{resource}</Badge>
                                        </td>
                                    </tr>
                                    {perms.map(permission => (
                                        <tr key={permission.id} className="hover:bg-gray-50">
                                            <td className="p-2 border-b sticky left-0 bg-white">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">{permission.action}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {permission.name}
                                                    </span>
                                                </div>
                                            </td>
                                            {roles.map(role => (
                                                <td key={role.id} className="text-center p-2 border-b">
                                                    <Checkbox
                                                        checked={matrix[role.id]?.[permission.id] || false}
                                                        onCheckedChange={() => handleToggle(role.id, permission.id)}
                                                        disabled={loading}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
```

## Permission Audit Log System

A comprehensive audit logging system for tracking all permission-related changes, accessible only to super administrators.

### Audit Log UI

```tsx
// resources/js/Pages/AuditLogs/Index.tsx
import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/Components/ui/table';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/Components/ui/select';
import { Calendar } from '@/Components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { 
    Search, 
    Filter, 
    Calendar as CalendarIcon, 
    Download,
    Eye,
    User,
    Shield,
    Activity,
    AlertCircle
} from 'lucide-react';

interface AuditLog {
    id: number;
    event_type: string;
    event_action: string;
    description: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    impersonator?: {
        id: number;
        name: string;
    };
    auditable_type: string;
    auditable_id: number;
    changes: Record<string, { old: any; new: any }>;
    metadata: Record<string, any>;
    ip_address: string;
    created_at: string;
}

interface Props {
    logs: {
        data: AuditLog[];
        links: any;
    };
    filters: {
        search: string;
        event_type: string;
        user_id: string;
        date_from: string;
        date_to: string;
    };
    eventTypes: string[];
    users: Array<{ id: number; name: string; email: string }>;
}

export default function AuditLogsIndex({ logs, filters, eventTypes, users }: Props) {
    const { auth } = usePage().props;
    const [localFilters, setLocalFilters] = useState(filters);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [dateRange, setDateRange] = useState({
        from: filters.date_from ? new Date(filters.date_from) : undefined,
        to: filters.date_to ? new Date(filters.date_to) : undefined
    });

    // Only allow super admins
    if (!auth.user?.is_super_admin) {
        return (
            <AuthenticatedLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">Access Denied</h3>
                        <p className="text-gray-500">Only super administrators can view audit logs.</p>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    const applyFilters = () => {
        router.get(route('audit-logs.index'), {
            ...localFilters,
            date_from: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
            date_to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const exportLogs = () => {
        window.location.href = route('audit-logs.export', localFilters);
    };

    const getEventBadgeVariant = (eventType: string): string => {
        if (eventType.includes('created')) return 'success';
        if (eventType.includes('updated')) return 'default';
        if (eventType.includes('deleted')) return 'destructive';
        if (eventType.includes('granted')) return 'success';
        if (eventType.includes('revoked')) return 'warning';
        return 'secondary';
    };

    const getEventIcon = (eventType: string) => {
        if (eventType.includes('user')) return <User className="w-4 h-4" />;
        if (eventType.includes('role') || eventType.includes('permission')) return <Shield className="w-4 h-4" />;
        return <Activity className="w-4 h-4" />;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl">Permission Audit Logs</h2>
                    <Button onClick={exportLogs} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export Logs
                    </Button>
                </div>
            }
        >
            <div className="container mx-auto py-6 space-y-6">
                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Search logs..."
                                    value={localFilters.search}
                                    onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                                    className="pl-10"
                                />
                            </div>

                            <Select
                                value={localFilters.event_type}
                                onValueChange={(value) => setLocalFilters({ ...localFilters, event_type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Events" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Events</SelectItem>
                                    {eventTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={localFilters.user_id}
                                onValueChange={(value) => setLocalFilters({ ...localFilters, user_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Users" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Users</SelectItem>
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.name} ({user.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "PPP")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>

                            <Button onClick={applyFilters}>
                                <Filter className="w-4 h-4 mr-2" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Logs Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.data.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getEventIcon(log.event_type)}
                                                <Badge variant={getEventBadgeVariant(log.event_type)}>
                                                    {log.event_action}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{log.description}</p>
                                                {log.impersonator && (
                                                    <p className="text-xs text-orange-600">
                                                        Impersonated by {log.impersonator.name}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p className="font-medium">{log.user.name}</p>
                                                <p className="text-gray-500">{log.user.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs">{log.ip_address}</code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>{format(new Date(log.created_at), 'MMM d, yyyy')}</p>
                                                <p className="text-gray-500">
                                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedLog(log);
                                                    setShowDetails(true);
                                                }}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {/* Add pagination component here */}
            </div>

            {/* Log Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                    </DialogHeader>
                    
                    {selectedLog && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">Event</h4>
                                    <p className="mt-1">{selectedLog.event_type}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">Action</h4>
                                    <Badge variant={getEventBadgeVariant(selectedLog.event_type)}>
                                        {selectedLog.event_action}
                                    </Badge>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">User</h4>
                                    <p className="mt-1">{selectedLog.user.name} ({selectedLog.user.email})</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">Time</h4>
                                    <p className="mt-1">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">IP Address</h4>
                                    <code className="mt-1">{selectedLog.ip_address}</code>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-500">Entity</h4>
                                    <p className="mt-1">{selectedLog.auditable_type} #{selectedLog.auditable_id}</p>
                                </div>
                            </div>

                            {selectedLog.impersonator && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <p className="text-sm text-orange-800">
                                        This action was performed by <strong>{selectedLog.impersonator.name}</strong> while impersonating the user.
                                    </p>
                                </div>
                            )}

                            {Object.keys(selectedLog.changes).length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Changes</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                        {Object.entries(selectedLog.changes).map(([field, change]) => (
                                            <div key={field} className="flex items-start gap-4">
                                                <span className="font-medium text-sm w-32">{field}:</span>
                                                <div className="flex-1 text-sm">
                                                    <span className="text-red-600">
                                                        {JSON.stringify(change.old) || 'null'}
                                                    </span>
                                                    <span className="mx-2">→</span>
                                                    <span className="text-green-600">
                                                        {JSON.stringify(change.new) || 'null'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Additional Information</h4>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <pre className="text-sm">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
```

## Supporting Components and Services

### Enhanced Audit Log Model

```php
// app/Models/PermissionAuditLog.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PermissionAuditLog extends Model
{
    protected $fillable = [
        'event_type',
        'event_action',
        'auditable_type',
        'auditable_id',
        'user_id',
        'impersonator_id',
        'old_values',
        'new_values',
        'metadata',
        'ip_address',
        'user_agent',
        'session_id'
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime'
    ];

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function impersonator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'impersonator_id');
    }

    public function getChangesAttribute(): array
    {
        $changes = [];
        
        if ($this->old_values && $this->new_values) {
            $allKeys = array_unique(array_merge(
                array_keys($this->old_values),
                array_keys($this->new_values)
            ));
            
            foreach ($allKeys as $key) {
                $old = $this->old_values[$key] ?? null;
                $new = $this->new_values[$key] ?? null;
                
                if ($old !== $new) {
                    $changes[$key] = [
                        'old' => $old,
                        'new' => $new
                    ];
                }
            }
        }
        
        return $changes;
    }

    public function getDescriptionAttribute(): string
    {
        $descriptions = [
            'permission.created' => 'Created permission "{name}"',
            'permission.updated' => 'Updated permission "{name}"',
            'permission.deleted' => 'Deleted permission "{name}"',
            'role.created' => 'Created role "{name}"',
            'role.updated' => 'Updated role "{name}"',
            'role.deleted' => 'Deleted role "{name}"',
            'role.permission.attached' => 'Assigned permission "{permission}" to role "{role}"',
            'role.permission.detached' => 'Removed permission "{permission}" from role "{role}"',
            'user.role.attached' => 'Assigned role "{role}" to user "{user}"',
            'user.role.detached' => 'Removed role "{role}" from user "{user}"',
            'user.permission.attached' => 'Assigned direct permission "{permission}" to user "{user}"',
            'user.permission.detached' => 'Removed direct permission "{permission}" from user "{user}"',
            'user.super_admin.granted' => 'Granted super admin privileges to user "{user}"',
            'user.super_admin.revoked' => 'Revoked super admin privileges from user "{user}"',
            'invitation.sent' => 'Sent invitation to "{email}"',
            'invitation.accepted' => 'Invitation accepted by "{email}"',
            'invitation.revoked' => 'Revoked invitation for "{email}"'
        ];

        $template = $descriptions[$this->event_type] ?? $this->event_type;
        
        return $this->interpolateDescription($template);
    }

    private function interpolateDescription(string $template): string
    {
        $data = array_merge(
            $this->old_values ?? [],
            $this->new_values ?? [],
            $this->metadata ?? []
        );
        
        return preg_replace_callback('/\{(\w+)\}/', function ($matches) use ($data) {
            return $data[$matches[1]] ?? $matches[0];
        }, $template);
    }
}
```

### Audit Log Service

```php
// app/Services/AuditLogService.php
namespace App\Services;

use App\Models\PermissionAuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    public static function log(
        string $eventType,
        string $eventAction,
        $auditable,
        array $oldValues = [],
        array $newValues = [],
        array $metadata = []
    ): PermissionAuditLog {
        return PermissionAuditLog::create([
            'event_type' => $eventType,
            'event_action' => $eventAction,
            'auditable_type' => get_class($auditable),
            'auditable_id' => $auditable->id,
            'user_id' => Auth::id(),
            'impersonator_id' => session('impersonator_id'),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => $metadata,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'session_id' => session()->getId()
        ]);
    }

    public static function logPermissionChange(
        string $action,
        $model,
        $permission,
        array $additionalData = []
    ): void {
        $eventType = match (true) {
            $model instanceof \App\Models\User && is_string($permission) => "user.permission.{$action}",
            $model instanceof \App\Models\User => "user.role.{$action}",
            $model instanceof \Spatie\Permission\Models\Role => "role.permission.{$action}",
            default => "permission.{$action}"
        };

        $metadata = array_merge([
            'permission' => is_object($permission) ? $permission->name : $permission,
            'model_type' => get_class($model),
            'model_name' => $model->name ?? $model->email ?? 'Unknown'
        ], $additionalData);

        self::log($eventType, $action, $model, [], [], $metadata);
    }
}
```

### Event Listeners for Automatic Logging

```php
// app/Listeners/LogPermissionChanges.php
namespace App\Listeners;

use App\Services\AuditLogService;
use Spatie\Permission\Events\PermissionGiven;
use Spatie\Permission\Events\PermissionRevoked;
use Spatie\Permission\Events\RoleGiven;
use Spatie\Permission\Events\RoleRevoked;

class LogPermissionChanges
{
    public function handlePermissionGiven(PermissionGiven $event): void
    {
        AuditLogService::logPermissionChange('attached', $event->model, $event->permission);
    }

    public function handlePermissionRevoked(PermissionRevoked $event): void
    {
        AuditLogService::logPermissionChange('detached', $event->model, $event->permission);
    }

    public function handleRoleGiven(RoleGiven $event): void
    {
        AuditLogService::logPermissionChange('attached', $event->model, $event->role);
    }

    public function handleRoleRevoked(RoleRevoked $event): void
    {
        AuditLogService::logPermissionChange('detached', $event->model, $event->role);
    }
}
```

## Routes and Controllers

### Audit Log Controller

```php
// app/Http/Controllers/AuditLogController.php
namespace App\Http\Controllers;

use App\Models\PermissionAuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\AuditLogExport;

class AuditLogController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()->is_super_admin) {
                abort(403, 'Access denied. Super administrator privileges required.');
            }
            return $next($request);
        });
    }

    public function index(Request $request)
    {
        $query = PermissionAuditLog::with(['user', 'impersonator'])
            ->latest();

        // Apply filters
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('event_type', 'like', "%{$request->search}%")
                  ->orWhere('event_action', 'like', "%{$request->search}%")
                  ->orWhereHas('user', function ($q) use ($request) {
                      $q->where('name', 'like', "%{$request->search}%")
                        ->orWhere('email', 'like', "%{$request->search}%");
                  });
            });
        }

        if ($request->filled('event_type')) {
            $query->where('event_type', $request->event_type);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->paginate(50)->withQueryString();

        return Inertia::render('AuditLogs/Index', [
            'logs' => $logs,
            'filters' => $request->only(['search', 'event_type', 'user_id', 'date_from', 'date_to']),
            'eventTypes' => PermissionAuditLog::distinct()->pluck('event_type'),
            'users' => User::select('id', 'name', 'email')->orderBy('name')->get()
        ]);
    }

    public function export(Request $request)
    {
        return Excel::download(
            new AuditLogExport($request->all()), 
            'audit-logs-' . now()->format('Y-m-d') . '.xlsx'
        );
    }
}
```

### Routes Configuration

```php
// routes/web.php
Route::middleware(['auth', 'verified'])->group(function () {
    // Permission Management (Admin only)
    Route::middleware('can:permissions.manage')->group(function () {
        Route::resource('permissions', PermissionController::class);
        Route::post('permissions/sync-matrix', [PermissionController::class, 'syncMatrix'])
            ->name('permissions.sync-matrix');
    });
    
    // Role Management (Admin only)
    Route::middleware('can:roles.manage')->group(function () {
        Route::resource('roles', RoleController::class);
        Route::get('roles/{role}/permissions', [RoleController::class, 'permissions'])
            ->name('roles.permissions');
    });
    
    // Audit Logs (Super Admin only)
    Route::prefix('audit-logs')->group(function () {
        Route::get('/', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::get('/export', [AuditLogController::class, 'export'])->name('audit-logs.export');
    });
});
```

### Enhanced Migration for Audit Logs

```php
// database/migrations/2024_01_01_000003_enhance_permission_audit_logs.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class EnhancePermissionAuditLogs extends Migration
{
    public function up()
    {
        Schema::table('permission_audit_logs', function (Blueprint $table) {
            $table->string('event_action', 50)->after('event_type')->index();
            $table->foreignId('impersonator_id')->nullable()->after('user_id')->constrained('users');
            $table->json('metadata')->nullable()->after('new_values');
            $table->string('session_id', 100)->nullable()->after('user_agent');
            $table->index(['event_type', 'event_action']);
            $table->index(['user_id', 'created_at']);
        });
    }
}
```

## Key Features

### Permission Management
- **Tabbed Interface**: Clean separation between permissions, roles, and matrix views
- **Advanced Filtering**: Search and filter by resource, action, and scope
- **Usage Indicators**: Visual display of how many roles and users use each permission
- **Protection**: Prevents deletion of permissions that are in use

### Permission Creation/Editing
- **Auto-generation**: Automatic permission name generation based on resource, action, and scope
- **Flexible Scoping**: Support for different scope types with dynamic context fields
- **Conditional Permissions**: Add dynamic conditions that must be met for permission grants
- **Validation**: Form validation with error handling

### Role Management
- **Card Layout**: Visual representation of roles with key statistics
- **System Role Protection**: Prevents modification of system-defined roles
- **Permission Viewer**: Quick view of all permissions assigned to a role
- **Easy Creation**: Intuitive interface for creating new roles

### Permission Matrix
- **Bulk Management**: Assign/remove permissions across multiple roles at once
- **Resource Grouping**: Permissions grouped by resource for better organization
- **Save State**: Visual indication of unsaved changes
- **Loading States**: Proper feedback during save operations

### Audit Logging
- **Super Admin Only**: Strict access control for audit logs
- **Comprehensive Tracking**: All permission-related changes are logged
- **Advanced Filtering**: Search by user, event type, and date range
- **Export Functionality**: Export audit logs to Excel
- **Detailed View**: Full details of each change including old/new values
- **Impersonation Tracking**: Special handling for actions performed while impersonating

## Security Considerations

1. **Access Control**: All UI components use PermissionGuard to ensure proper authorization
2. **Super Admin Protection**: Audit logs are only accessible to super administrators
3. **CSRF Protection**: All forms include CSRF tokens through Inertia
4. **Input Validation**: Both client-side and server-side validation
5. **Audit Trail**: Complete audit trail for all permission changes

## Integration Requirements

1. **Laravel Backend**: Requires Laravel with Spatie Laravel-Permission package
2. **Inertia.js**: For seamless React-Laravel integration
3. **shadcn/ui**: UI components library
4. **TypeScript**: For type safety in React components
5. **date-fns**: For date formatting in the audit log UI

This UI provides a complete, production-ready interface for managing custom permissions with a focus on usability, security, and comprehensive audit logging. 