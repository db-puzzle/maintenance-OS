import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface AppSidebarHeaderProps {
    breadcrumbs?: BreadcrumbItemType[];
    enableCompressedMode?: boolean;
    isCompressed?: boolean;
    onCompressedChange?: (compressed: boolean) => void;
}

export function AppSidebarHeader({
    breadcrumbs = [],
    enableCompressedMode = false,
    isCompressed = false,
    onCompressedChange
}: AppSidebarHeaderProps) {
    const sidebarControls = useSidebar();
    // Track previous compression state to detect changes
    const prevIsCompressed = useRef(isCompressed);

    useEffect(() => {
        // Only sync sidebar when compression state actually changes and compressed mode is enabled
        if (enableCompressedMode && sidebarControls && !sidebarControls.isMobile && prevIsCompressed.current !== isCompressed) {
            if (isCompressed) {
                // Entering compressed mode - close sidebar
                sidebarControls.setOpen(false);
            } else {
                // Exiting compressed mode - open sidebar
                sidebarControls.setOpen(true);
            }
            // Update the previous state
            prevIsCompressed.current = isCompressed;
        }
    }, [isCompressed, sidebarControls, enableCompressedMode]);

    const handleToggleCompressed = () => {
        onCompressedChange?.(!isCompressed);
    };

    return (
        <header className="border-sidebar-border/50 flex h-12 shrink-0 grow-0 items-center justify-between gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            {enableCompressedMode && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleToggleCompressed}
                                className={cn('h-8 w-8 flex-shrink-0 transition-all duration-200')}
                            >
                                {isCompressed ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isCompressed ? 'Expandir visualização' : 'Comprimir visualização'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </header>
    );
}
