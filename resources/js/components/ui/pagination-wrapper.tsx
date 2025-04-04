import { Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { route } from '@/utils/route';

interface PaginationWrapperProps {
    currentPage: number;
    lastPage: number;
    routeName: string;
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    perPage?: number;
}

export function PaginationWrapper({ 
    currentPage, 
    lastPage, 
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

    const generatePageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(lastPage, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) {
                pages.push('ellipsis');
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        if (endPage < lastPage) {
            if (endPage < lastPage - 1) {
                pages.push('ellipsis');
            }
            pages.push(lastPage);
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 whitespace-nowrap w-[200px]">
                <span className="text-sm text-muted-foreground">Registros por página:</span>
                <Select
                    value={localPerPage.toString()}
                    onValueChange={handlePerPageChange}
                >
                    <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="16">16</SelectItem>
                        <SelectItem value="32">32</SelectItem>
                        <SelectItem value="64">64</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href={currentPage > 1 ? route(routeName, {
                                page: currentPage - 1,
                                search,
                                sort,
                                direction,
                                per_page: localPerPage
                            }) : undefined}
                            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                    </PaginationItem>

                    {generatePageNumbers().map((page, index) => (
                        <PaginationItem key={index}>
                            {page === 'ellipsis' ? (
                                <PaginationEllipsis />
                            ) : (
                                <PaginationLink
                                    href={route(routeName, {
                                        page,
                                        search,
                                        sort,
                                        direction,
                                        per_page: localPerPage
                                    })}
                                    isActive={currentPage === page}
                                >
                                    {page}
                                </PaginationLink>
                            )}
                        </PaginationItem>
                    ))}

                    <PaginationItem>
                        <PaginationNext
                            href={currentPage < lastPage ? route(routeName, {
                                page: currentPage + 1,
                                search,
                                sort,
                                direction,
                                per_page: localPerPage
                            }) : undefined}
                            className={currentPage >= lastPage ? 'pointer-events-none opacity-50' : ''}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>

            <div className="w-[200px]"></div> {/* Espaçador à direita para balancear o layout */}
        </div>
    );
} 