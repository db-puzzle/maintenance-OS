import React, { useState, useEffect } from 'react';
import { type BreadcrumbItem } from '@/types';
import { type WorkCell, type ProductionSchedule } from '@/types/production';
import { Head, Link, router } from '@inertiajs/react';
import { Factory, Clock, Building2, Infinity as InfinityIcon, CheckCircle2, XCircle, Info, Pencil, Save, X } from 'lucide-react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatNumber } from '@/utils/number';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import { TextInput } from '@/components/TextInput';
import { ItemSelect } from '@/components/ItemSelect';
import { useForm } from '@inertiajs/react';
import { createFormAdapter } from '@/utils/form-adapters';
import StateButton from '@/components/StateButton';
import { toast } from 'sonner';
interface Props {
    workCell: WorkCell & {
        plant?: { id: number; name: string };
        area?: { id: number; name: string };
        sector?: { id: number; name: string };
        shift?: { id: number; name: string };
        manufacturer?: { id: number; name: string };
    };
    plants: { id: number; name: string }[];
    areas: { id: number; name: string }[];
    sectors: { id: number; name: string }[];
    shifts: { id: number; name: string }[];
    manufacturers: { id: number; name: string }[];
    unitsOfMeasure?: {
        id: number;
        code: string;
        name: string;
        symbol?: string;
        uom_type: 'COUNT' | 'MASS' | 'LENGTH' | 'AREA' | 'VOLUME' | 'TIME';
    }[];
    productionSchedules: {
        data: ProductionSchedule[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };

    activeTab: string;
    filters: {
        schedules: {
            sort: string;
            direction: string;
        };
    };
}





export default function Show({
    workCell,
    plants: _plants,
    areas: _areas,
    sectors: _sectors,
    shifts: _shifts,
    manufacturers: _manufacturers,
    unitsOfMeasure: _unitsOfMeasure = [],
    productionSchedules,

    activeTab,
    filters
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Células de Trabalho',
            href: '/production/work-cells',
        },
        {
            title: workCell.name,
            href: '#',
        },
    ];

    // Add state for edit mode
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const isViewMode = mode === 'view';

    // State for dynamic areas and sectors
    const [areas, setAreas] = useState<{ id: number; name: string }[]>(_areas);
    const [sectors, setSectors] = useState<{ id: number; name: string }[]>(_sectors);

    // Create form instance
    const { data, setData, put, processing, errors, clearErrors, reset } = useForm({
        name: workCell.name || '',
        description: workCell.description || '',
        cell_type: workCell.cell_type || 'internal',
        has_finite_capacity: workCell.has_finite_capacity ?? true,
        default_production_rate_per_hour: formatNumber(workCell.default_production_rate_per_hour),
        default_unit_of_measure: workCell.default_unit_of_measure || 'PC',
        default_setup_time_minutes: formatNumber(workCell.default_setup_time_minutes) || '0',
        max_parallel_executions: formatNumber(workCell.max_parallel_executions) || '1',
        shift_id: workCell.shift_id?.toString() || '',
        plant_id: workCell.plant_id?.toString() || '',
        area_id: workCell.area_id?.toString() || '',
        sector_id: workCell.sector_id?.toString() || '',
        manufacturer_id: workCell.manufacturer_id?.toString() || '',
        is_active: workCell.is_active ?? true,
    });

    // Create form adapter for TextInput components
    const form = createFormAdapter({
        data: data,
        setData: setData,
        errors: errors,
        clearErrors: clearErrors
    });

    // Group units of measure by type
    const uomByType = React.useMemo(() => {
        const grouped: Record<string, typeof _unitsOfMeasure> = {};
        _unitsOfMeasure.forEach(uom => {
            if (!grouped[uom.uom_type]) {
                grouped[uom.uom_type] = [];
            }
            grouped[uom.uom_type].push(uom);
        });
        return grouped;
    }, [_unitsOfMeasure]);

    // Fetch areas when plant changes in edit mode
    useEffect(() => {
        if (data.plant_id && mode === 'edit') {
            fetch(route('production.work-cells.get-areas', { plant: data.plant_id }))
                .then(response => response.json())
                .then(fetchedAreas => setAreas(fetchedAreas))
                .catch(error => console.error('Error fetching areas:', error));
        } else if (!data.plant_id) {
            setAreas([]);
            setSectors([]);
        }
    }, [data.plant_id, mode]);

    // Fetch sectors when area changes in edit mode
    useEffect(() => {
        if (data.area_id && mode === 'edit') {
            fetch(route('production.work-cells.get-sectors', { area: data.area_id }))
                .then(response => response.json())
                .then(fetchedSectors => setSectors(fetchedSectors))
                .catch(error => console.error('Error fetching sectors:', error));
        } else if (!data.area_id) {
            setSectors([]);
        }
    }, [data.area_id, mode]);

    const handleEdit = () => {
        setMode('edit');
    };

    const handleCancel = () => {
        reset();
        setMode('view');
        // Reset areas and sectors to original values
        setAreas(_areas);
        setSectors(_sectors);
    };

    const handleSave = () => {
        put(route('production.work-cells.update', workCell.id), {
            preserveScroll: true,
            onSuccess: () => {
                setMode('view');
                router.reload();
            },
            onError: () => {
                toast.error('Erro ao atualizar célula de trabalho');
            },
        });
    };



    const handleSort = (column: string) => {
        const direction = filters.schedules.sort === column && filters.schedules.direction === 'asc' ? 'desc' : 'asc';
        router.get(
            route('production.work-cells.show', {
                work_cell: workCell.id,
                tab: activeTab,
                schedules_sort: column,
                schedules_direction: direction,
                schedules_page: 1,
            }),
            {},
            { preserveState: true },
        );
    };
    // Verificações de segurança para evitar erros de undefined
    if (!workCell) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <ShowLayout title="Carregando..." editRoute="" tabs={[]}>
                    <div>Carregando informações da célula de trabalho...</div>
                </ShowLayout>
            </AppLayout>
        );
    }
    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Factory className="h-4 w-4" />
                <span>{workCell.cell_type === 'internal' ? 'Interna' : 'Externa'}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{workCell.has_finite_capacity ? 'Capacidade Finita' : 'Capacidade Infinita'}</span>
            </span>


        </span>
    );
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            content: (
                <div className="space-y-6 py-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-3 gap-4">
                        <TextInput
                            form={form}
                            name="name"
                            label="Nome da Célula"
                            placeholder="Nome da célula de trabalho"
                            view={isViewMode}
                            required
                            disabled={processing}
                        />
                        <div className="col-span-2">
                            <TextInput
                                form={form}
                                name="description"
                                label="Descrição"
                                placeholder="Sem descrição"
                                view={isViewMode}
                                disabled={processing}
                            />
                        </div>
                    </div>

                    {/* Cell Type Configuration */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Tipo de Célula</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <StateButton
                                    icon={Building2}
                                    title="Célula Interna"
                                    description="Célula de trabalho operada internamente pela empresa"
                                    selected={isViewMode ? workCell.cell_type === 'internal' : data.cell_type === 'internal'}
                                    onClick={() => {
                                        if (!isViewMode) {
                                            setData('cell_type', 'internal');
                                            // Clear manufacturer when switching to internal
                                            setData('manufacturer_id', '');
                                        }
                                    }}
                                    disabled={isViewMode || processing}
                                    greyOutWhenDisabled={!isViewMode}
                                />
                                <StateButton
                                    icon={Factory}
                                    title="Célula Externa"
                                    description="Célula de trabalho operada por um fornecedor externo"
                                    selected={isViewMode ? workCell.cell_type === 'external' : data.cell_type === 'external'}
                                    onClick={() => {
                                        if (!isViewMode) {
                                            setData('cell_type', 'external');
                                            // Clear location fields when switching to external
                                            setData('plant_id', '');
                                            setData('area_id', '');
                                            setData('sector_id', '');
                                        }
                                    }}
                                    disabled={isViewMode || processing}
                                    greyOutWhenDisabled={!isViewMode}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location Information (for internal cells) */}
                    {(isViewMode ? workCell.cell_type === 'internal' : data.cell_type === 'internal') && (
                        <>
                            <div className="space-y-4">
                                {isViewMode ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Planta</label>
                                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                                {workCell.plant ? (
                                                    <span className="font-medium">{workCell.plant.name}</span>
                                                ) : '—'}
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Área</label>
                                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                                {workCell.area ? (
                                                    <span className="font-medium">{workCell.area.name}</span>
                                                ) : '—'}
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Setor</label>
                                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                                {workCell.sector ? (
                                                    <span className="font-medium">{workCell.sector.name}</span>
                                                ) : '—'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-4">
                                        <ItemSelect
                                            label="Planta"
                                            items={_plants}
                                            value={data.plant_id}
                                            onValueChange={(value) => {
                                                setData('plant_id', value);
                                                // Clear dependent fields
                                                setData('area_id', '');
                                                setData('sector_id', '');
                                            }}
                                            placeholder="Selecione uma planta"
                                            error={errors.plant_id}
                                            canClear
                                        />
                                        <ItemSelect
                                            label="Área"
                                            items={areas}
                                            value={data.area_id}
                                            onValueChange={(value) => {
                                                setData('area_id', value);
                                                // Clear dependent field
                                                setData('sector_id', '');
                                            }}
                                            placeholder={data.plant_id ? "Selecione uma área" : "Selecione uma planta primeiro"}
                                            error={errors.area_id}
                                            canClear
                                            disabled={!data.plant_id}
                                        />
                                        <ItemSelect
                                            label="Setor"
                                            items={sectors}
                                            value={data.sector_id}
                                            onValueChange={(value) => setData('sector_id', value)}
                                            placeholder={data.area_id ? "Selecione um setor" : "Selecione uma área primeiro"}
                                            error={errors.sector_id}
                                            canClear
                                            disabled={!data.area_id}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Manufacturer Information (for external cells) */}
                    {(isViewMode ? workCell.cell_type === 'external' : data.cell_type === 'external') && (
                        <>
                            <div className="space-y-4">
                                {isViewMode ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Nome do Fabricante</label>
                                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                                {workCell.manufacturer ? (
                                                    <span className="font-medium">{workCell.manufacturer.name}</span>
                                                ) : '—'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-4">
                                        <ItemSelect
                                            label="Fabricante"
                                            items={_manufacturers}
                                            value={data.manufacturer_id}
                                            onValueChange={(value) => setData('manufacturer_id', value)}
                                            placeholder="Selecione um fabricante"
                                            error={errors.manufacturer_id}
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Capacity Configuration */}
                    <div className="mt-6 space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Configuração de Capacidade</h3>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <StateButton
                                    icon={InfinityIcon}
                                    title="Capacidade Infinita"
                                    description="A célula tem capacidade ilimitada (ex: operações terceirizadas)"
                                    selected={isViewMode ? !workCell.has_finite_capacity : !data.has_finite_capacity}
                                    onClick={() => {
                                        if (!isViewMode) {
                                            setData('has_finite_capacity', false);
                                            // Clear finite capacity fields
                                            setData('shift_id', '');
                                            setData('default_production_rate_per_hour', '');
                                            setData('default_setup_time_minutes', '0');
                                            setData('max_parallel_executions', '1');
                                        }
                                    }}
                                    disabled={isViewMode || processing}
                                    greyOutWhenDisabled={!isViewMode}
                                />
                                <StateButton
                                    icon={Building2}
                                    title="Capacidade Finita"
                                    description="A célula tem limitações de capacidade baseadas em turnos e taxas de produção"
                                    selected={isViewMode ? workCell.has_finite_capacity : data.has_finite_capacity}
                                    onClick={() => {
                                        if (!isViewMode) {
                                            setData('has_finite_capacity', true);
                                        }
                                    }}
                                    disabled={isViewMode || processing}
                                    greyOutWhenDisabled={!isViewMode}
                                />
                            </div>

                        </div>

                        {(isViewMode ? workCell.has_finite_capacity : data.has_finite_capacity) && (
                            <>
                                <div className="space-y-4">
                                    {isViewMode ? (
                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Turno</label>
                                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                                    {workCell.shift ? (
                                                        <span className="font-medium">{workCell.shift.name}</span>
                                                    ) : '—'}
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Taxa de Produção</label>
                                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                                    <span className="font-medium">
                                                        {workCell.default_production_rate_per_hour ? formatNumber(workCell.default_production_rate_per_hour) : '—'} {workCell.default_unit_of_measure}/hora
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Tempo de Setup</label>
                                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                                    <span className="font-medium">
                                                        {formatNumber(workCell.default_setup_time_minutes) || '0'} minutos
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-sm font-medium">Execuções Paralelas</label>
                                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                                    <span className="font-medium">
                                                        {formatNumber(workCell.max_parallel_executions) || '1'} operações simultâneas
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-5 gap-4">
                                                <div className="grid gap-2">
                                                    <ItemSelect
                                                        label="Turno"
                                                        items={_shifts}
                                                        value={data.shift_id}
                                                        onValueChange={(value) => setData('shift_id', value)}
                                                        placeholder="Selecione um turno"
                                                        error={errors.shift_id}
                                                        required
                                                        canClear
                                                    />
                                                    <p className="text-sm text-muted-foreground">Horário de trabalho</p>
                                                </div>
                                                <TextInput
                                                    form={form}
                                                    name="default_production_rate_per_hour"
                                                    label="Taxa Padrão de Produção"
                                                    placeholder="100"
                                                    disabled={processing}
                                                    helperText="Unidades por hora"
                                                />
                                                <div className="grid gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <Label htmlFor="default_unit_of_measure" className="text-sm font-medium">Unidade de Medida</Label>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="max-w-xs">
                                                                    A unidade de medida padrão ({workCell.default_unit_of_measure}) é usada para calcular
                                                                    a capacidade e utilização da célula. Diferentes produtos podem usar diferentes unidades
                                                                    de medida, mas serão convertidos para a unidade padrão da célula.
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                    <Select
                                                        value={data.default_unit_of_measure}
                                                        onValueChange={(value) => setData('default_unit_of_measure', value)}
                                                        disabled={processing}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Selecione uma unidade" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(uomByType).map(([type, units]) => (
                                                                <SelectGroup key={type}>
                                                                    <SelectLabel>
                                                                        {type === 'COUNT' ? 'Contagem' :
                                                                            type === 'MASS' ? 'Massa' :
                                                                                type === 'LENGTH' ? 'Comprimento' :
                                                                                    type === 'AREA' ? 'Área' :
                                                                                        type === 'VOLUME' ? 'Volume' :
                                                                                            type === 'TIME' ? 'Tempo' : type}
                                                                    </SelectLabel>
                                                                    {units.map((uom) => (
                                                                        <SelectItem key={uom.id} value={uom.code}>
                                                                            {uom.code} - {uom.name}
                                                                            {uom.symbol && ` (${uom.symbol})`}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectGroup>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-sm text-muted-foreground">Unidade padrão</p>
                                                    {errors.default_unit_of_measure && (
                                                        <p className="text-sm text-red-600 mt-1">{errors.default_unit_of_measure}</p>
                                                    )}
                                                </div>
                                                <TextInput
                                                    form={form}
                                                    name="default_setup_time_minutes"
                                                    label="Tempo Padrão de Setup"
                                                    placeholder="30"
                                                    type="number"
                                                    min="0"
                                                    max="9999"
                                                    disabled={processing}
                                                    helperText="Tempo em minutos"
                                                />
                                                <TextInput
                                                    form={form}
                                                    name="max_parallel_executions"
                                                    label="Execuções Paralelas Máximas"
                                                    placeholder="1"
                                                    type="number"
                                                    min="1"
                                                    max="999"
                                                    required
                                                    disabled={processing}
                                                    helperText="Operações simultâneas"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Status Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-3">Status da Célula</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <StateButton
                                icon={CheckCircle2}
                                title="Ativa"
                                description="Célula de trabalho está ativa e disponível para uso"
                                selected={isViewMode ? workCell.is_active : data.is_active}
                                onClick={() => {
                                    if (!isViewMode) {
                                        setData('is_active', true);
                                    }
                                }}
                                disabled={isViewMode || processing}
                                variant="green"
                                greyOutWhenDisabled={!isViewMode}
                            />
                            <StateButton
                                icon={XCircle}
                                title="Inativa"
                                description="Célula de trabalho está inativa e não disponível para uso"
                                selected={isViewMode ? !workCell.is_active : !data.is_active}
                                onClick={() => {
                                    if (!isViewMode) {
                                        setData('is_active', false);
                                    }
                                }}
                                disabled={isViewMode || processing}
                                variant="red"
                                greyOutWhenDisabled={!isViewMode}
                            />
                        </div>

                        {(isViewMode ? !workCell.is_active : !data.is_active) && (
                            <Alert variant="destructive" className="mt-4">
                                <XCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Esta célula está inativa e não pode ser usada em novos roteiros ou agendamentos.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-4">
                        {isViewMode ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleEdit}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={processing}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={processing}
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {processing ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'agendamentos',
            label: 'Agendamentos',
            content: (
                <div className="mt-6 space-y-4">
                    <EntityDataTable
                        data={productionSchedules.data.map(schedule => ({ ...schedule } as Record<string, unknown>))}
                        columns={[
                            {
                                key: 'order',
                                label: 'Ordem de Produção',
                                sortable: true,
                                width: 'w-[200px]',
                                render: (value, row) => {
                                    const schedule = row as unknown as ProductionSchedule;
                                    if (schedule.manufacturing_order) {
                                        return (
                                            <Link
                                                href={route('production.manufacturing-orders.show', schedule.manufacturing_order.id)}
                                                className="hover:text-primary font-medium"
                                            >
                                                {schedule.manufacturing_order.order_number}
                                            </Link>
                                        );
                                    }
                                    return '-';
                                },
                            },
                            {
                                key: 'manufacturing_step',
                                label: 'Etapa',
                                sortable: false,
                                width: 'w-[250px]',
                                render: (value, row) => {
                                    const schedule = row as unknown as ProductionSchedule;
                                    if (schedule.manufacturing_step) {
                                        return (
                                            <div>
                                                <div>Etapa #{schedule.manufacturing_step.step_number}</div>
                                                <div className="text-muted-foreground text-sm">
                                                    {schedule.manufacturing_step?.description || ''}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return '-';
                                },
                            },
                            {
                                key: 'scheduled_start',
                                label: 'Início Agendado',
                                sortable: true,
                                width: 'w-[180px]',
                                render: (value) => {
                                    if (value) {
                                        const date = new Date(value as string);
                                        return date.toLocaleString('pt-BR');
                                    }
                                    return '-';
                                },
                            },
                            {
                                key: 'scheduled_end',
                                label: 'Fim Agendado',
                                sortable: true,
                                width: 'w-[180px]',
                                render: (value) => {
                                    if (value) {
                                        const date = new Date(value as string);
                                        return date.toLocaleString('pt-BR');
                                    }
                                    return '-';
                                },
                            },
                            {
                                key: 'status',
                                label: 'Status',
                                sortable: true,
                                width: 'w-[120px]',
                                render: (value) => {
                                    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
                                        'scheduled': { label: 'Agendado', variant: 'outline' },
                                        'ready': { label: 'Pronto', variant: 'secondary' },
                                        'in_progress': { label: 'Em Andamento', variant: 'default' },
                                        'completed': { label: 'Concluído', variant: 'default' },
                                        'cancelled': { label: 'Cancelado', variant: 'destructive' },
                                    };
                                    const status = statusMap[value as string] || { label: value as string, variant: 'outline' as const };
                                    return <Badge variant={status.variant}>{status.label}</Badge>;
                                },
                            },
                        ]}
                        onSort={(columnKey) => handleSort(columnKey)}
                    />
                    <EntityPagination
                        pagination={{
                            current_page: productionSchedules.current_page,
                            last_page: productionSchedules.last_page,
                            per_page: productionSchedules.per_page,
                            total: productionSchedules.total,
                            from: productionSchedules.current_page > 0 ? (productionSchedules.current_page - 1) * productionSchedules.per_page + 1 : null,
                            to: productionSchedules.current_page > 0 ? Math.min(productionSchedules.current_page * productionSchedules.per_page, productionSchedules.total) : null,
                        }}
                        onPageChange={(page) => router.get(route('production.work-cells.show', {
                            work_cell: workCell.id,
                            schedules_page: page,
                            tab: 'agendamentos',
                            schedules_sort: filters.schedules.sort,
                            schedules_direction: filters.schedules.direction,
                        }))}
                    />
                </div>
            ),
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Célula de Trabalho ${workCell.name}`} />
            <ShowLayout
                title={workCell.name}
                subtitle={subtitle}
                tabs={tabs}
                editRoute=""
            />
        </AppLayout>
    );
}