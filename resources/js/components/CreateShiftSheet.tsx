import { TextInput } from '@/components/TextInput';
import TimeSelect from '@/components/TimeSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useForm } from '@inertiajs/react';
import { AlertCircle, Clock, Copy, Plus, Table, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';
import ShiftCalendarView from '@/components/ShiftCalendarView';
import ShiftTableView from '@/components/ShiftTableView';
import axios from 'axios';
import { TIMEZONE_GROUPS } from '@/constants/timezones';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import InputError from '@/components/input-error';
import { ShiftUpdateConfirmationDialog } from '@/components/work-orders/ShiftUpdateConfirmationDialog';
import { Checkbox } from '@/components/ui/checkbox';
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
interface AffectedAsset {
    id: number;
    tag: string;
    description: string | null;
    asset_type: string | null;
    plant: string | null;
    area: string | null;
    sector: string | null;
    current_runtime_hours: number;
}
interface CreateShiftSheetProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: (shift: { id: number; name: string; timezone?: string; schedules: Schedule[] }) => void;
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    initialShift?: {
        id: number;
        name: string;
        timezone?: string;
        schedules: Schedule[];
    };
    currentAssetId?: number;
}
// Create a proper type for the form data
interface ShiftFormWithTimezone {
    name: string;
    timezone: string;
    schedules: {
        weekday: string;
        shifts: {
            start_time: string;
            end_time: string;
            active: boolean;
            breaks: {
                start_time: string;
                end_time: string;
            }[];
        }[];
    }[];
}
const weekdays = [
    { key: 'Monday', label: 'Segunda' },
    { key: 'Tuesday', label: 'Terça' },
    { key: 'Wednesday', label: 'Quarta' },
    { key: 'Thursday', label: 'Quinta' },
    { key: 'Friday', label: 'Sexta' },
    { key: 'Saturday', label: 'Sábado' },
    { key: 'Sunday', label: 'Domingo' },
];
// Helper functions from shift-editor.tsx
const isBreakValid = (shift: Shift, breakTime: Break): boolean => {
    const shiftStart = new Date(`2000-01-01T${shift.start_time}`);
    const shiftEnd = new Date(`2000-01-01T${shift.end_time}`);
    const breakStart = new Date(`2000-01-01T${breakTime.start_time}`);
    const breakEnd = new Date(`2000-01-01T${breakTime.end_time}`);
    // Se o turno termina no dia seguinte
    if (shiftEnd < shiftStart) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
    }
    // Se o intervalo termina no dia seguinte
    if (breakEnd < breakStart) {
        breakEnd.setDate(breakEnd.getDate() + 1);
    }
    return breakStart >= shiftStart && breakEnd <= shiftEnd;
};
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};
const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};
const calculateDuration = (start: string, end: string): number => {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    // Se o horário final for menor que o inicial, significa que atravessou a meia-noite
    if (endMinutes < startMinutes) {
        return 24 * 60 - startMinutes + endMinutes;
    }
    return endMinutes - startMinutes;
};
const addMinutes = (time: string, minutes: number): string => {
    const totalMinutes = timeToMinutes(time) + minutes;
    return minutesToTime(totalMinutes);
};
const findLargestGap = (shift: Shift): { start: string; end: string } | null => {
    if (shift.breaks.length === 0) {
        return {
            start: shift.start_time,
            end: shift.end_time,
        };
    }
    // Ordena os intervalos por horário de início
    const sortedBreaks = [...shift.breaks].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    let largestGap = 0;
    let gapStart = shift.start_time;
    let gapEnd = shift.end_time;
    // Verifica o período antes do primeiro intervalo
    const firstGap = calculateDuration(shift.start_time, sortedBreaks[0].start_time);
    if (firstGap > largestGap) {
        largestGap = firstGap;
        gapStart = shift.start_time;
        gapEnd = sortedBreaks[0].start_time;
    }
    // Verifica os períodos entre intervalos
    for (let i = 0; i < sortedBreaks.length - 1; i++) {
        const currentGap = calculateDuration(sortedBreaks[i].end_time, sortedBreaks[i + 1].start_time);
        if (currentGap > largestGap) {
            largestGap = currentGap;
            gapStart = sortedBreaks[i].end_time;
            gapEnd = sortedBreaks[i + 1].start_time;
        }
    }
    // Verifica o período após o último intervalo
    const lastGap = calculateDuration(sortedBreaks[sortedBreaks.length - 1].end_time, shift.end_time);
    if (lastGap > largestGap) {
        largestGap = lastGap;
        gapStart = sortedBreaks[sortedBreaks.length - 1].end_time;
        gapEnd = shift.end_time;
    }
    return largestGap > 0 ? { start: gapStart, end: gapEnd } : null;
};
const hasOverlappingShifts = (shift1: Shift, shift2: Shift): boolean => {
    const shift1Start = timeToMinutes(shift1.start_time);
    const shift1End = timeToMinutes(shift1.end_time);
    const shift2Start = timeToMinutes(shift2.start_time);
    const shift2End = timeToMinutes(shift2.end_time);
    // Se algum dos turnos atravessa a meia-noite
    if (shift1End < shift1Start) {
        // Verifica se o turno 2 começa antes do turno 1 terminar
        if (shift2Start < shift1End) return true;
        // Verifica se o turno 2 termina depois do turno 1 começar
        if (shift2End > shift1Start) return true;
        // Verifica se o turno 2 atravessa a meia-noite e se sobrepõe
        if (shift2End < shift2Start && shift2Start < shift1End && shift2End > shift1Start) return true;
    } else if (shift2End < shift2Start) {
        // Verifica se o turno 1 começa antes do turno 2 terminar
        if (shift1Start < shift2End) return true;
        // Verifica se o turno 1 termina depois do turno 2 começar
        if (shift1End > shift2Start) return true;
        // Verifica se o turno 1 atravessa a meia-noite e se sobrepõe
        if (shift1End < shift1Start && shift1Start < shift2End && shift1End > shift2Start) return true;
    } else {
        // Caso nenhum dos turnos atravesse a meia-noite
        return shift1Start < shift2End && shift2Start < shift1End;
    }
    return false;
};
const findOverlappingShifts = (shifts: Shift[], currentShiftIndex: number): number[] => {
    const currentShift = shifts[currentShiftIndex];
    const overlappingIndices: number[] = [];
    for (let i = 0; i < shifts.length; i++) {
        if (i !== currentShiftIndex && hasOverlappingShifts(currentShift, shifts[i])) {
            overlappingIndices.push(i);
        }
    }
    return overlappingIndices;
};
const hasOverlappingBreaks = (break1: Break, break2: Break): boolean => {
    const break1Start = timeToMinutes(break1.start_time);
    const break1End = timeToMinutes(break1.end_time);
    const break2Start = timeToMinutes(break2.start_time);
    const break2End = timeToMinutes(break2.end_time);
    // Se algum dos intervalos atravessa a meia-noite
    if (break1End < break1Start) {
        // Verifica se o intervalo 2 começa antes do intervalo 1 terminar
        if (break2Start < break1End) return true;
        // Verifica se o intervalo 2 termina depois do intervalo 1 começar
        if (break2End > break1Start) return true;
        // Verifica se o intervalo 2 atravessa a meia-noite e se sobrepõe
        if (break2End < break2Start && break2Start < break1End && break2End > break1Start) return true;
    } else if (break2End < break2Start) {
        // Verifica se o intervalo 1 começa antes do intervalo 2 terminar
        if (break1Start < break2End) return true;
        // Verifica se o intervalo 1 termina depois do intervalo 2 começar
        if (break1End > break2Start) return true;
        // Verifica se o intervalo 1 atravessa a meia-noite e se sobrepõe
        if (break1End < break1Start && break1Start < break2End && break1End > break2Start) return true;
    } else {
        // Caso nenhum dos intervalos atravesse a meia-noite
        return break1Start < break2End && break2Start < break1End;
    }
    return false;
};
const isBreakOverlapping = (shift: Shift, currentBreak: Break, currentBreakIndex: number): boolean => {
    return shift.breaks.some((breakTime, index) => index !== currentBreakIndex && hasOverlappingBreaks(currentBreak, breakTime));
};
const CreateShiftSheet = forwardRef<HTMLButtonElement, CreateShiftSheetProps>(
    ({ isOpen, onOpenChange, onSuccess, triggerText = 'Novo Turno', triggerVariant = 'outline', showTrigger = false, initialShift, currentAssetId }, ref) => {

        const [open, setOpen] = useState(false);
        const buttonRef = useRef<HTMLButtonElement>(null);
        const nameInputRef = useRef<HTMLInputElement>(null);
        // Expose button click to parent component
        useImperativeHandle(ref, () => buttonRef.current!, []);
        // Get user's timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Initialize form data based on whether we're editing or creating
        const getInitialFormData = () => {
            if (initialShift) {
                return {
                    name: initialShift.name,
                    timezone: initialShift.timezone || userTimezone,
                    schedules: initialShift.schedules,
                };
            }
            return {
                name: '5x10',
                timezone: userTimezone,
                schedules: weekdays.map((day) => ({
                    weekday: day.key,
                    shifts:
                        day.key === 'Saturday' || day.key === 'Sunday'
                            ? []
                            : [
                                {
                                    start_time: '07:00',
                                    end_time: '17:00',
                                    active: true,
                                    breaks: [{ start_time: '12:00', end_time: '13:00' }],
                                },
                            ],
                })),
            };
        };
         
        const { data, setData, processing, errors, clearErrors, setError } = useForm<ShiftFormWithTimezone>(getInitialFormData());
        
        // Create a wrapper for setData to match the TextInput expected signature
        const handleSetData = (name: string, value: string | number | boolean | File | null | undefined) => {
            if (name === 'name' || name === 'timezone') {
                setData(name as keyof ShiftFormWithTimezone, value as string);
            }
        };
        
        // Helper function to safely get schedules from form data
        const getSchedulesFromData = (): Schedule[] => {
            const schedules = data.schedules;
            if (Array.isArray(schedules)) {
                return schedules as Schedule[];
            }
            // If it's the complex type from ShiftForm, convert it
            if (schedules && typeof schedules === 'object') {
                return Object.values(schedules) as Schedule[];
            }
            return [];
        };
        
        // Update the schedules
        const updateSchedules = (newSchedules: Schedule[]) => {
            const formattedSchedules = newSchedules.map(schedule => ({
                weekday: schedule.weekday,
                shifts: schedule.shifts.map(shift => ({
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    active: shift.active,
                    breaks: shift.breaks.map(breakItem => ({
                        start_time: breakItem.start_time,
                        end_time: breakItem.end_time
                    }))
                }))
            }));
            setData('schedules', formattedSchedules);
        };
        // Get the label for the selected timezone
        const getTimezoneLabel = (value: string) => {
            for (const zones of Object.values(TIMEZONE_GROUPS)) {
                const zone = zones.find((z) => z.value === value);
                if (zone) return zone.label;
            }
            return value;
        };
        const [selectedDay, setSelectedDay] = useState(weekdays[0].key);
        const [selectedDays, setSelectedDays] = useState<string[]>([]);
        const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
        const [copyPopoverOpen, setCopyPopoverOpen] = useState(false);
        const [showConfirmDialog, setShowConfirmDialog] = useState(false);
        const [affectedAssets, setAffectedAssets] = useState<AffectedAsset[]>([]);
        const [pendingSubmitData, setPendingSubmitData] = useState<ShiftFormWithTimezone | null>(null);
        const [updateMode, setUpdateMode] = useState<'all' | 'selected'>('all');
        const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
        const [timezoneOpen, setTimezoneOpen] = useState(false);
        const effectiveOpen = isOpen !== undefined ? isOpen : open;
        const effectiveSetOpen = onOpenChange || setOpen;
        // Auto-focus name input when sheet opens
        useEffect(() => {
            if (effectiveOpen && nameInputRef.current) {
                // Use requestAnimationFrame to ensure the sheet animation has started
                requestAnimationFrame(() => {
                    // Add a small delay to ensure the sheet is fully rendered
                    setTimeout(() => {
                        nameInputRef.current?.focus();
                    }, 100);
                });
            }
        }, [effectiveOpen]);
        // Additional focus attempt when the component mounts and sheet is open
        useEffect(() => {
            if (effectiveOpen) {
                // Try multiple times to ensure focus works
                const attempts = [100, 200, 300, 500];
                attempts.forEach((delay) => {
                    setTimeout(() => {
                        if (nameInputRef.current && document.activeElement !== nameInputRef.current) {
                            nameInputRef.current.focus();
                        }
                    }, delay);
                });
            }
        }, [effectiveOpen]);
        const addShift = (dayIndex: number) => {
             
            const newSchedules = [...getSchedulesFromData()];
            const existingShifts = newSchedules[dayIndex].shifts;
            // Se não houver turnos, usa o padrão
            if (existingShifts.length === 0) {
                newSchedules[dayIndex].shifts.push({
                    start_time: '07:00',
                    end_time: '17:00',
                    active: true,
                    breaks: [{ start_time: '12:00', end_time: '13:00' }],
                });
            } else {
                // Pega o último turno
                const lastShift = existingShifts[existingShifts.length - 1];
                const lastEndTime = lastShift.end_time;
                // Calcula o novo horário
                const [lastEndHour, lastEndMinute] = lastEndTime.split(':').map(Number);
                const newStartHour = lastEndHour;
                const newStartMinute = lastEndMinute;
                // Calcula o horário de término (9 horas depois)
                let newEndHour = newStartHour + 9;
                if (newEndHour >= 24) {
                    newEndHour -= 24;
                }
                // Calcula o horário do intervalo (4 horas depois do início)
                let breakStartHour = newStartHour + 4;
                if (breakStartHour >= 24) {
                    breakStartHour -= 24;
                }
                let breakEndHour = breakStartHour + 1;
                if (breakEndHour >= 24) {
                    breakEndHour -= 24;
                }
                // Formata os horários
                const formatTime = (hour: number, minute: number) => {
                    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                };
                newSchedules[dayIndex].shifts.push({
                    start_time: formatTime(newStartHour, newStartMinute),
                    end_time: formatTime(newEndHour, newStartMinute),
                    active: true,
                    breaks: [
                        {
                            start_time: formatTime(breakStartHour, newStartMinute),
                            end_time: formatTime(breakEndHour, newStartMinute),
                        },
                    ],
                });
            }
            updateSchedules(newSchedules);
        };
        const removeShift = (dayIndex: number, shiftIndex: number) => {
            const currentSchedules = getSchedulesFromData();
            const newSchedules = currentSchedules.map((day, idx) => {
                if (idx === dayIndex) {
                    return {
                        ...day,
                        shifts: day.shifts.filter((_, index) => index !== shiftIndex),
                    };
                }
                return day;
            });
            updateSchedules(newSchedules);
        };
        const addBreak = (dayIndex: number, shiftIndex: number) => {
             
            const newSchedules = [...getSchedulesFromData()];
            const shift = newSchedules[dayIndex].shifts[shiftIndex];
            if (shift.breaks.length === 0) {
                // Se não houver intervalos, adiciona um intervalo de 30 minutos no meio do turno
                const shiftDuration = calculateDuration(shift.start_time, shift.end_time);
                const breakStart = addMinutes(shift.start_time, Math.floor(shiftDuration / 2) - 15);
                const breakEnd = addMinutes(breakStart, 30);
                newSchedules[dayIndex].shifts[shiftIndex].breaks.push({
                    start_time: breakStart,
                    end_time: breakEnd,
                });
            } else {
                // Encontra o maior período sem intervalo
                const largestGap = findLargestGap(shift);
                if (largestGap) {
                    const gapDuration = calculateDuration(largestGap.start, largestGap.end);
                    const breakStart = addMinutes(largestGap.start, Math.floor(gapDuration / 2) - 7);
                    const breakEnd = addMinutes(breakStart, 15);
                    newSchedules[dayIndex].shifts[shiftIndex].breaks.push({
                        start_time: breakStart,
                        end_time: breakEnd,
                    });
                }
            }
            updateSchedules(newSchedules);
        };
        const removeBreak = (dayIndex: number, shiftIndex: number, breakIndex: number) => {
            const newSchedules = getSchedulesFromData().map((day, idx) => {
                if (idx === dayIndex) {
                    return {
                        ...day,
                        shifts: day.shifts.map((shift, sIdx) => {
                            if (sIdx === shiftIndex) {
                                return {
                                    ...shift,
                                    breaks: shift.breaks.filter((_, bIdx) => bIdx !== breakIndex),
                                };
                            }
                            return shift;
                        }),
                    };
                }
                return day;
            });
            updateSchedules(newSchedules);
        };
        const updateBreak = (dayIndex: number, shiftIndex: number, breakIndex: number, field: keyof Break, value: string) => {
             
            const newSchedules = [...getSchedulesFromData()];
            newSchedules[dayIndex].shifts[shiftIndex].breaks[breakIndex][field] = value;
            updateSchedules(newSchedules);
        };
        const applyToSelectedDays = () => {
             
            const sourceDay = getSchedulesFromData().find((s) => s.weekday === selectedDay);
            if (!sourceDay) return;
             
            const newSchedules = getSchedulesFromData().map((schedule) => {
                if (selectedDays.includes(schedule.weekday)) {
                    // Cria uma cópia profunda do dia de origem
                    return {
                        ...sourceDay,
                        weekday: schedule.weekday,
                         
                        shifts: sourceDay.shifts.map((shift) => ({
                            ...shift,
                             
                            breaks: shift.breaks.map((breakTime) => ({ ...breakTime })),
                        })),
                    };
                }
                return schedule;
            });
            updateSchedules(newSchedules);
            setSelectedDays([]);
            setCopyPopoverOpen(false);
        };
        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            // Remove os segundos de todos os horários antes de enviar
            const formattedData = {
                name: data.name,
                timezone: data.timezone,
                schedules: getSchedulesFromData().map((schedule) => ({
                    ...schedule,
                    shifts: schedule.shifts.map((shift) => ({
                        ...shift,
                        start_time: shift.start_time?.substring(0, 5) || shift.start_time,
                        end_time: shift.end_time?.substring(0, 5) || shift.end_time,
                        breaks: shift.breaks.map((breakTime) => ({
                            start_time: breakTime.start_time?.substring(0, 5) || breakTime.start_time,
                            end_time: breakTime.end_time?.substring(0, 5) || breakTime.end_time,
                        })),
                    })),
                })),
            };
            const isEditing = !!initialShift;
            // If editing, check for affected assets first
            if (isEditing) {
                axios
                    .get(route('asset-hierarchy.shifts.assets', { shift: initialShift.id }))
                    .then((response) => {
                        if (response.data.total > 0) {
                            setAffectedAssets(response.data.assets);
                            setPendingSubmitData(formattedData);
                            setShowConfirmDialog(true);
                        } else {
                            // No assets affected, proceed with update
                            performUpdate(formattedData);
                        }
                    })
                    .catch((error) => {
                        toast.error('Erro ao verificar ativos afetados');
                        console.error(error);
                    });
            } else {
                // Creating new shift, proceed directly
                performCreate(formattedData);
            }
        };
        const performCreate = (formattedData: ShiftFormWithTimezone) => {
            axios
                .post(route('asset-hierarchy.shifts.store'), formattedData, {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                })
                .then((response) => {
                    clearErrors();
                    effectiveSetOpen(false);
                    toast.success('Turno criado com sucesso!');
                    if (onSuccess && response.data.shift) {
                        onSuccess(response.data.shift);
                    }
                })
                .catch((error) => {
                    if (error.response && error.response.data && error.response.data.errors) {
                        // Handle validation errors
                        const validationErrors = error.response.data.errors;
                        // Set form errors so they display below the input fields
                        Object.keys(validationErrors).forEach((key) => {
                             
                            setError(key as keyof ShiftFormWithTimezone, validationErrors[key][0]);
                        });
                        // Also show the first error as a toast
                        const firstErrorKey = Object.keys(validationErrors)[0];
                        toast.error(validationErrors[firstErrorKey][0]);
                    } else {
                        toast.error('Erro ao criar turno', {
                            description: 'Ocorreu um erro. Por favor, verifique os dados e tente novamente.',
                        });
                    }
                });
        };
        const performUpdate = (formattedData: ShiftFormWithTimezone) => {
            axios
                .put(route('asset-hierarchy.shifts.update', { shift: initialShift!.id }), formattedData, {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                })
                .then((response) => {
                    clearErrors();
                    effectiveSetOpen(false);
                    setShowConfirmDialog(false);
                    setPendingSubmitData(null);
                    setAffectedAssets([]);
                    toast.success('Turno atualizado com sucesso!');
                    if (onSuccess && response.data.shift) {
                        onSuccess(response.data.shift);
                    }
                })
                .catch((error) => {
                    if (error.response && error.response.data && error.response.data.errors) {
                        // Handle validation errors
                        const validationErrors = error.response.data.errors;
                        // Set form errors so they display below the input fields
                        Object.keys(validationErrors).forEach((key) => {
                             
                            setError(key as keyof ShiftFormWithTimezone, validationErrors[key][0]);
                        });
                        // Also show the first error as a toast
                        const firstErrorKey = Object.keys(validationErrors)[0];
                        toast.error(validationErrors[firstErrorKey][0]);
                    } else {
                        toast.error('Erro ao atualizar turno', {
                            description: 'Ocorreu um erro. Por favor, verifique os dados e tente novamente.',
                        });
                    }
                });
        };
        const performCopyAndUpdate = (formattedData: ShiftFormWithTimezone) => {
            const dataWithAssets = {
                ...formattedData,
                asset_ids: selectedAssetIds,
            };
            axios
                .post(route('asset-hierarchy.shifts.copy-and-update', { shift: initialShift!.id }), dataWithAssets, {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                })
                .then((response) => {
                    clearErrors();
                    effectiveSetOpen(false);
                    setShowConfirmDialog(false);
                    setPendingSubmitData(null);
                    setAffectedAssets([]);
                    setSelectedAssetIds([]);
                    setUpdateMode('all');
                    toast.success(response.data.message || 'Novo turno criado e ativos atualizados com sucesso!');
                    if (onSuccess && response.data.shift) {
                        onSuccess(response.data.shift);
                    }
                })
                .catch((error) => {
                    if (error.response && error.response.data && error.response.data.errors) {
                        // Handle validation errors
                        const validationErrors = error.response.data.errors;
                        // Set form errors so they display below the input fields
                        Object.keys(validationErrors).forEach((key) => {
                             
                            setError(key as keyof ShiftFormWithTimezone, validationErrors[key][0]);
                        });
                        // Also show the first error as a toast
                        const firstErrorKey = Object.keys(validationErrors)[0];
                        toast.error(validationErrors[firstErrorKey][0]);
                    } else if (error.response && error.response.data && error.response.data.message) {
                        toast.error(error.response.data.message);
                    } else {
                        toast.error('Erro ao criar cópia do turno', {
                            description: 'Ocorreu um erro. Por favor, verifique os dados e tente novamente.',
                        });
                    }
                });
        };
        const handleConfirmUpdate = () => {
            if (pendingSubmitData) {
                if (updateMode === 'all') {
                    performUpdate(pendingSubmitData);
                } else {
                    performCopyAndUpdate(pendingSubmitData);
                }
            }
        };
        const handleCancelUpdate = () => {
            setShowConfirmDialog(false);
            setPendingSubmitData(null);
            setAffectedAssets([]);
            setSelectedAssetIds([]);
            setUpdateMode('all');
        };
        const handleCancel = () => {
            clearErrors();
            effectiveSetOpen(false);
            setSelectedDays([]);
            setCopyPopoverOpen(false);
        };
        return (
            <>
                {showTrigger && (
                    <Button ref={buttonRef} variant={triggerVariant} onClick={() => effectiveSetOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {triggerText}
                    </Button>
                )}
                <Sheet open={effectiveOpen} onOpenChange={effectiveSetOpen}>
                    <SheetContent
                        className="w-full overflow-y-auto sm:max-w-[950px]"
                        onOpenAutoFocus={(e) => {
                            // Prevent default auto-focus behavior
                            e.preventDefault();
                            // Our custom focus logic will handle it
                        }}
                    >
                        <SheetHeader>
                            <SheetTitle>{initialShift ? 'Editar Turno' : 'Cadastrar Turno'}</SheetTitle>
                            <SheetDescription>
                                {initialShift
                                    ? 'Modifique as configurações do turno existente. As alterações afetarão os ativos associados.'
                                    : 'Configure os horários de trabalho e intervalos para cada dia da semana.'}
                            </SheetDescription>
                        </SheetHeader>
                        <form onSubmit={handleSubmit} className="mr-4 ml-4 space-y-4">
                            <div className="grid grid-cols-1 justify-items-start">
                                <div className="w-full space-y-6">
                                    {/* Alert about automatic runtime recording for shift updates */}
                                    {initialShift && (
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Ao atualizar este turno, você será solicitado a confirmar a alteração se houver ativos associados. O
                                                horímetro atual será registrado automaticamente para todos os ativos afetados, preservando o histórico
                                                de operação.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    {/* Campo de nome do turno */}
                                    <div className="w-full space-y-2">
                                        <TextInput
                                            form={{
                                                data: { name: data.name },
                                                setData: handleSetData,
                                                errors,
                                                clearErrors,
                                            }}
                                            name="name"
                                            label="Nome do Turno"
                                            placeholder="Digite o nome do turno"
                                            required
                                            ref={nameInputRef}
                                        />
                                    </div>
                                    {/* Timezone selector */}
                                    <div className="w-full space-y-2">
                                        <Label htmlFor="timezone">Fuso Horário</Label>
                                        <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" aria-expanded={timezoneOpen} className="w-full justify-between">
                                                    { }
                                                    {data.timezone ? getTimezoneLabel(data.timezone) : 'Select timezone...'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Procurar fuso horário..." />
                                                    <CommandList>
                                                        <CommandEmpty>Nenhum fuso horário encontrado.</CommandEmpty>
                                                        {Object.entries(TIMEZONE_GROUPS).map(([region, zones], index) => (
                                                            <React.Fragment key={region}>
                                                                {index > 0 && <CommandSeparator />}
                                                                <CommandGroup heading={region}>
                                                                    {zones.map((zone) => (
                                                                        <CommandItem
                                                                            key={zone.value}
                                                                            value={`${zone.value} ${zone.label}`}
                                                                            onSelect={() => {
                                                                                 
                                                                                setData('timezone' as keyof ShiftFormWithTimezone, zone.value);
                                                                                setTimezoneOpen(false);
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    'mr-2 h-4 w-4',
                                                                                     
                                                                                    data.timezone === zone.value ? 'opacity-100' : 'opacity-0',
                                                                                )}
                                                                            />
                                                                            {zone.label}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </React.Fragment>
                                                        ))}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {errors.timezone && <InputError className="mt-2" message={errors.timezone} />}
                                        <p className="text-muted-foreground text-xs">Os horários do turno serão configurados neste fuso horário</p>
                                    </div>
                                    {/* Seletor de dias da semana */}
                                    <Tabs value={selectedDay} onValueChange={setSelectedDay}>
                                        <TabsList className="grid grid-cols-7 gap-2">
                                            {weekdays.map((day) => (
                                                <TabsTrigger key={day.key} value={day.key} className="px-4">
                                                    {day.label}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        {/* Conteúdo de cada dia da semana */}
                                        {weekdays.map((day, dayIndex) => (
                                            <TabsContent key={day.key} value={day.key} className="!pr-0 !pl-2">
                                                <div className="flex flex-row items-center justify-between pt-6 pb-6">
                                                    <h3 className="text-lg font-semibold">Turnos da {day.label}</h3>
                                                    <div className="flex items-center gap-2">
                                                        {/* Botão para copiar turnos para múltiplos dias */}
                                                        <Popover modal={true} open={copyPopoverOpen} onOpenChange={setCopyPopoverOpen}>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                     
                                                                    disabled={getSchedulesFromData()[dayIndex].shifts.length === 0}
                                                                >
                                                                    <Copy className="mr-2 h-4 w-4" />
                                                                    Copiar para Múltiplos Dias
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-80 p-6" align="end" sideOffset={5}>
                                                                {/* Conteúdo do popover de cópia */}
                                                                <div className="space-y-5">
                                                                    <div className="mt-1 grid grid-cols-2 gap-4">
                                                                        {weekdays
                                                                            .filter((d) => d.key !== day.key)
                                                                            .map((d) => (
                                                                                <div key={d.key} className="flex items-center space-x-1 py-1">
                                                                                    <Checkbox
                                                                                        checked={selectedDays.includes(d.key)}
                                                                                        onCheckedChange={(checked) => {
                                                                                            if (checked) {
                                                                                                setSelectedDays([...selectedDays, d.key]);
                                                                                            } else {
                                                                                                setSelectedDays(
                                                                                                    selectedDays.filter((day) => day !== d.key),
                                                                                                );
                                                                                            }
                                                                                        }}
                                                                                        id={`copy-day-${d.key}`}
                                                                                        className="h-5 w-5"
                                                                                    />
                                                                                    <Label htmlFor={`copy-day-${d.key}`} className="cursor-pointer">
                                                                                        {d.label}
                                                                                    </Label>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                    <div className="pt-3">
                                                                        <Button
                                                                            type="button"
                                                                            onClick={applyToSelectedDays}
                                                                            size="sm"
                                                                            disabled={selectedDays.length === 0}
                                                                            className="w-full"
                                                                        >
                                                                            Aplicar
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                        {/* Botão para adicionar novo turno */}
                                                        <Button type="button" variant="outline" size="sm" onClick={() => addShift(dayIndex)}>
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Adicionar Turno
                                                        </Button>
                                                    </div>
                                                </div>
                                                {/* Lista de turnos do dia */}
                                                { }
                                                {(getSchedulesFromData()[dayIndex].shifts.length === 0) ? (
                                                    <div className="bg-muted/50 rounded-lg border p-6 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
                                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                                            <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-full">
                                                                <Clock className="text-muted-foreground size-6" />
                                                            </div>
                                                            <h3 className="mb-1 text-lg font-medium">Nenhum turno adicionado</h3>
                                                            <p className="text-muted-foreground mb-4 text-sm">
                                                                Adicione turnos para este dia da semana.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                     
                                                    getSchedulesFromData()[dayIndex].shifts.map((shift, shiftIndex) => {
                                                         
                                                        const overlappingShifts = findOverlappingShifts(getSchedulesFromData()[dayIndex].shifts, shiftIndex);
                                                        return (
                                                            <Card
                                                                key={`shift-${dayIndex}-${shiftIndex}-${shift.start_time}-${shift.end_time}`}
                                                                className="bg-muted/50 mb-4 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                                                            >
                                                                <CardHeader className="flex flex-col space-y-2">
                                                                    <div className="flex items-center">
                                                                        <Label className="text-md font-semibold">Turno {shiftIndex + 1}</Label>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <div className="flex items-center space-x-2">
                                                                            {/* Seletor de horário de início */}
                                                                            <TimeSelect
                                                                                value={shift.start_time}
                                                                                onChange={(value: string) => {
                                                                                     
                                                                                    const newSchedules = [...getSchedulesFromData()];
                                                                                    newSchedules[dayIndex].shifts[shiftIndex].start_time = value;
                                                                                    updateSchedules(newSchedules);
                                                                                }}
                                                                            />
                                                                            <span className="text-muted-foreground">até</span>
                                                                            {/* Seletor de horário de término */}
                                                                            <TimeSelect
                                                                                value={shift.end_time}
                                                                                onChange={(value: string) => {
                                                                                     
                                                                                    const newSchedules = [...getSchedulesFromData()];
                                                                                    newSchedules[dayIndex].shifts[shiftIndex].end_time = value;
                                                                                    updateSchedules(newSchedules);
                                                                                }}
                                                                            />
                                                                            {/* Botão para remover turno */}
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => removeShift(dayIndex, shiftIndex)}
                                                                                className="h-10 w-10"
                                                                            >
                                                                                <Trash2 className="text-destructive h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                        {overlappingShifts.length > 0 && (
                                                                            <Alert
                                                                                variant="destructive"
                                                                                className="ml-2 flex items-center gap-2 border-0 py-2"
                                                                            >
                                                                                <AlertCircle className="mb-1 h-4 w-4" />
                                                                                <AlertDescription className="text-sm">
                                                                                    Este turno está sobrepondo com{' '}
                                                                                    {overlappingShifts.length === 1 ? 'o turno' : 'os turnos'}{' '}
                                                                                    {overlappingShifts.map((i) => i + 1).join(', ')}
                                                                                </AlertDescription>
                                                                            </Alert>
                                                                        )}
                                                                    </div>
                                                                </CardHeader>
                                                                <CardContent className="-mt-2 space-y-2">
                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        {/* Seção de intervalos */}
                                                                        <div className="space-y-0.5 pl-4">
                                                                            <div className="mb-2 flex items-center justify-between">
                                                                                <Label className="ml-2 pt-2 text-base font-medium">Intervalos</Label>
                                                                                {/* Botão para adicionar intervalo */}
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => addBreak(dayIndex, shiftIndex)}
                                                                                >
                                                                                    <Plus className="mr-2 h-4 w-4" />
                                                                                    Adicionar Intervalo
                                                                                </Button>
                                                                            </div>
                                                                            {shift.breaks.length === 0 ? (
                                                                                <Card className="bg-background shadow-none">
                                                                                    <CardContent className="-mt-3 -mb-3 ml-2 flex items-start space-x-2 px-2 py-0">
                                                                                        <div className="bg-muted -mt-0.75 flex size-8 items-center justify-center rounded-full">
                                                                                            <Clock className="text-muted-foreground size-4" />
                                                                                        </div>
                                                                                        <div className="flex flex-col py-0.5">
                                                                                            <h3 className="text-base font-medium">
                                                                                                Nenhum intervalo adicionado
                                                                                            </h3>
                                                                                            <p className="text-muted-foreground text-sm">
                                                                                                Adicione intervalos para este turno.
                                                                                            </p>
                                                                                        </div>
                                                                                    </CardContent>
                                                                                </Card>
                                                                            ) : (
                                                                                <div className="space-y-2">
                                                                                    {/* Lista de intervalos */}
                                                                                    { }
                                                                                    {shift.breaks.map((breakTime, breakIndex) => {
                                                                                        const isValidInShift = isBreakValid(shift, breakTime);
                                                                                        const isOverlapping =
                                                                                            isValidInShift &&
                                                                                            isBreakOverlapping(shift, breakTime, breakIndex);
                                                                                        return (
                                                                                            <Card
                                                                                                key={`break-${dayIndex}-${shiftIndex}-${breakIndex}-${breakTime.start_time}-${breakTime.end_time}`}
                                                                                                className="bg-background shadow-none"
                                                                                            >
                                                                                                <CardContent className="-mt-3 -mb-3 ml-1 flex items-center space-x-2 px-2">
                                                                                                    <div className="flex items-center space-x-2">
                                                                                                        {/* Seletor de horário de início do intervalo */}
                                                                                                        <TimeSelect
                                                                                                            value={breakTime.start_time}
                                                                                                            onChange={(value: string) =>
                                                                                                                updateBreak(
                                                                                                                    dayIndex,
                                                                                                                    shiftIndex,
                                                                                                                    breakIndex,
                                                                                                                    'start_time',
                                                                                                                    value,
                                                                                                                )
                                                                                                            }
                                                                                                        />
                                                                                                        <span className="text-muted-foreground">
                                                                                                            até
                                                                                                        </span>
                                                                                                        {/* Seletor de horário de término do intervalo */}
                                                                                                        <TimeSelect
                                                                                                            value={breakTime.end_time}
                                                                                                            onChange={(value: string) =>
                                                                                                                updateBreak(
                                                                                                                    dayIndex,
                                                                                                                    shiftIndex,
                                                                                                                    breakIndex,
                                                                                                                    'end_time',
                                                                                                                    value,
                                                                                                                )
                                                                                                            }
                                                                                                        />
                                                                                                        {/* Botão para remover intervalo */}
                                                                                                        <Button
                                                                                                            type="button"
                                                                                                            variant="ghost"
                                                                                                            size="icon"
                                                                                                            className="h-10 w-10"
                                                                                                            onClick={() =>
                                                                                                                removeBreak(
                                                                                                                    dayIndex,
                                                                                                                    shiftIndex,
                                                                                                                    breakIndex,
                                                                                                                )
                                                                                                            }
                                                                                                        >
                                                                                                            <Trash2 className="text-destructive h-4 w-4" />
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                    {!isValidInShift && (
                                                                                                        <Alert
                                                                                                            variant="destructive"
                                                                                                            className="ml-2 flex items-center gap-2 border-0 py-2"
                                                                                                        >
                                                                                                            <AlertCircle className="mb-1 h-4 w-4" />
                                                                                                            <AlertDescription className="text-sm">
                                                                                                                O intervalo deve estar dentro do
                                                                                                                horário do turno
                                                                                                            </AlertDescription>
                                                                                                        </Alert>
                                                                                                    )}
                                                                                                    {isOverlapping && (
                                                                                                        <Alert
                                                                                                            variant="destructive"
                                                                                                            className="ml-2 flex items-center gap-2 border-0 py-2"
                                                                                                        >
                                                                                                            <AlertCircle className="mb-1 h-4 w-4" />
                                                                                                            <AlertDescription className="text-sm">
                                                                                                                Este intervalo está sobrepondo com
                                                                                                                outro intervalo do turno
                                                                                                            </AlertDescription>
                                                                                                        </Alert>
                                                                                                    )}
                                                                                                </CardContent>
                                                                                            </Card>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        );
                                                    })
                                                )}
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                    {/* Seção de visualização */}
                                    <div className="space-y-4">
                                        {/* Seletor de modo de visualização */}
                                        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'timeline' | 'table')}>
                                            <TabsList className="grid w-[200px] grid-cols-2">
                                                <TabsTrigger value="timeline" className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4" />
                                                    Timeline
                                                </TabsTrigger>
                                                <TabsTrigger value="table" className="flex items-center gap-2">
                                                    <Table className="h-4 w-4" />
                                                    Tabela
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                        {/* Visualização dos turnos */}
                                        <div className="relative">
                                            {/* Visualização em timeline */}
                                            <div
                                                className={`transition-opacity duration-300 ${viewMode === 'timeline' ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'}`}
                                            >
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Visualização dos Turnos</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        { }
                                                        <ShiftCalendarView schedules={getSchedulesFromData()} />
                                                    </CardContent>
                                                </Card>
                                            </div>
                                            {/* Visualização em tabela */}
                                            <div
                                                className={`transition-opacity duration-300 ${viewMode === 'table' ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'}`}
                                            >
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Visão Geral Semanal</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        { }
                                                        <ShiftTableView schedules={getSchedulesFromData()} />
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <Button type="button" variant="outline" onClick={handleCancel} disabled={processing}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? (initialShift ? 'Atualizando...' : 'Criando...') : 'Salvar'}
                                </Button>
                            </div>
                        </form>
                    </SheetContent>
                </Sheet>
                {/* Confirmation Dialog for Affected Assets */}
                <ShiftUpdateConfirmationDialog
                    open={showConfirmDialog}
                    onOpenChange={setShowConfirmDialog}
                    affectedAssets={affectedAssets}
                    updateMode={updateMode}
                    onUpdateModeChange={setUpdateMode}
                    selectedAssetIds={selectedAssetIds}
                    onSelectedAssetsChange={setSelectedAssetIds}
                    onConfirm={handleConfirmUpdate}
                    onCancel={handleCancelUpdate}
                    processing={processing}
                    currentAssetId={currentAssetId}
                />
            </>
        );

    },
);
CreateShiftSheet.displayName = 'CreateShiftSheet';
export default CreateShiftSheet;
