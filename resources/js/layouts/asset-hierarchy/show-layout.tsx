'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import { type BreadcrumbItem } from '@/types';
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
    breadcrumbs: BreadcrumbItem[];
    editRoute: string;
    backRoute: string;
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
    breadcrumbs,
    editRoute,
    backRoute,
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
    } catch (e) {
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
        <div className={cn(
            "bg-background transition-all duration-200 ease-in-out min-h-screen flex flex-col",
            isCompressed && "compressed"
        )}>
            <div className={cn(
                "flex flex-col gap-6 px-6 lg:px-8 transition-all duration-200 ease-in-out",
                isCompressed ? "pt-2" : "pt-5"
            )}>
                {/* Main content */}
                <div className={cn(
                    "flex flex-col justify-between gap-6 md:flex-row md:items-center transition-all duration-200 ease-in-out",
                    isCompressed && "gap-3"
                )}>
                    <div className={cn(
                        "space-y-1 transition-all duration-200 ease-in-out",
                        isCompressed && "space-y-0"
                    )}>
                        <h1 className={cn(
                            "text-foreground font-semibold transition-all duration-200 ease-in-out",
                            isCompressed ? "text-base lg:text-lg leading-6" : "text-xl lg:text-2xl leading-7"
                        )}>{title}</h1>
                        {subtitle && (
                            <p className={cn(
                                "text-muted-foreground text-sm leading-5 transition-all duration-200 ease-in-out",
                                isCompressed && "opacity-0 h-0 overflow-hidden"
                            )}>{subtitle}</p>
                        )}
                    </div>
                    {/* Buttons */}
                    <div className="flex flex-row-reverse justify-end gap-2 md:flex-row">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleToggleCompressed}
                                        className={cn(
                                            "h-8 w-8 transition-all duration-200",
                                            isCompressed && "bg-primary/10 hover:bg-primary/20"
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
                                    <p>{isCompressed ? "Comprimir visualização" : "Expandir visualização"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {showEditButton && (
                            <Button asChild>
                                <Link href={editRoute}>Editar</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {/* Nav */}
            <div className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col">
                    {tabs && tabs.length > 0 ? (
                        <div className="flex-1 flex flex-col">
                            {/* Mobile Select */}
                            <div className={cn(
                                "md:hidden py-4 px-4 transition-all duration-200 ease-in-out",
                                isCompressed && "py-2"
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
                            <div className={cn(
                                "hidden md:block transition-all duration-200 ease-in-out",
                                isCompressed ? "pt-2" : "pt-6"
                            )}>
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="flex space-x-4 justify-start px-6 lg:px-8">
                                        {tabs.map((tab) => (
                                            <TabsTrigger
                                                key={tab.id}
                                                value={tab.id}
                                                className={cn(
                                                    "px-4 font-medium data-[state=active]:font-extrabold transition-all duration-200 ease-in-out",
                                                    isCompressed ? "py-1.5 text-sm" : "py-2"
                                                )}
                                            >
                                                {tab.label}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                            {/* Tab Content - Shown for both mobile and desktop */}
                            <div className="flex-1 px-6 lg:px-8 bg-sidebar-accent/30">
                                {tabs.map((tab) => (
                                    <div
                                        key={tab.id}
                                        className={cn(
                                            activeTab === tab.id ? 'block h-full' : 'hidden',
                                            // Add smooth vertical animation when tab becomes active
                                            activeTab === tab.id && tabAnimationClass
                                        )}
                                    >
                                        {tab.content}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 bg-sidebar-accent/30">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
