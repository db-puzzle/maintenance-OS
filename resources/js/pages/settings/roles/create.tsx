import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
import { TextInput } from '@/components/TextInput';
import { createFormAdapter } from '@/utils/form-adapters';
import { PermissionSelector } from './components/PermissionSelector';
import { EmojiPicker } from './components/EmojiPicker';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

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
        title: 'Create Role',
        href: route('roles.create'),
    },
];

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
}

interface Props {
    permissions: Record<string, Permission[]>;
    roles: Role[];
    can: {
        create: boolean;
    };
}

export default function RoleCreate({ permissions, roles }: Props) {
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
    const [copyFromRole, setCopyFromRole] = useState<string>('');

    const { data, setData, errors, clearErrors, post, processing } = useForm({
        name: '',
        display_name: '',
        description: '',
        parent_role_id: '' as string | null,
        icon: '',
        permissions: [] as number[],
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        setData({
            ...data,
            permissions: selectedPermissions,
            parent_role_id: data.parent_role_id || null,
        });

        post(route('roles.store'));
    };

    const handlePermissionToggle = (permissionId: number) => {
        setSelectedPermissions(prev => {
            if (prev.includes(permissionId)) {
                return prev.filter(id => id !== permissionId);
            }
            return [...prev, permissionId];
        });
    };

    const handleCopyFromRole = (roleId: string) => {
        setCopyFromRole(roleId);
        if (roleId) {
            // In a real implementation, this would fetch permissions for the selected role
            toast.info('Permission copying will be implemented with API integration');
        }
    };


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Role" />

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
                                <Link href={route('roles.index')}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                            </Button>
                            <div>
                                <h1 className="text-2xl font-semibold">Create New Role</h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Define a new role with specific permissions
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                            >
                                <Link href={route('roles.index')}>
                                    Cancel
                                </Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Role
                            </Button>
                        </div>
                    </div>

                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>
                                Set the role name and description
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
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use lowercase letters, numbers, hyphens, and underscores only
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
                                        value={data.parent_role_id || undefined}
                                        onValueChange={(value) => setData('parent_role_id', value)}
                                    >
                                        <SelectTrigger id="parent_role_id">
                                            <SelectValue placeholder="Select parent role..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">None</SelectItem>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={role.id.toString()}>
                                                    {role.display_name || role.name}
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

                    {/* Initial Permissions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Initial Permissions</CardTitle>
                            <CardDescription>
                                Select permissions to assign to this role
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="copy-permissions"
                                        checked={!!copyFromRole}
                                        onCheckedChange={(checked) => {
                                            if (!checked) {
                                                setCopyFromRole('');
                                                setSelectedPermissions([]);
                                            }
                                        }}
                                    />
                                    <Label htmlFor="copy-permissions">
                                        Copy permissions from existing role
                                    </Label>
                                </div>

                                {copyFromRole !== null && (
                                    <Select
                                        value={copyFromRole}
                                        onValueChange={handleCopyFromRole}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role to copy from..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={role.id.toString()}>
                                                    {role.display_name || role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                <div className="border-t pt-4">
                                    <PermissionSelector
                                        permissions={permissions}
                                        selectedPermissions={selectedPermissions}
                                        onPermissionToggle={handlePermissionToggle}
                                        onSelectAll={(ids) => setSelectedPermissions(ids)}
                                        onClearAll={() => setSelectedPermissions([])}
                                    />
                                </div>

                                {selectedPermissions.length > 0 && (
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
                            </div>
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
                                        <li>• Role names must be unique and cannot be changed after creation</li>
                                        <li>• Permissions can be modified later from the role details page</li>
                                        <li>• Entity-scoped permissions require entity assignment when assigning the role to users</li>
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
