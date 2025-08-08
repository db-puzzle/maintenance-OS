import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { WorkCell } from '@/types/production';
import { useForm } from '@inertiajs/react';
import { TextInput } from '@/components/TextInput';
import { ItemSelect } from '@/components/ItemSelect';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { Factory, Clock, MapPin } from 'lucide-react';
interface WorkCellFormComponentProps {
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
    initialMode?: 'view' | 'edit';
    onSuccess?: () => void;
}
export default function WorkCellFormComponent({
    workCell,
    plants = [],
    areas: initialAreas = [],
    sectors: initialSectors = [],
    shifts = [],
    manufacturers = [],
    initialMode = 'view',
    onSuccess
}: WorkCellFormComponentProps) {
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const [areas, setAreas] = useState(initialAreas);
    const [sectors, setSectors] = useState(initialSectors);
    const { data, setData, put, processing, errors, reset } = useForm({
        name: workCell.name || '',
        description: workCell.description || '',
        cell_type: workCell.cell_type || 'internal',
        available_hours_per_day: workCell.available_hours_per_day?.toString() || '8',
        efficiency_percentage: workCell.efficiency_percentage?.toString() || '85',
        shift_id: workCell.shift_id?.toString() || '',
        plant_id: workCell.plant_id?.toString() || '',
        area_id: workCell.area_id?.toString() || '',
        sector_id: workCell.sector_id?.toString() || '',
        manufacturer_id: workCell.manufacturer_id?.toString() || '',
        is_active: workCell.is_active ?? true,
    });
    // Fetch areas when plant changes
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
    // Fetch sectors when area changes
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
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('production.work-cells.update', workCell.id), {
            preserveScroll: true,
            onSuccess: () => {
                setMode('view');
                if (onSuccess) {
                    onSuccess();
                }
            },
        });
    };
    const handleCancel = () => {
        reset();
        setMode('view');
    };
    if (mode === 'view') {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Informações da Célula de Trabalho</CardTitle>
                    <Button
                        variant="outline"
                        onClick={() => setMode('edit')}
                    >
                        Editar
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label className="text-muted-foreground text-sm">Nome</Label>
                            <p className="font-medium">{workCell.name}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-sm">Tipo</Label>
                            <Badge variant={workCell.cell_type === 'internal' ? 'default' : 'secondary'}>
                                {workCell.cell_type === 'internal' ? 'Interna' : 'Externa'}
                            </Badge>
                        </div>
                    </div>
                    {workCell.description && (
                        <div>
                            <Label className="text-muted-foreground text-sm">Descrição</Label>
                            <p className="mt-1">{workCell.description}</p>
                        </div>
                    )}
                    {/* Capacity Info */}
                    <div className="rounded-lg border p-4">
                        <h4 className="mb-3 font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Capacidade
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <Label className="text-muted-foreground text-sm">Horas Disponíveis/Dia</Label>
                                <p className="font-medium">{workCell.available_hours_per_day}h</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-sm">Eficiência</Label>
                                <p className="font-medium">{workCell.efficiency_percentage}%</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-sm">Capacidade Efetiva</Label>
                                <p className="font-medium">
                                    {(workCell.available_hours_per_day * workCell.efficiency_percentage / 100).toFixed(2)}h/dia
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Location/Assignment */}
                    <div className="rounded-lg border p-4">
                        <h4 className="mb-3 font-medium flex items-center gap-2">
                            {workCell.cell_type === 'internal' ? <MapPin className="h-4 w-4" /> : <Factory className="h-4 w-4" />}
                            {workCell.cell_type === 'internal' ? 'Localização' : 'Fornecedor'}
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {workCell.shift && (
                                <div>
                                    <Label className="text-muted-foreground text-sm">Turno</Label>
                                    <p className="font-medium">{workCell.shift.name}</p>
                                </div>
                            )}
                            {workCell.cell_type === 'internal' ? (
                                <>
                                    {workCell.plant && (
                                        <div>
                                            <Label className="text-muted-foreground text-sm">Planta</Label>
                                            <p className="font-medium">{workCell.plant.name}</p>
                                        </div>
                                    )}
                                    {workCell.area && (
                                        <div>
                                            <Label className="text-muted-foreground text-sm">Área</Label>
                                            <p className="font-medium">{workCell.area.name}</p>
                                        </div>
                                    )}
                                    {workCell.sector && (
                                        <div>
                                            <Label className="text-muted-foreground text-sm">Setor</Label>
                                            <p className="font-medium">{workCell.sector.name}</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {workCell.manufacturer && (
                                        <div>
                                            <Label className="text-muted-foreground text-sm">Fabricante</Label>
                                            <p className="font-medium">{workCell.manufacturer.name}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    {/* Status */}
                    <div>
                        <Label className="text-muted-foreground text-sm">Status</Label>
                        <Badge variant={workCell.is_active ? 'default' : 'secondary'}>
                            {workCell.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        );
    }
    return (
        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Editar Célula de Trabalho</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextInput
                            form={{ data, setData, errors, clearErrors: () => { } }}
                            name="name"
                            label="Nome"
                            placeholder="Nome da célula"
                            required
                        />
                        <div className="grid gap-2">
                            <Label>Tipo de Célula <span className="text-destructive">*</span></Label>
                            <RadioGroup
                                value={data.cell_type}
                                onValueChange={(value) => {
                                    setData('cell_type', value as 'internal' | 'external');
                                    // Clear location fields when switching to external
                                    if (value === 'external') {
                                        setData('plant_id', '');
                                        setData('area_id', '');
                                        setData('sector_id', '');
                                    }
                                    // Clear manufacturer when switching to internal
                                    if (value === 'internal') {
                                        setData('manufacturer_id', '');
                                    }
                                }}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="internal" id="internal" />
                                    <Label htmlFor="internal">Interna</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="external" id="external" />
                                    <Label htmlFor="external">Externa</Label>
                                </div>
                            </RadioGroup>
                            {errors.cell_type && <span className="text-destructive text-sm">{errors.cell_type}</span>}
                        </div>
                    </div>
                    <TextInput
                        form={{ data, setData, errors, clearErrors: () => { } }}
                        name="description"
                        label="Descrição"
                        placeholder="Descrição da célula"
                    />
                    {/* Capacity */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextInput
                            form={{ data, setData, errors, clearErrors: () => { } }}
                            name="available_hours_per_day"
                            label="Horas Disponíveis/Dia"
                            placeholder="8"
                            required
                        />
                        <TextInput
                            form={{ data, setData, errors, clearErrors: () => { } }}
                            name="efficiency_percentage"
                            label="Eficiência (%)"
                            placeholder="85"
                            required
                        />
                    </div>
                    {/* Shift */}
                    <ItemSelect
                        label="Turno"
                        items={shifts}
                        value={data.shift_id}
                        onValueChange={(value) => setData('shift_id', value)}
                        placeholder="Selecione um turno"
                        error={errors.shift_id}
                        canClear
                    />
                    {/* Location - Only for internal cells */}
                    {data.cell_type === 'internal' && (
                        <>
                            <ItemSelect
                                label="Planta"
                                items={plants}
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
                            {data.plant_id && (
                                <ItemSelect
                                    label="Área"
                                    items={areas}
                                    value={data.area_id}
                                    onValueChange={(value) => {
                                        setData('area_id', value);
                                        // Clear dependent field
                                        setData('sector_id', '');
                                    }}
                                    placeholder="Selecione uma área"
                                    error={errors.area_id}
                                    canClear
                                />
                            )}
                            {data.area_id && (
                                <ItemSelect
                                    label="Setor"
                                    items={sectors}
                                    value={data.sector_id}
                                    onValueChange={(value) => setData('sector_id', value)}
                                    placeholder="Selecione um setor"
                                    error={errors.sector_id}
                                    canClear
                                />
                            )}
                        </>
                    )}
                    {/* Manufacturer - Only for external cells */}
                    {data.cell_type === 'external' && (
                        <ItemSelect
                            label="Fabricante"
                            items={manufacturers}
                            value={data.manufacturer_id}
                            onValueChange={(value) => setData('manufacturer_id', value)}
                            placeholder="Selecione um fabricante"
                            error={errors.manufacturer_id}
                            required
                        />
                    )}
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="is_active">Ativa</Label>
                        <Switch
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData('is_active', checked)}
                        />
                    </div>
                </CardContent>
                <div className="flex justify-end gap-2 border-t p-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing}
                    >
                        {processing ? 'Salvando...' : 'Salvar'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}