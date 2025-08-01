'use client';

import { Button } from '@/components/ui/button';
import { MainSelectionTab, MainSelectionTabList, MainSelectionTabTrigger } from '@/components/ui/main-selection-tab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Check, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Tab {
    id: string;
    label: string;
    content: ReactNode;
}

interface DashboardLayoutProps {
    title: string;
    subtitle?: string | ReactNode;
    editRoute: string;
    tabs: Tab[];
    children?: ReactNode;
    showEditButton?: boolean;
    defaultActiveTab?: string;
    onCompressedChange?: (compressed: boolean) => void;
    defaultCompressed?: boolean;
    actionButtons?: ReactNode;
}

export default function DashboardLayout({
    title,
    subtitle,
    editRoute,
    tabs,
    children,
    showEditButton = false,
    defaultActiveTab,
    onCompressedChange,
    defaultCompressed = false,
    actionButtons,
}: DashboardLayoutProps) {
    const [activeTab, setActiveTab] = useState(defaultActiveTab || (tabs && tabs.length > 0 ? tabs[0].id : ''));
    const [isCompressed, setIsCompressed] = useState(defaultCompressed);
    const sidebarControls = useSidebar();

    // Track previous compression state to detect changes
    const prevIsCompressed = useRef(isCompressed);

    // Simple animation class for all tabs
    const tabAnimationClass = 'animate-in fade-in-2 slide-in-from-top-5 duration-200';

    useEffect(() => {
        // Only sync sidebar when compression state actually changes
        if (sidebarControls && !sidebarControls.isMobile && prevIsCompressed.current !== isCompressed) {
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
    }, [isCompressed, sidebarControls]);

    const handleToggleCompressed = () => {
        const newCompressed = !isCompressed;
        setIsCompressed(newCompressed);
        onCompressedChange?.(newCompressed);
    };

    return (
        <div className="relative flex h-[calc(100vh-3rem)] flex-col">
            {/* Fixed Header Section */}
            <div className="bg-background flex-shrink-0">
                {/* Title and Actions */}
                <div
                    className={cn(
                        'border-gray-200 transition-all duration-200 ease-in-out dark:border-gray-800',
                        isCompressed ? 'border-b py-2' : 'px-6 py-4 lg:px-8',
                    )}
                >
                    <div
                        className={cn(
                            'flex items-center justify-between gap-2 transition-all duration-200 ease-in-out',
                            isCompressed ? 'gap-2 px-6 lg:px-8' : '',
                            !isCompressed && '',
                        )}
                    >
                        <div className={cn('flex-1 transition-all duration-200 ease-in-out', isCompressed ? 'flex items-center gap-4' : 'space-y-1')}>
                            <h1
                                className={cn(
                                    'text-foreground font-semibold transition-all duration-200 ease-in-out',
                                    isCompressed ? 'text-base leading-6 lg:text-lg' : 'text-xl leading-7 lg:text-2xl',
                                )}
                            >
                                {title}
                            </h1>

                            {/* Inline tabs for compressed mode - Desktop only */}
                            {isCompressed && tabs && tabs.length > 0 && (
                                <div className="hidden flex-1 items-center gap-1 md:flex">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                'rounded-md px-3 py-1 text-sm transition-all duration-200',
                                                'hover:bg-muted/50',
                                                activeTab === tab.id ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground',
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Mobile Select for compressed mode - Inline */}
                            {isCompressed && tabs && tabs.length > 0 && (
                                <div className="min-w-0 flex-1 md:hidden">
                                    <Select value={activeTab} onValueChange={setActiveTab}>
                                        <SelectTrigger className="h-8 w-full text-sm">
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
                                <p className={cn('text-muted-foreground text-sm leading-5 transition-all duration-200 ease-in-out')}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {/* Buttons */}
                        <div className="flex items-center gap-2">
                            {actionButtons}
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
                        <div
                            className={cn(
                                'border-b border-gray-200 px-4 pb-4 transition-all duration-200 ease-in-out md:hidden dark:border-gray-800',
                            )}
                        >
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
                                        <MainSelectionTabTrigger key={tab.id} value={tab.id} className={cn('py-2')}>
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
            <div className="bg-sidebar-accent/30 flex-1 overflow-y-auto">
                <div className="px-6 lg:px-8">
                    {tabs && tabs.length > 0
                        ? tabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={cn(
                                    activeTab === tab.id ? 'block' : 'hidden',
                                    // Add smooth vertical animation when tab becomes active
                                    activeTab === tab.id && tabAnimationClass,
                                )}
                            >
                                {tab.content}
                            </div>
                        ))
                        : children}
                </div>
            </div>
        </div>
    );
}
