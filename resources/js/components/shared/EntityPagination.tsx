import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationMeta } from '@/types/shared';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface EntityPaginationProps {
    pagination?: PaginationMeta;
    onPageChange: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
    perPageOptions?: number[];
    compact?: boolean;
}

export function EntityPagination({
    pagination,
    onPageChange,
    onPerPageChange,
    perPageOptions = [10, 20, 30, 50, 100],
    compact = false
}: EntityPaginationProps) {
    // Handle undefined pagination by providing default values or early return
    if (!pagination) {
        return null;
    }

    const { current_page, last_page, per_page, total } = pagination;

    // Ensure per_page is a valid option, default to 10 if not
    const validPerPage = perPageOptions.includes(per_page) ? per_page : 10;

    return (
        <div className="flex items-center justify-between px-2">
            <div className="text-muted-foreground flex-1 text-sm">
                {total} registro{total !== 1 ? 's' : ''} no total
            </div>

            <div className="flex items-center space-x-6 lg:space-x-8">
                {onPerPageChange && (
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Linhas por página</p>
                        <Select value={`${validPerPage}`} onValueChange={(value) => onPerPageChange(Number(value))}>
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={`${validPerPage}`} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {perPageOptions.map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Página {current_page} de {last_page}
                </div>

                <div className="flex items-center space-x-2">
                    {!compact && (
                        <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => onPageChange(1)} disabled={current_page === 1}>
                            <span className="sr-only">Ir para primeira página</span>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => onPageChange(current_page - 1)} disabled={current_page === 1}>
                        <span className="sr-only">Ir para página anterior</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(current_page + 1)}
                        disabled={current_page >= last_page}
                    >
                        <span className="sr-only">Ir para próxima página</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    {!compact && (
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => onPageChange(last_page)}
                            disabled={current_page >= last_page}
                        >
                            <span className="sr-only">Ir para última página</span>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
