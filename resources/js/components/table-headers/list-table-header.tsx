import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
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
}: ListTableHeaderProps) {
    return (
        <div className="flex w-full flex-col justify-between gap-4">
            {/* Title and description */}
            <div className="flex flex-col gap-1">
                <h2 className="text-foreground text-xl leading-7 font-semibold lg:text-2xl">{title}</h2>
                <p className="text-muted-foreground text-sm leading-5">{description}</p>
            </div>

            {/* Search and buttons */}
            <div className="flex flex-col gap-3">
                {/* Mobile buttons */}
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

                {/* Desktop layout */}
                <div className="hidden items-center justify-between lg:flex">
                    <div className="relative w-[380px]">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            className="h-10 pl-9"
                            type="search"
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        {actions}
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
                    </div>
                </div>

                {/* Mobile search */}
                <div className="lg:hidden">
                    <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            className="h-10 pl-9"
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
