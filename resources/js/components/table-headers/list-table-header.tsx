import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Maximize2, Minimize2, Plus, Search } from 'lucide-react';
import { ReactNode } from 'react';

interface ListTableHeaderProps {
    title: string;
    description: string;
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    createRoute?: string;
    onCreateClick?: () => void;
    createButtonText: string;
    actions?: ReactNode;
    isCompressed?: boolean;
    onToggleCompressed?: () => void;
}

export function ListTableHeader({
    title,
    description,
    searchPlaceholder = 'Buscar...',
    searchValue,
    onSearchChange,
    createRoute,
    onCreateClick,
    createButtonText,
    actions,
    isCompressed = false,
    onToggleCompressed,
}: ListTableHeaderProps) {
    return (
        <div className="bg-background">
            {/* Title and description section with bottom border */}
            <div className={cn(
                "border-b border-gray-200 dark:border-gray-800 transition-all duration-200 ease-in-out",
                isCompressed ? "py-2" : "px-6 py-4 lg:px-8"
            )}>
                <div className={cn(
                    "flex items-center justify-between gap-2 transition-all duration-200 ease-in-out",
                    isCompressed ? "px-6 lg:px-8" : ""
                )}>
                    <div className={cn(
                        "flex-1 transition-all duration-200 ease-in-out",
                        isCompressed ? "flex items-center gap-4" : "space-y-1"
                    )}>
                        <h1 className={cn(
                            "text-foreground font-semibold transition-all duration-200 ease-in-out",
                            isCompressed ? "text-base leading-6 lg:text-lg" : "text-xl leading-7 lg:text-2xl"
                        )}>{title}</h1>
                        {!isCompressed && (
                            <p className="text-muted-foreground text-sm leading-5">{description}</p>
                        )}
                    </div>

                    {/* Compress/Expand button */}
                    {onToggleCompressed && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onToggleCompressed}
                                        className={cn("h-8 w-8 flex-shrink-0 transition-all duration-200")}
                                    >
                                        {isCompressed ? (
                                            <Minimize2 className="h-4 w-4" />
                                        ) : (
                                            <Maximize2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isCompressed ? 'Expandir visualização' : 'Comprimir visualização'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>

            {/* Search and buttons section */}
            <div className={cn(
                "transition-all duration-200 ease-in-out",
                isCompressed ? "px-6 py-2 lg:px-8" : "px-6 py-4 lg:px-8"
            )}>
                <div className="flex flex-col gap-3">
                    {/* Mobile buttons - Only show when not compressed */}
                    {!isCompressed && (
                        <div className="flex items-center justify-between lg:hidden">
                            {onCreateClick ? (
                                <Button onClick={onCreateClick}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {createButtonText}
                                </Button>
                            ) : createRoute ? (
                                <Button asChild>
                                    <Link href={createRoute}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {createButtonText}
                                    </Link>
                                </Button>
                            ) : null}
                            {actions}
                        </div>
                    )}

                    {/* Desktop layout */}
                    <div className="hidden items-center justify-between lg:flex">
                        <div className={cn(
                            "relative transition-all duration-200",
                            isCompressed ? "w-[300px]" : "w-[380px]"
                        )}>
                            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                            <Input
                                className={cn(
                                    "pl-9 transition-all duration-200",
                                    isCompressed ? "h-8 text-sm" : "h-10"
                                )}
                                type="search"
                                placeholder={searchPlaceholder}
                                value={searchValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            {actions}
                            {onCreateClick ? (
                                <Button
                                    size={isCompressed ? "icon" : "sm"}
                                    onClick={onCreateClick}
                                    className={cn(
                                        "transition-all duration-200",
                                        isCompressed && "h-8 w-8"
                                    )}
                                >
                                    <Plus className={cn("h-4 w-4", !isCompressed && "mr-2")} />
                                    {!isCompressed && createButtonText}
                                </Button>
                            ) : createRoute ? (
                                <Button
                                    size={isCompressed ? "icon" : "sm"}
                                    asChild
                                    className={cn(
                                        "transition-all duration-200",
                                        isCompressed && "h-8 w-8"
                                    )}
                                >
                                    <Link href={createRoute}>
                                        <Plus className={cn("h-4 w-4", !isCompressed && "mr-2")} />
                                        {!isCompressed && createButtonText}
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {/* Mobile search and compressed mobile buttons */}
                    <div className="lg:hidden">
                        {isCompressed && (
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                    <Input
                                        className="h-8 pl-9 text-sm"
                                        type="search"
                                        placeholder={searchPlaceholder}
                                        value={searchValue}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                    />
                                </div>
                                {onCreateClick ? (
                                    <Button size="icon" onClick={onCreateClick} className="h-8 w-8">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                ) : createRoute ? (
                                    <Button size="icon" asChild className="h-8 w-8">
                                        <Link href={createRoute}>
                                            <Plus className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                ) : null}
                                {actions}
                            </div>
                        )}
                        {!isCompressed && (
                            <div className="relative">
                                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    className="h-10 pl-9"
                                    type="search"
                                    placeholder={searchPlaceholder}
                                    value={searchValue}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
