import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    enableCompressedMode?: boolean;
    defaultCompressed?: boolean;
    onCompressedChange?: (compressed: boolean) => void;
}

export default ({ children, breadcrumbs, enableCompressedMode, defaultCompressed, onCompressedChange, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate
        breadcrumbs={breadcrumbs}
        enableCompressedMode={enableCompressedMode}
        defaultCompressed={defaultCompressed}
        onCompressedChange={onCompressedChange}
        {...props}
    >
        {children}
    </AppLayoutTemplate>
);
