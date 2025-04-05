import { Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { ChevronsLeftIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { route } from '@/utils/route';

interface PaginationWrapperProps {
    currentPage: number;
    lastPage: number;
    total: number;
    routeName: string;
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    perPage?: number;
}

export function PaginationWrapper({ 
    currentPage, 
    lastPage, 
    total,
    routeName, 
    search = '', 
    sort = '', 
    direction = 'asc',
    perPage = 8
}: PaginationWrapperProps) {
    const [localPerPage, setLocalPerPage] = useState(perPage);

    useEffect(() => {
        setLocalPerPage(perPage);
    }, [perPage]);

    const handlePerPageChange = (value: string) => {
        setLocalPerPage(Number(value));
        router.get(
            route(routeName),
            { 
                search,
                sort,
                direction,
                page: 1,
                per_page: value
            },
            { preserveState: true }
        );
    };

    const handlePageChange = (newPage: number) => {
        router.get(
            route(routeName),
            { 
                search,
                sort,
                direction,
                page: newPage,
                per_page: localPerPage
            },
            { preserveState: true }
        );
    };

    return (
        <div className="flex items-center justify-between px-4">
            <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
                {total} registros no total
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit ml-auto">
                <div className="hidden items-center gap-2 lg:flex">
                    <Label htmlFor="rows-per-page" className="text-sm font-medium">
                        Linhas por página
                    </Label>
                    <Select
                        value={`${localPerPage}`}
                        onValueChange={handlePerPageChange}
                    >
                        <SelectTrigger className="w-20" id="rows-per-page">
                            <SelectValue
                                placeholder={localPerPage}
                            />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[8, 16, 32, 64, 128].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-fit items-center justify-center text-sm font-medium">
                    Página {currentPage} de{" "}
                    {lastPage}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                    >
                        <span className="sr-only">Ir para primeira página</span>
                        <ChevronsLeftIcon />
                    </Button>
                    <Button
                        variant="outline"
                        className="size-8"
                        size="icon"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <span className="sr-only">Ir para página anterior</span>
                        <ChevronLeftIcon />
                    </Button>
                    <Button
                        variant="outline"
                        className="size-8"
                        size="icon"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= lastPage}
                    >
                        <span className="sr-only">Ir para próxima página</span>
                        <ChevronRightIcon />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden size-8 lg:flex"
                        size="icon"
                        onClick={() => handlePageChange(lastPage)}
                        disabled={currentPage >= lastPage}
                    >
                        <span className="sr-only">Ir para última página</span>
                        <ChevronsRightIcon />
                    </Button>
                </div>
            </div>
        </div>
    );
} 