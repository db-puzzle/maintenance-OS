import React from 'react';
import { usePage } from '@inertiajs/react';

interface Props {
    permission: string | string[];
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

export default function PermissionGuard({ permission, fallback = null, children }: Props) {
    const { auth } = usePage().props as any;

    if (!auth.user) {
        return <>{fallback}</>;
    }

    // Administrators have all permissions
    if (auth.user.roles?.some((role: any) => role.name === 'Administrator')) {
        return <>{children}</>;
    }

    // Check if user has permission
    const permissions = Array.isArray(permission) ? permission : [permission];
    const userPermissions = auth.permissions || [];

    const hasPermission = permissions.some(p => userPermissions.includes(p));

    if (hasPermission) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
} 