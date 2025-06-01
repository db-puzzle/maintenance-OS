import { Button } from '@/components/ui/button';
import ItemSelect from '@/components/ItemSelect';
import { Calendar, Clock, Coffee, Activity, Edit2 } from 'lucide-react';
import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import CreateShiftSheet from '@/components/CreateShiftSheet';
import axios from 'axios';

interface Break {
    start_time: string;
    end_time: string;
}

interface ShiftDetail {
    start_time: string;
    end_time: string;
    active: boolean;
    breaks: Break[];
}

interface Schedule {
    weekday: string;
    shifts: ShiftDetail[];
}

interface Shift {
    id: number;
    name: string;
    plant?: {
        id: number;
        name: string;
    };
    schedules?: Schedule[];
    total_work_hours?: number;
    total_work_minutes?: number;
    total_break_hours?: number;
    total_break_minutes?: number;
}

interface Plant {
    id: number;
    name: string;
}

interface ShiftSelectionCardProps {
    shifts: Shift[];
    selectedShiftId: string;
    tempSelectedShiftId: string;
    isEditingShift: boolean;
    loadingShifts: boolean;
    plantToShow: Plant;
    onEditShift: () => void;
    onCancelShiftEdit: () => void;
    onSaveShift: () => void;
    onShiftChange: (shiftId: string) => void;
    onCreateClick: () => void;
}

// Type for the shift data used in CreateShiftSheet
interface EditableShift {
    id: number;
    name: string;
    schedules: Schedule[];
}

// Helper functions
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const calculateDuration = (start: string, end: string): number => {
    const startMinutes = timeToMinutes(start);
    let endMinutes = timeToMinutes(end);

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    return endMinutes - startMinutes;
};

const formatHours = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
        return `${hours} horas`;
    }
    return `${hours}h ${minutes}min`;
};

// Add ref methods interface
interface ShiftSelectionCardRef {
    triggerEditWithFocus: () => void;
}

const ShiftSelectionCard = forwardRef<ShiftSelectionCardRef, ShiftSelectionCardProps>(({
    shifts,
    selectedShiftId,
    tempSelectedShiftId,
    isEditingShift,
    loadingShifts,
    plantToShow,
    onEditShift,
    onCancelShiftEdit,
    onSaveShift,
    onShiftChange,
    onCreateClick,
}, ref) => {
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [selectedShiftData, setSelectedShiftData] = useState<EditableShift | null>(null);
    const [loadingShiftData, setLoadingShiftData] = useState(false);
    const itemSelectRef = useRef<HTMLButtonElement>(null);

    // Find the currently selected shift
    const currentShift = shifts.find(s => s.id.toString() === (isEditingShift ? tempSelectedShiftId : selectedShiftId));

    // Handle edit/add shift button click
    const handleEditShiftClick = () => {
        onEditShift();
        // Focus the ItemSelect after state update
        setTimeout(() => {
            itemSelectRef.current?.focus();
        }, 100);
    };

    // Expose the edit+focus function to parent components
    useImperativeHandle(ref, () => ({
        triggerEditWithFocus: handleEditShiftClick
    }));

    // Handle edit existing shift button click
    const handleEditExistingShiftClick = async () => {
        if (!tempSelectedShiftId) return;

        setLoadingShiftData(true);
        try {
            const response = await axios.get(route('asset-hierarchy.shifts.show', { shift: tempSelectedShiftId }), {
                params: { format: 'json' }
            });
            setSelectedShiftData(response.data.shift);
            setIsEditSheetOpen(true);
        } catch (error) {
            console.error('Error loading shift data:', error);
        } finally {
            setLoadingShiftData(false);
        }
    };

    // Handle successful shift update
    const handleShiftUpdateSuccess = (updatedShift: EditableShift) => {
        setIsEditSheetOpen(false);
        setSelectedShiftData(null);
        // Reload the page to refresh shifts data
        window.location.reload();
    };

    // Calculate totals for the selected shift
    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;
    let activeDaysCount = 0;

    if (currentShift?.schedules) {
        currentShift.schedules.forEach(schedule => {
            const hasActiveShifts = schedule.shifts.some(s => s.active);
            if (hasActiveShifts) {
                activeDaysCount++;
            }

            schedule.shifts.forEach(shift => {
                if (shift.active) {
                    const shiftDuration = calculateDuration(shift.start_time, shift.end_time);
                    totalWorkMinutes += shiftDuration;

                    shift.breaks.forEach(breakTime => {
                        const breakDuration = calculateDuration(breakTime.start_time, breakTime.end_time);
                        totalBreakMinutes += breakDuration;
                    });
                }
            });
        });
    } else if (currentShift) {
        // Use pre-calculated values if available
        totalWorkMinutes = ((currentShift.total_work_hours || 0) * 60) + (currentShift.total_work_minutes || 0);
        totalBreakMinutes = ((currentShift.total_break_hours || 0) * 60) + (currentShift.total_break_minutes || 0);
        // Estimate active days based on weekly hours (assuming 8-hour workdays)
        activeDaysCount = Math.round(totalWorkMinutes / 60 / 8);
    }

    const netWorkMinutes = totalWorkMinutes - totalBreakMinutes;

    // Determine if we have a selected shift (either in edit mode or normal mode)
    const hasSelectedShift = (isEditingShift ? tempSelectedShiftId : selectedShiftId) && currentShift;

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-6">
                {/* Header with title and action buttons */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Configuração de Turno</h3>
                    {!isEditingShift ? (
                        <Button onClick={handleEditShiftClick} variant={hasSelectedShift ? "outline" : "default"} size="sm">
                            <Calendar className="mr-2 h-4 w-4" />
                            {hasSelectedShift ? 'Modificar' : 'Adicionar Turno'}
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button onClick={onCancelShiftEdit} variant="outline" size="sm">
                                Cancelar
                            </Button>
                            <Button onClick={onSaveShift} size="sm" variant="default">
                                Salvar
                            </Button>
                        </div>
                    )}
                </div>

                {/* Shift Summary - More compact design matching AssetRuntimeInput */}
                {currentShift ? (
                    <div className="space-y-3 mb-4">
                        {/* Weekly Hours Summary */}
                        <div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Horas Semanais</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {formatHours(totalWorkMinutes)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Intervalos</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {formatHours(totalBreakMinutes)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Trabalhando</p>
                                    <p className="text-lg font-bold text-primary-600">
                                        {formatHours(netWorkMinutes)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : selectedShiftId || tempSelectedShiftId ? (
                    <div className="p-3 bg-gray-50 rounded-md mb-4">
                        <p className="text-xs text-gray-500 text-center">
                            Carregando informações do turno...
                        </p>
                    </div>
                ) : (
                    <div className="p-3 bg-gray-50 rounded-md mb-4">
                        <p className="text-xs text-gray-500 text-center">
                            Selecione um turno para ver o resumo
                        </p>
                    </div>
                )}

                {/* Shift Selection */}
                <div className="mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <ItemSelect
                                ref={itemSelectRef}
                                label="Turno de Operação"
                                items={shifts.map(shift => ({
                                    id: shift.id,
                                    name: shift.name,
                                    value: shift.id.toString(),
                                }))}
                                value={isEditingShift ? tempSelectedShiftId : selectedShiftId}
                                onValueChange={onShiftChange}
                                placeholder={loadingShifts ? "Carregando turnos..." : "Selecione um turno"}
                                canCreate={isEditingShift}
                                onCreateClick={onCreateClick}
                                disabled={loadingShifts || !isEditingShift}
                                canClear={isEditingShift}
                            />
                        </div>
                        {isEditingShift && tempSelectedShiftId && (
                            <Button
                                onClick={handleEditExistingShiftClick}
                                variant="outline"
                                size="sm"
                                disabled={loadingShiftData}
                                className="mt-6"
                            >
                                <Edit2 className="mr-2 h-4 w-4" />
                                {loadingShiftData ? 'Carregando...' : 'Editar'}
                            </Button>
                        )}
                    </div>
                    {!loadingShifts && shifts.length === 0 && (
                        <p className="mt-2 text-sm text-gray-500">
                            Nenhum turno cadastrado para a planta {plantToShow.name}.
                        </p>
                    )}
                </div>
            </div>

            {/* CreateShiftSheet for editing */}
            {selectedShiftData && (
                <CreateShiftSheet
                    isOpen={isEditSheetOpen}
                    onOpenChange={setIsEditSheetOpen}
                    onSuccess={handleShiftUpdateSuccess}
                    initialShift={selectedShiftData}
                />
            )}
        </div>
    );
});

ShiftSelectionCard.displayName = 'ShiftSelectionCard';

export default ShiftSelectionCard;
export type { ShiftSelectionCardRef }; 