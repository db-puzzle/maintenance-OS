import * as React from "react";
import { type BreadcrumbItem } from '@/types';
import { type Asset } from '@/types/asset-hierarchy';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { MoreVertical, ChevronsLeftIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsRightIcon, ColumnsIcon, ChevronDownIcon, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/asset-hierarchy/list-layout';
import { DataTable, ColumnVisibility, type Column } from '@/components/data-table';
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manutenção',
        href: '/maintenance-dashboard',
    },
    {
        title: 'Ativos',
        href: '/asset-hierarchy/assets',
    },
];

interface Props {
    asset: {
        data: Asset[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
        sort: string;
        direction: 'asc' | 'desc';
        per_page: number;
    };
}

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

export default function Assets({ asset, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || 8);
    const [sort, setSort] = useState(filters.sort || 'tag');
    const [direction, setDirection] = useState<'asc' | 'desc'>(filters.direction || 'asc');
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        // Tenta carregar do localStorage, se não existir, usa os valores padrão
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('assetColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            plant: true,
            area: true,
            sector: true,
            asset_type: true,
            manufacturer: true,
            manufacturing_year: true,
            serial_number: true,
        };
    });

    const page = usePage<PageProps>();
    const { delete: destroy } = useForm();

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            router.get(
                route('asset-hierarchy.assets'),
                { 
                    search,
                    sort,
                    direction,
                    per_page: perPage
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search, perPage, sort, direction]);

    const handlePerPageChange = (value: string) => {
        setPerPage(Number(value));
        router.get(
            route('asset-hierarchy.assets'),
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
            route('asset-hierarchy.assets'),
            { 
                search,
                sort,
                direction,
                page: newPage + 1,
                per_page: perPage
            },
            { preserveState: true }
        );
    };

    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('assetColumnsVisibility', JSON.stringify(newVisibility));
    };

    const handleSort = (columnId: string) => {
        if (sort === columnId) {
            setDirection(direction === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(columnId);
            setDirection('asc');
        }
    };

    const columns: Column<Asset>[] = [
        {
            id: "tag",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('tag')}>
                    TAG
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Asset }) => {
                return (
                    <div>
                        <div className="font-medium">{row.original.tag}</div>
                        {row.original.description && (
                            <div className="text-sm text-muted-foreground">
                                {row.original.description.length > 40 
                                    ? `${row.original.description.substring(0, 40)}...`
                                    : row.original.description}
                            </div>
                        )}
                    </div>
                );
            },
            width: "w-[300px]",
        },
        {
            id: "asset_type",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('asset_type')}>
                    Tipo
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Asset }) => row.original.asset_type?.name ?? '-',
            width: "w-[200px]",
        },
        {
            id: "serial_number",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('serial_number')}>
                    Número Serial
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Asset }) => row.original.serial_number ?? '-',
            width: "w-[200px]",
        },
        {
            id: "plant",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('plant')}>
                    Planta
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Asset }) => row.original.plant?.name ?? row.original.area?.plant?.name ?? row.original.sector?.area?.plant?.name ?? '-',
            width: "w-[200px]",
        },
        {
            id: "area",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('area')}>
                    Área
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Asset }) => row.original.area?.name ?? row.original.sector?.area?.name ?? '-',
            width: "w-[200px]",
        },
        {
            id: "sector",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('sector')}>
                    Setor
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Asset }) => row.original.sector?.name ?? '-',
            width: "w-[200px]",
        },
        {
            id: "manufacturer",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('manufacturer')}>
                    Fabricante
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Asset }) => row.original.manufacturer ?? '-',
            width: "w-[200px]",
        },
        {
            id: "manufacturing_year",
            header: (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('manufacturing_year')}>
                    Ano
                    <ArrowUpDown className="h-4 w-4" />
                </div>
            ),
            cell: (row: { original: Asset }) => row.original.manufacturing_year ?? '-',
            width: "w-[100px]",
        },
        {
            id: "actions",
            header: "Ações",
            cell: (row: { original: Asset }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
                            size="icon"
                        >
                            <MoreVertical />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem asChild>
                            <Link href={route('asset-hierarchy.assets.edit', row.original.id)}>
                                Editar
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: "w-[80px]",
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Máquinas" />

            <ListLayout
                title="Ativos"
                description="Gerencie os ativos do sistema"
                searchPlaceholder="Buscar por TAG, S/N, fabricante ou descrição..."
                searchValue={search}
                onSearchChange={(value) => setSearch(value)}
                createRoute={route('asset-hierarchy.assets.create')}
                createButtonText="Adicionar"
                actions={
                    <div className="flex items-center gap-2">
                        <ColumnVisibility
                            columns={columns}
                            columnVisibility={columnVisibility}
                            onColumnVisibilityChange={handleColumnVisibilityChange}
                        />
                    </div>
                }
            >
                <DataTable
                    data={asset.data}
                    columns={columns}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={handleColumnVisibilityChange}
                    onRowClick={(row) => router.get(route('asset-hierarchy.assets.show', row.id))}
                    emptyMessage="Nenhuma máquina encontrada."
                />

                <PaginationWrapper
                    currentPage={asset.current_page}
                    lastPage={asset.last_page}
                    total={asset.total}
                    routeName="asset-hierarchy.assets"
                    search={search}
                    sort={sort}
                    direction={direction}
                    perPage={perPage}
                />
            </ListLayout>
        </AppLayout>
    );
} 