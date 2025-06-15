'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MainSelectionTab, MainSelectionTabList, MainSelectionTabTrigger } from '@/components/ui/main-selection-tab';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';

import { Link } from '@inertiajs/react';
import { Check, Maximize2, Minimize2 } from 'lucide-react';
import { useState, type ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
    id: string;
    label: string;
    content: ReactNode;
}

interface ShowLayoutProps {
    title: string;
    subtitle?: string | ReactNode;
    editRoute: string;
    tabs: Tab[];
    children?: ReactNode;
    showEditButton?: boolean;
    defaultActiveTab?: string;
    onCompressedChange?: (compressed: boolean) => void;
    defaultCompressed?: boolean;
}

export default function ShowLayout({
    title,
    subtitle,
    editRoute,
    tabs,
    children,
    showEditButton = false,
    defaultActiveTab,
    onCompressedChange,
    defaultCompressed = false,
}: ShowLayoutProps) {
    const [activeTab, setActiveTab] = useState(defaultActiveTab || (tabs && tabs.length > 0 ? tabs[0].id : ''));
    const [isCompressed, setIsCompressed] = useState(defaultCompressed);

    // Try to use sidebar hook, but handle cases where it might not be available
    let sidebarControls: ReturnType<typeof useSidebar> | null = null;
    try {
        sidebarControls = useSidebar();
    } catch {
        // ShowLayout is not within a SidebarProvider
    }

    // Store the previous sidebar state
    const [previousSidebarOpen, setPreviousSidebarOpen] = useState(() => {
        return sidebarControls ? sidebarControls.state === 'expanded' : true;
    });

    // Simple animation class for all tabs
    const tabAnimationClass = "animate-in fade-in-2 slide-in-from-top-5 duration-200";

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
    }, [isCompressed, sidebarControls?.isMobile]);

    const handleToggleCompressed = () => {
        const newCompressed = !isCompressed;
        setIsCompressed(newCompressed);
        onCompressedChange?.(newCompressed);
    };

    return (
        <div className="relative flex flex-col h-[calc(100vh-3rem)]">
            {/* Fixed Header Section */}
            <div className="flex-shrink-0 bg-background">
                {/* Title and Actions */}
                <div className={cn(
                    "transition-all duration-200 ease-in-out border-gray-200 dark:border-gray-800",
                    isCompressed ? "py-2 border-b" : "px-6 lg:px-8 py-4"
                )}>
                    <div className={cn(
                        "flex items-start justify-between gap-2 transition-all duration-200 ease-in-out",
                        isCompressed ? "gap-2 px-6 lg:px-8" : "",
                        !isCompressed && ""
                    )}>
                        <div className={cn(
                            "flex-1 transition-all duration-200 ease-in-out",
                            isCompressed ? "flex items-center gap-4" : "space-y-1"
                        )}>
                            <h1 className={cn(
                                "text-foreground font-semibold transition-all duration-200 ease-in-out",
                                isCompressed ? "text-base lg:text-lg leading-6" : "text-xl lg:text-2xl leading-7"
                            )}>{title}</h1>

                            {/* Inline tabs for compressed mode - Desktop only */}
                            {isCompressed && tabs && tabs.length > 0 && (
                                <div className="hidden md:flex items-center gap-1 flex-1">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "py-1 px-3 text-sm rounded-md transition-all duration-200",
                                                "hover:bg-muted/50",
                                                activeTab === tab.id
                                                    ? "bg-muted text-foreground font-medium"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Mobile Select for compressed mode - Inline */}
                            {isCompressed && tabs && tabs.length > 0 && (
                                <div className="md:hidden flex-1 min-w-0">
                                    <Select value={activeTab} onValueChange={setActiveTab}>
                                        <SelectTrigger className="w-full h-8 text-sm">
                                            <SelectValue>{tabs.find((tab) => tab.id === activeTab)?.label}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tabs.map((tab) => (
                                                <SelectItem key={tab.id} value={tab.id} className="flex items-center gap-2">
                                                    <div className="w-4">{activeTab === tab.id && <Check className="h-4 w-4" />}</div>
                                                    {tab.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {!isCompressed && subtitle && (
                                <p className={cn(
                                    "text-muted-foreground text-sm leading-5 transition-all duration-200 ease-in-out"
                                )}>{subtitle}</p>
                            )}
                        </div>
                        {/* Buttons */}
                        <div className="flex items-start gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleToggleCompressed}
                                            className={cn(
                                                "h-8 w-8 transition-all duration-200 flex-shrink-0"
                                            )}
                                        >
                                            {isCompressed ? (
                                                <Minimize2 className="h-4 w-4" />
                                            ) : (
                                                <Maximize2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isCompressed ? "Expandir visualização" : "Comprimir visualização"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {showEditButton && (
                                <Button asChild className="hidden sm:inline-flex">
                                    <Link href={editRoute}>Editar</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    {/* Show edit button below on mobile when needed */}
                    {showEditButton && !isCompressed && (
                        <div className="mt-3 sm:hidden">
                            <Button asChild className="w-full">
                                <Link href={editRoute}>Editar</Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tabs Navigation - Only show when not compressed or on mobile */}
                {tabs && tabs.length > 0 && !isCompressed && (
                    <>
                        {/* Mobile Select */}
                        <div className={cn(
                            "md:hidden px-4 pb-4 transition-all duration-200 ease-in-out border-b border-gray-200 dark:border-gray-800"
                        )}>
                            <Select value={activeTab} onValueChange={setActiveTab}>
                                <SelectTrigger className="w-full">
                                    <SelectValue>{tabs.find((tab) => tab.id === activeTab)?.label}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {tabs.map((tab) => (
                                        <SelectItem key={tab.id} value={tab.id} className="flex items-center gap-2">
                                            <div className="w-4">{activeTab === tab.id && <Check className="h-4 w-4" />}</div>
                                            {tab.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Desktop Tabs */}
                        <div className="hidden md:block">
                            <MainSelectionTab value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <MainSelectionTabList className="px-6 lg:px-8">
                                    {tabs.map((tab) => (
                                        <MainSelectionTabTrigger
                                            key={tab.id}
                                            value={tab.id}
                                            className={cn(
                                                "py-2"
                                            )}
                                        >
                                            {tab.label}
                                        </MainSelectionTabTrigger>
                                    ))}
                                </MainSelectionTabList>
                            </MainSelectionTab>
                        </div>
                    </>
                )}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto bg-sidebar-accent/30">
                <div className="px-6 lg:px-8">
                    {tabs && tabs.length > 0 ? (
                        tabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={cn(
                                    activeTab === tab.id ? 'block' : 'hidden',
                                    // Add smooth vertical animation when tab becomes active
                                    activeTab === tab.id && tabAnimationClass
                                )}
                            >
                                {tab.content}
                            </div>
                        ))
                    ) : (
                        children
                    )}
                </div>
            </div>
        </div>
    );
}
