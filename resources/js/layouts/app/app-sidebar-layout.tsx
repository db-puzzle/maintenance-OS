import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import AutomaticTimezoneDetector from '@/components/AutomaticTimezoneDetector';
import { Toaster } from '@/components/ui/sonner';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { toast } from 'sonner';
import CompressedModeContext from '@/contexts/CompressedModeContext';

interface AppSidebarLayoutProps {
    breadcrumbs?: BreadcrumbItem[];
    enableCompressedMode?: boolean;
    defaultCompressed?: boolean;
    onCompressedChange?: (compressed: boolean) => void;
}

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    enableCompressedMode = false,
    defaultCompressed = false,
    onCompressedChange
}: PropsWithChildren<AppSidebarLayoutProps>) {
    const { auth, flash } = usePage<SharedData>().props;
    const [isCompressed, setIsCompressed] = useState(defaultCompressed);

    // Handle flash messages
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
        if (flash?.warning) {
            toast.warning(flash.warning);
        }
        if (flash?.info) {
            toast.info(flash.info);
        }
    }, [flash]);

    const handleCompressedChange = (compressed: boolean) => {
        setIsCompressed(compressed);
        onCompressedChange?.(compressed);
    };

    return (
        <CompressedModeContext.Provider value={{ isCompressed }}>
            <AppShell variant="sidebar">
                <AppSidebar />
                <AppContent variant="sidebar">
                    <AppSidebarHeader
                        breadcrumbs={breadcrumbs}
                        enableCompressedMode={enableCompressedMode}
                        isCompressed={isCompressed}
                        onCompressedChange={handleCompressedChange}
                    />
                    {children}
                </AppContent>
                {auth?.user && <AutomaticTimezoneDetector currentTimezone={(auth.user.timezone as string) || 'UTC'} userId={auth.user.id} />}
                <Toaster />
            </AppShell>
        </CompressedModeContext.Provider>
    );
}
