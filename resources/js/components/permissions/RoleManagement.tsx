import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, Shield, Users, ChevronRight } from 'lucide-react';
import PermissionGuard from '@/components/PermissionGuard';
import { toast } from 'sonner';

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
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    const handleDelete = (role: Role) => {
        if (role.is_system) {
            toast.error('System roles cannot be deleted.');
            return;
        }

        if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
            router.delete(route('roles.destroy', role.id), {
                onSuccess: () => {
                    toast.success(`Role "${role.name}" has been deleted.`);
                },
                onError: () => {
                    toast.error('Failed to delete the role.');
                }
            });
        }
    };

    const viewPermissions = async (role: Role) => {
        setLoadingPermissions(true);
        try {
            const response = await fetch(route('roles.permissions', role.id));
            const data = await response.json();
            setSelectedRole({ ...role, permissions: data.permissions });
            setShowPermissionDialog(true);
        } catch (error) {
            toast.error('Failed to load role permissions');
        } finally {
            setLoadingPermissions(false);
        }
    };

    // Group permissions by resource
    const groupPermissionsByResource = (permissions: Permission[]) => {
        return permissions.reduce((acc, perm) => {
            const parts = perm.name.split('.');
            const resource = parts[0] || 'unknown';
            if (!acc[resource]) acc[resource] = [];
            acc[resource].push(perm);
            return acc;
        }, {} as Record<string, Permission[]>);
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
                                    disabled={loadingPermissions}
                                >
                                    View Permissions
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>

                                <PermissionGuard permission="roles.update">
                                    <Link href={route('roles.edit', role.id)}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="w-4 h-4" />
                                        </Button>
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
                            {Object.entries(groupPermissionsByResource(selectedRole.permissions)).map(([resource, perms]) => (
                                <div key={resource}>
                                    <h4 className="font-medium mb-2 capitalize">{resource.replace(/-/g, ' ')}</h4>
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