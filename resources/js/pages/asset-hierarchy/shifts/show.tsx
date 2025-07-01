import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ShiftCalendarView from '@/components/ShiftCalendarView';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Calendar, Cog, Map, Table, Pencil } from 'lucide-react';

import CreateShiftSheet from '@/components/CreateShiftSheet';
import ShiftTableView from '@/components/ShiftTableView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';

interface Break {
    start_time: string;
    end_time: string;
}

interface Shift {
    start_time: string;
    end_time: string;
    active: boolean;
    breaks: Break[];
}

interface Schedule {
    weekday: string;
    shifts: Shift[];
}

interface ShiftData {
    id: number;
    name: string;
    timezone?: string;
    plant_count: number;
    area_count: number;
    sector_count: number;
    asset_count: number;
    schedules: Schedule[];
    total_work_hours?: number;
    total_work_minutes?: number;
    total_break_hours?: number;
    total_break_minutes?: number;
}

interface Asset {
    id: number;
    tag: string;
    description: string | null;
    asset_type: {
        id: number;
        name: string;
    } | null;
    manufacturer: string | null;
    serial_number: string | null;
    plant: string | null;
    area: string | null;
    sector: string | null;
    current_runtime_hours: number;
}

interface Props {
    shift: ShiftData;
    assets: {
        data: Asset[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    activeTab: string;
    filters: {
        assets: {
            sort: string;
            direction: string;
        };
    };
}

export default function ShowShift({ shift, assets, activeTab, filters }: Props) {
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Hierarquia de Ativos',
            href: '/asset-hierarchy',
        },
        {
            title: 'Turnos',
            href: '/asset-hierarchy/shifts',
        },
        {
            title: shift.name,
            href: '#',
        },
    ];

    const handleEditSuccess = () => {
        // Reload the page to refresh the data
        router.reload();
        setIsEditSheetOpen(false);
    };

    const handleSort = (section: 'assets', column: string) => {
        const direction = filters[section].sort === column && filters[section].direction === 'asc' ? 'desc' : 'asc';

        router.get(
            route('asset-hierarchy.shifts.show', {
                shift: shift.id,
                tab: activeTab,
                [`${section}_sort`]: column,
                [`${section}_direction`]: direction,
                [`${section}_page`]: 1,
            }),
            {},
            { preserveState: true },
        );
    };

    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            {shift.plant_count > 0 && (
                <>
                    <span className="flex items-center gap-1">
                        <Map className="h-4 w-4" />
                        <span>{shift.plant_count} plantas</span>
                    </span>
                    <span className="text-muted-foreground">•</span>
                </>
            )}
            {shift.area_count > 0 && (
                <>
                    <span className="flex items-center gap-1">
                        <Map className="h-4 w-4" />
                        <span>{shift.area_count} áreas</span>
                    </span>
                    <span className="text-muted-foreground">•</span>
                </>
            )}
            {shift.sector_count > 0 && (
                <>
                    <span className="flex items-center gap-1">
                        <Map className="h-4 w-4" />
                        <span>{shift.sector_count} setores</span>
                    </span>
                    <span className="text-muted-foreground">•</span>
                </>
            )}
            <span className="flex items-center gap-1">
                <Cog className="h-4 w-4" />
                <span>{shift.asset_count} ativos</span>
            </span>
        </span>
    );

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <div className="space-y-6">
                        <div className="">
                            <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                                <div className="rounded-lg border p-4">
                                    <h4 className="text-sm font-medium text-muted-foreground">Horas de Trabalho</h4>
                                    <p className="mt-2 text-2xl font-semibold">{shift.total_work_hours || 0}h {shift.total_work_minutes || 0}m</p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <h4 className="text-sm font-medium text-muted-foreground">Horas de Intervalo</h4>
                                    <p className="mt-2 text-2xl font-semibold">{shift.total_break_hours || 0}h {shift.total_break_minutes || 0}m</p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <h4 className="text-sm font-medium text-muted-foreground">Horas Trabalhadas</h4>
                                    <p className="mt-2 text-2xl font-semibold text-primary">
                                        {Math.floor(((shift.total_work_hours || 0) * 60 + (shift.total_work_minutes || 0) - ((shift.total_break_hours || 0) * 60 + (shift.total_break_minutes || 0))) / 60)}h{' '}
                                        {((shift.total_work_hours || 0) * 60 + (shift.total_work_minutes || 0) - ((shift.total_break_hours || 0) * 60 + (shift.total_break_minutes || 0))) % 60}m
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-lg font-semibold mb-4">Horários de Trabalho</h3>
                            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'calendar' | 'table')}>
                                <TabsList className="flex w-[200px]">
                                    <TabsTrigger value="calendar" className="flex flex-1 items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Calendário
                                    </TabsTrigger>
                                    <TabsTrigger value="table" className="flex flex-1 items-center gap-2">
                                        <Table className="h-4 w-4" />
                                        Tabela
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="calendar" className="mt-2">
                                    {shift.timezone && (
                                        <p className="text-muted-foreground text-sm mb-4">Fuso Horário: {shift.timezone}</p>
                                    )}
                                    <ShiftCalendarView schedules={shift.schedules} showAllDays={true} />
                                </TabsContent>
                                <TabsContent value="table" className="mt-2">
                                    {shift.timezone && (
                                        <p className="text-muted-foreground text-sm mb-4">Fuso Horário: {shift.timezone}</p>
                                    )}
                                    <ShiftTableView schedules={shift.schedules} />
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setIsEditSheetOpen(true)} variant="default">
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                            </Button>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'ativos',
            label: 'Ativos',
            content: (
                <div className="mt-6 space-y-4">
                    <EntityDataTable
                        data={assets.data as unknown as Record<string, unknown>[]}
                        columns={[
                            {
                                key: 'tag',
                                label: 'TAG',
                                sortable: true,
                                width: 'w-[200px]',
                                render: (value, row) => <div className="font-medium">{(row as unknown as Asset).tag}</div>,
                            },
                            {
                                key: 'description',
                                label: 'Descrição',
                                sortable: true,
                                width: 'w-[300px]',
                                render: (value) => <span className="text-muted-foreground text-sm">{value as string || '-'}</span>,
                            },
                            {
                                key: 'asset_type_name',
                                label: 'Tipo',
                                sortable: true,
                                width: 'w-[200px]',
                                render: (value, row) => <span className="text-muted-foreground text-sm">{(row as unknown as Asset).asset_type?.name ?? '-'}</span>,
                            },
                            {
                                key: 'location',
                                label: 'Localização',
                                sortable: true,
                                width: 'w-[250px]',
                                render: (value, row) => {
                                    const item = row as unknown as Asset;
                                    const parts = [item.plant, item.area, item.sector].filter(Boolean);
                                    return (
                                        <span className="text-muted-foreground text-sm">
                                            {parts.length > 0 ? parts.join(' > ') : '-'}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: 'current_runtime_hours',
                                label: 'Horímetro',
                                sortable: true,
                                width: 'w-[120px]',
                                render: (value) => {
                                    const hours = value as number || 0;
                                    return <span className="text-muted-foreground text-sm">{hours.toFixed(1)}h</span>;
                                },
                            },
                        ]}
                        onRowClick={(row) => router.get(route('asset-hierarchy.assets.show', (row as unknown as Asset).id))}
                        onSort={(columnKey) => {
                            const columnMap: Record<string, string> = {
                                asset_type_name: 'type',
                                location: 'location',
                                current_runtime_hours: 'runtime',
                            };
                            handleSort('assets', columnMap[columnKey] || columnKey);
                        }}
                    />

                    <EntityPagination
                        pagination={{
                            current_page: assets.current_page,
                            last_page: assets.last_page,
                            per_page: assets.per_page,
                            total: assets.total,
                            from: assets.current_page > 0 ? (assets.current_page - 1) * assets.per_page + 1 : null,
                            to: assets.current_page > 0 ? Math.min(assets.current_page * assets.per_page, assets.total) : null,
                        }}
                        onPageChange={(page) => router.get(route('asset-hierarchy.shifts.show', {
                            shift: shift.id,
                            assets_page: page,
                            tab: 'ativos',
                            assets_sort: filters.assets.sort,
                            assets_direction: filters.assets.direction,
                        }))}
                    />
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Turno ${shift.name}`} />

            <ShowLayout
                title={shift.name}
                subtitle={subtitle}
                editRoute=""
                showEditButton={false}
                tabs={tabs}
            >
            </ShowLayout>

            <CreateShiftSheet
                initialShift={{
                    id: shift.id,
                    name: shift.name,
                    timezone: shift.timezone,
                    schedules: shift.schedules,
                }}
                isOpen={isEditSheetOpen}
                onOpenChange={setIsEditSheetOpen}
                onSuccess={handleEditSuccess}
            />
        </AppLayout>
    );
} 