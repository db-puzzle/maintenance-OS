import CreateShiftSheet from '@/components/CreateShiftSheet';
import ItemSelect from '@/components/ItemSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { AlertCircle, Calendar, Clock, Edit2 } from 'lucide-react';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

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
    schedules: Schedule[];
    total_work_hours?: number;
    total_work_minutes?: number;
    total_break_hours?: number;
    total_break_minutes?: number;
}

interface ShiftSelectionCardProps {
    shifts: Shift[];
    selectedShiftId: string;
    tempSelectedShiftId: string;
    isEditingShift: boolean;
    loadingShifts: boolean;
    onEditShift: () => void;
    onCancelShiftEdit: () => void;
    onSaveShift: () => void;
    onShiftChange: (shiftId: string) => void;
    onCreateClick: () => void;
    onShiftUpdated?: (shift: Shift) => void;
    currentAssetId?: number;
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

const ShiftSelectionCard = forwardRef<ShiftSelectionCardRef, ShiftSelectionCardProps>(
    (
        {
            shifts,
            selectedShiftId,
            tempSelectedShiftId,
            isEditingShift,
            loadingShifts,
            onEditShift,
            onCancelShiftEdit,
            onSaveShift,
            onShiftChange,
            onCreateClick,
            onShiftUpdated,
            currentAssetId,
        },
        ref,
    ) => {
        const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
        const [selectedShiftData, setSelectedShiftData] = useState<EditableShift | null>(null);
        const [loadingShiftData, setLoadingShiftData] = useState(false);
        const itemSelectRef = useRef<HTMLButtonElement>(null);

        // Find the currently selected shift
        const currentShift = shifts.find((s) => s.id.toString() === (isEditingShift ? tempSelectedShiftId : selectedShiftId));

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
            triggerEditWithFocus: handleEditShiftClick,
        }));

        // Handle edit existing shift button click
        const handleEditExistingShiftClick = async () => {
            if (!tempSelectedShiftId) return;

            setLoadingShiftData(true);
            try {
                const response = await axios.get(route('asset-hierarchy.shifts.show', { shift: tempSelectedShiftId }), {
                    params: { format: 'json' },
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
        const handleShiftUpdateSuccess = (updatedShift: Shift) => {
            setIsEditSheetOpen(false);
            setSelectedShiftData(null);

            // Check if this is a new shift (created from copy operation)
            // We can detect this by checking if the shift ID is different from the one we were editing
            const isNewShiftFromCopy = selectedShiftData && updatedShift.id !== selectedShiftData.id;

            if (isNewShiftFromCopy) {
                // For copy operation, exit edit mode first
                if (isEditingShift) {
                    onCancelShiftEdit();
                }

                // Then reload the page, preserving the current tab
                // The asset is already associated with the new shift by the backend
                // Reloading will refresh the shifts list, runtime data, and select the new shift
                setTimeout(() => {
                    // Get current URL and ensure we stay on the shifts-runtime tab
                    const currentUrl = new URL(window.location.href);
                    currentUrl.searchParams.set('tab', 'shifts-runtime');
                    router.visit(currentUrl.toString(), {
                        preserveScroll: true,
                        preserveState: false,
                    });
                }, 100); // Small delay to ensure state updates are processed
            } else {
                // For regular updates, use the existing strategy
                // Don't reload the page - let the parent component handle the update
                // This ensures we stay on the same tab, just like when creating a new shift
                if (onShiftUpdated) {
                    // The updatedShift from CreateShiftSheet already has the correct format
                    // matching what the parent expects
                    onShiftUpdated(updatedShift);
                }
            }
        };

        // Calculate totals for the selected shift
        let totalWorkMinutes = 0;
        let totalBreakMinutes = 0;

        if (currentShift?.schedules) {
            currentShift.schedules.forEach((schedule) => {
                schedule.shifts.forEach((shift) => {
                    if (shift.active) {
                        const shiftDuration = calculateDuration(shift.start_time, shift.end_time);
                        totalWorkMinutes += shiftDuration;

                        shift.breaks.forEach((breakTime) => {
                            const breakDuration = calculateDuration(breakTime.start_time, breakTime.end_time);
                            totalBreakMinutes += breakDuration;
                        });
                    }
                });
            });
        } else if (currentShift) {
            // Use pre-calculated values if available
            totalWorkMinutes = (currentShift.total_work_hours || 0) * 60 + (currentShift.total_work_minutes || 0);
            totalBreakMinutes = (currentShift.total_break_hours || 0) * 60 + (currentShift.total_break_minutes || 0);
        }

        const netWorkMinutes = totalWorkMinutes - totalBreakMinutes;

        // Determine if we have a selected shift (either in edit mode or normal mode)
        const hasSelectedShift = (isEditingShift ? tempSelectedShiftId : selectedShiftId) && currentShift;

        return (
            <div className="h-full space-y-4">
                <div className="flex h-full flex-col rounded-lg border border-gray-200 p-6">
                    {/* Header with title and action buttons */}
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Configuração de Turno</h3>
                        {!isEditingShift && hasSelectedShift ? (
                            <Button onClick={handleEditShiftClick} variant="outline" size="sm">
                                <Calendar className="mr-2 h-4 w-4" />
                                Modificar
                            </Button>
                        ) : !isEditingShift && !hasSelectedShift ? (
                            <Button onClick={handleEditShiftClick} variant="default" size="sm">
                                <Clock className="mr-2 h-4 w-4" />
                                Adicionar Turno
                            </Button>
                        ) : isEditingShift ? (
                            <div className="flex gap-2">
                                <Button onClick={onCancelShiftEdit} variant="outline" size="sm">
                                    Cancelar
                                </Button>
                                <Button onClick={onSaveShift} size="sm" variant="default">
                                    Salvar
                                </Button>
                            </div>
                        ) : null}
                    </div>

                    {/* Shift Selection */}
                    <div className="mb-4">
                        {/* Header - always visible */}
                        <div className="mb-1 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Turno de Operação</span>
                        </div>

                        {!isEditingShift ? (
                            // View mode - Display shift name like runtime hours
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{currentShift?.name || 'Nenhum turno selecionado'}</p>
                            </div>
                        ) : (
                            // Edit mode - Show ItemSelect
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <ItemSelect
                                        ref={itemSelectRef}
                                        items={shifts.map((shift) => ({
                                            id: shift.id,
                                            name: shift.name,
                                            value: shift.id.toString(),
                                        }))}
                                        value={isEditingShift ? tempSelectedShiftId : selectedShiftId}
                                        onValueChange={onShiftChange}
                                        placeholder={loadingShifts ? 'Carregando turnos...' : 'Selecione um turno'}
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
                                        className=""
                                    >
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        {loadingShiftData ? 'Carregando...' : 'Editar'}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Shift Summary - More compact design matching AssetRuntimeInput */}
                    {currentShift ? (
                        <div className="space-y-3">
                            {/* Weekly Hours Summary */}
                            <div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Horas Semanais</p>
                                        <p className="text-lg font-bold text-gray-900">{formatHours(totalWorkMinutes)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Intervalos</p>
                                        <p className="text-lg font-bold text-gray-900">{formatHours(totalBreakMinutes)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Trabalhando</p>
                                        <p className="text-primary-600 text-lg font-bold">{formatHours(netWorkMinutes)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : selectedShiftId || tempSelectedShiftId ? (
                        <div className="mb-4 rounded-md bg-gray-50 p-3">
                            <p className="text-center text-xs text-gray-500">Carregando informações do turno...</p>
                        </div>
                    ) : (
                        <div className="mb-4 rounded-md bg-gray-50 p-3">
                            <p className="text-center text-xs text-gray-500">Selecione um turno para ver o resumo</p>
                        </div>
                    )}

                    {/* Alert about automatic runtime recording */}
                    {isEditingShift && tempSelectedShiftId && tempSelectedShiftId !== selectedShiftId && (
                        <Alert className="mt-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Ao salvar a mudança de turno, o horímetro atual será registrado automaticamente para preservar o histórico de
                                operação.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* CreateShiftSheet for editing */}
                {selectedShiftData && (
                    <CreateShiftSheet
                        isOpen={isEditSheetOpen}
                        onOpenChange={setIsEditSheetOpen}
                        onSuccess={handleShiftUpdateSuccess}
                        initialShift={selectedShiftData}
                        currentAssetId={currentAssetId}
                    />
                )}
            </div>
        );
    },
);

ShiftSelectionCard.displayName = 'ShiftSelectionCard';

export default ShiftSelectionCard;
export type { ShiftSelectionCardRef };
