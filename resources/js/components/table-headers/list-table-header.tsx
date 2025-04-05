import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Link } from "@inertiajs/react";
import { ReactNode } from "react";

interface ListTableHeaderProps {
    title: string;
    description: string;
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    createRoute: string;
    createButtonText: string;
    actions?: ReactNode;
}

export function ListTableHeader({
    title,
    description,
    searchPlaceholder = "Buscar...",
    searchValue,
    onSearchChange,
    createRoute,
    createButtonText,
    actions
}: ListTableHeaderProps) {
    return (
        <div className="flex flex-col justify-between w-full gap-4">
            {/* Title and description */}
            <div className="flex flex-col gap-1">
                <h2 className="text-lg lg:text-xl font-semibold text-foreground leading-7">
                    {title}
                </h2>
                <p className="text-sm text-muted-foreground leading-5">
                    {description}
                </p>
            </div>

            {/* Search and buttons */}
            <div className="flex flex-col gap-3">
                {/* Mobile buttons */}
                <div className="flex items-center justify-between lg:hidden">
                    <Button asChild>
                        <Link href={createRoute}>
                            <Plus className="h-4 w-4 mr-2" />
                            {createButtonText}
                        </Link>
                    </Button>
                    {actions}
                </div>

                {/* Desktop layout */}
                <div className="hidden lg:flex items-center justify-between">
                    <div className="relative w-[380px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            className="pl-9 h-10" 
                            type="search" 
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        {actions}
                        <Button asChild>
                            <Link href={createRoute}>
                                <Plus className="h-4 w-4 mr-2" />
                                {createButtonText}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Mobile search */}
                <div className="lg:hidden">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            className="pl-9 h-10" 
                            type="search" 
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 