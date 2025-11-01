import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Shield, AlertCircle } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { TextInput } from '@/components/TextInput';
import { createFormAdapter } from '@/utils/form-adapters';
import { PermissionSelector } from './components/PermissionSelector';
import { EmojiPicker } from './components/EmojiPicker';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface Permission {
    id: number;
    name: string;
    display_name: string | null;
    description: string | null;
    resource: string;
    action: string;
    scope: string | null;
    is_global: boolean;
    is_scoped: boolean;
}

interface Role {
    id: number;
    name: string;
    display_name: string | null;
    description: string | null;
    icon: string | null;
    is_system: boolean;
    is_administrator: boolean;
    parent_role_id: number | null;
    can_be_modified: boolean;
}

interface Props {
    role: Role;
    permissions: Record<string, Permission[]>;
    rolePermissionIds: number[];
    roles: Array<{ id: number; name: string; display_name: string | null }>;
    can: {
        update: boolean;
    };
}

export default function RoleEdit({ role, permissions, rolePermissionIds, roles }: Props) {
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>(rolePermissionIds);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Settings',
            href: '/settings',
        },
        {
            title: 'Roles',
            href: '/settings/roles',
        },
        {
            title: role.display_name || role.name,
            href: route('roles.show', { role: role.id }),
        },
        {
            title: 'Edit',
            href: '#', // Current page, no need to link
        },
    ];

    const { data, setData, errors, clearErrors, put, processing } = useForm({
        name: role.name,
        display_name: role.display_name || '',
        description: role.description || '',
        parent_role_id: role.parent_role_id?.toString() || '',
        icon: role.icon || '',
        permissions: rolePermissionIds,
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        setData({
            ...data,
            permissions: selectedPermissions,
            parent_role_id: data.parent_role_id || null,
        } as any);

        put(route('roles.update', { role: role.id }));
    };

    const handlePermissionToggle = (permissionId: number) => {
        setSelectedPermissions(prev => {
            if (prev.includes(permissionId)) {
                return prev.filter(id => id !== permissionId);
            }
            return [...prev, permissionId];
        });
    };


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Role: ${role.display_name || role.name}`} />

            <div className="px-4 sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                asChild
                            >
                                <Link href={route('roles.show', { role: role.id })}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                            </Button>
                            <div>
                                <h1 className="text-2xl font-semibold">Edit Role</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Modify role settings and permissions
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                            >
                                <Link href={route('roles.show', { role: role.id })}>
                                    Cancel
                                </Link>
                            </Button>
                            <Button type="submit" disabled={processing || !role.can_be_modified}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        </div>
                    </div>

                    {/* Warning for Administrator Role */}
                    {role.is_administrator && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                This is the Administrator role. Some modifications are restricted to prevent system lockout.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Warning for System Role */}
                    {role.is_system && !role.is_administrator && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                This is a system role. Some properties cannot be modified.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>
                                Update the role name and description
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Role Name *</Label>
                                    <TextInput
                                        form={formAdapter}
                                        name="name"
                                        label="Role Name"
                                        placeholder="e.g., equipment-specialist"
                                        required
                                        disabled={role.is_system}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {role.is_system
                                            ? 'System role names cannot be changed'
                                            : 'Use lowercase letters, numbers, hyphens, and underscores only'
                                        }
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="display_name">Display Name</Label>
                                    <TextInput
                                        form={formAdapter}
                                        name="display_name"
                                        label="Display Name"
                                        placeholder="e.g., Equipment Specialist"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        User-friendly name shown in the UI
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Describe the purpose and responsibilities of this role"
                                    rows={3}
                                    maxLength={500}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">{errors.description}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="parent_role_id">Parent Role (Optional)</Label>
                                    <Select
                                        value={data.parent_role_id}
                                        onValueChange={(value) => setData('parent_role_id', value)}
                                        disabled={role.is_system}
                                    >
                                        <SelectTrigger id="parent_role_id">
                                            <SelectValue placeholder="Select parent role..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">None</SelectItem>
                                            {roles.map((r) => (
                                                <SelectItem key={r.id} value={r.id.toString()}>
                                                    {r.display_name || r.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.parent_role_id && (
                                        <p className="text-sm text-destructive">{errors.parent_role_id}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="icon">Role Icon</Label>
                                    <EmojiPicker
                                        value={data.icon}
                                        onChange={(emoji) => setData('icon', emoji)}
                                        placeholder="Choose an icon..."
                                    />
                                    {errors.icon && (
                                        <p className="text-sm text-destructive">{errors.icon}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Permissions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Permissions</CardTitle>
                            <CardDescription>
                                Manage permissions assigned to this role
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <PermissionSelector
                                permissions={permissions}
                                selectedPermissions={selectedPermissions}
                                onPermissionToggle={handlePermissionToggle}
                                onSelectAll={(ids) => setSelectedPermissions(ids)}
                                onClearAll={() => setSelectedPermissions([])}
                                disabled={role.is_administrator}
                            />

                            {role.is_administrator && (
                                <Alert>
                                    <Shield className="h-4 w-4" />
                                    <AlertDescription>
                                        Administrator role has full system access. Permissions cannot be modified.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {selectedPermissions.length > 0 && !role.is_administrator && (
                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            Selected Permissions: {selectedPermissions.length}
                                        </p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedPermissions([])}
                                        >
                                            Clear All
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info Box */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                                <div>
                                    <p className="font-medium">Important Notes</p>
                                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                        <li>• Changes to permissions will affect all users with this role</li>
                                        <li>• Entity-scoped permissions require entity assignment when assigning the role to users</li>
                                        <li>• System roles have limited modification options to maintain system integrity</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
