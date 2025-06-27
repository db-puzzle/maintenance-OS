import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RoleManagement from '@/components/permissions/RoleManagement';
import PermissionMatrix from '@/components/permissions/PermissionMatrix';

interface Permission {
    id: number;
    name: string;
    display_name?: string;
    description?: string;
    resource: string;
    action: string;
    scope: string | null;
    scope_entity_name?: string;
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
    permissions?: number[];  // Add this to match what backend sends
}

interface Props {
    permissions: {
        data: Permission[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    roles: Role[];
    resources: string[];
    actions: string[];
    scopes: string[];
    filters: {
        search?: string;
        resource?: string;
        action?: string;
        scope?: string;
    };
}

export default function PermissionsIndex({ permissions, roles }: Props) {
    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Settings', href: '#' },
        { title: 'Permissions', href: '/permissions' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Permission Management" />

            <div className="bg-background flex-shrink-0 border-b">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-semibold">Permission Management</h2>
                            <p className="text-sm text-muted-foreground">Manage system permissions, roles, and access control</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-6 px-6">
                <Tabs defaultValue="roles" className="w-full">
                    <TabsList>
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                        <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
                    </TabsList>

                    <TabsContent value="roles">
                        <RoleManagement roles={roles} />
                    </TabsContent>

                    <TabsContent value="matrix">
                        <PermissionMatrix permissions={permissions.data} roles={roles} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
} 