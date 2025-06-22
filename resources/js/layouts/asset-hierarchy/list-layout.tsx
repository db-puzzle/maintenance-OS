import { ListTableHeader } from '@/components/table-headers/list-table-header';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ReactNode, useEffect, useState } from 'react';

interface ListLayoutProps {
    children: ReactNode;
    title: string;
    description: string;
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    createRoute?: string;
    onCreateClick?: () => void;
    createButtonText: string;
    actions?: ReactNode;
    defaultCompressed?: boolean;
    onCompressedChange?: (compressed: boolean) => void;
}

export default function ListLayout({
    children,
    title,
    description,
    searchPlaceholder,
    searchValue,
    onSearchChange,
    createRoute,
    onCreateClick,
    createButtonText,
    actions,
    defaultCompressed = false,
    onCompressedChange,
}: ListLayoutProps) {
    const [isCompressed, setIsCompressed] = useState(defaultCompressed);

    // Always call the hook, but handle cases where the provider might not be available
    const sidebarControls = useSidebar();

    // Store the previous sidebar state
    const [previousSidebarOpen, setPreviousSidebarOpen] = useState(() => {
        return sidebarControls ? sidebarControls.state === 'expanded' : true;
    });

    useEffect(() => {
        // When compressed mode changes, toggle sidebar accordingly
        if (sidebarControls && !sidebarControls.isMobile) {
            if (isCompressed) {
                // Store current sidebar state before closing
                setPreviousSidebarOpen(sidebarControls.state === 'expanded');
                // Close sidebar when entering compressed mode
                sidebarControls.setOpen(false);
            } else {
                // Restore previous sidebar state when exiting compressed mode
                sidebarControls.setOpen(previousSidebarOpen);
            }
        }
    }, [isCompressed, sidebarControls, previousSidebarOpen]);

    const handleToggleCompressed = () => {
        const newCompressed = !isCompressed;
        setIsCompressed(newCompressed);
        onCompressedChange?.(newCompressed);
    };

    return (
        <div className="relative flex h-[calc(100vh-3rem)] flex-col">
            {/* Fixed Header Section */}
            <div className="bg-background flex-shrink-0">
                <ListTableHeader
                    title={title}
                    description={description}
                    searchPlaceholder={searchPlaceholder}
                    searchValue={searchValue}
                    onSearchChange={onSearchChange}
                    createRoute={createRoute}
                    onCreateClick={onCreateClick}
                    createButtonText={createButtonText}
                    actions={actions}
                    isCompressed={isCompressed}
                    onToggleCompressed={handleToggleCompressed}
                />
            </div>

            {/* Scrollable Content Area */}
            <div className="bg-sidebar-accent/30 flex-1 overflow-y-auto">
                <div className={cn(
                    'transition-all duration-200 ease-in-out',
                    isCompressed ? 'px-4 py-2 lg:px-6' : 'px-6 py-4 lg:px-8'
                )}>
                    {children}
                </div>
            </div>
        </div>
    );
}
