import React, { forwardRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TimeSelect from '@/components/TimeSelect';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ReportRuntimeSheetProps {
    assetId?: number;
    currentRuntime: number;
    showTrigger?: boolean;
    onSuccess?: (data: any) => void;
}

const ReportRuntimeSheet = forwardRef<HTMLButtonElement, ReportRuntimeSheetProps>(
    ({ assetId, currentRuntime, showTrigger = false, onSuccess }, ref) => {
        const [isOpen, setIsOpen] = useState(false);
        const [reportedHours, setReportedHours] = useState(currentRuntime.toString());
        const [notes, setNotes] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [error, setError] = useState<string | null>(null);

        // Initialize with current date and time
        const [measurementDate, setMeasurementDate] = useState<Date>(new Date());
        const [measurementTime, setMeasurementTime] = useState(
            format(new Date(), 'HH:mm')
        );
        const [calendarOpen, setCalendarOpen] = useState(false);

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();

            if (!assetId) {
                setError('ID do ativo não encontrado');
                return;
            }

            const reportedHoursValue = parseFloat(reportedHours);

            if (isNaN(reportedHoursValue) || reportedHoursValue < 0) {
                setError('Por favor, insira um valor válido de horas');
                return;
            }

            setIsSubmitting(true);
            setError(null);

            try {
                // Combine date and time into a single datetime
                const [timeHours, timeMinutes] = measurementTime.split(':').map(Number);
                const measurementDateTime = new Date(measurementDate);
                measurementDateTime.setHours(timeHours, timeMinutes, 0, 0);

                const response = await axios.post(`/asset-hierarchy/assets/${assetId}/runtime`, {
                    reported_hours: reportedHoursValue,
                    notes: notes || null,
                    measurement_datetime: measurementDateTime.toISOString()
                });

                if (response.data.success) {
                    setIsOpen(false);
                    setNotes('');

                    if (onSuccess) {
                        onSuccess(response.data.runtime_data);
                    }

                    // Refresh the page data
                    router.reload();
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Erro ao reportar horímetro');
            } finally {
                setIsSubmitting(false);
            }
        };

        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                {showTrigger && (
                    <SheetTrigger asChild>
                        <Button ref={ref} size="sm" variant="outline">
                            <Clock className="mr-2 h-4 w-4" />
                            Reportar Horímetro
                        </Button>
                    </SheetTrigger>
                )}
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Reportar Horímetro</SheetTitle>
                        <SheetDescription>
                            Insira o valor atual do horímetro do ativo
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                        <div className="space-y-2">
                            <Label htmlFor="current-hours">Horímetro Atual</Label>
                            <div className="text-sm text-muted-foreground">
                                {currentRuntime.toFixed(1)} horas
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reported-hours">Novo Horímetro</Label>
                            <Input
                                id="reported-hours"
                                type="number"
                                step="0.1"
                                value={reportedHours}
                                onChange={(e) => setReportedHours(e.target.value)}
                                placeholder="Ex: 1234.5"
                                required
                            />
                        </div>

                        {/* Date Selection */}
                        <div className="space-y-2">
                            <Label>Data da Medição</Label>
                            <Popover modal={true} open={calendarOpen} onOpenChange={setCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !measurementDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {measurementDate ? format(measurementDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 z-[100]">
                                    <Calendar
                                        mode="single"
                                        selected={measurementDate}
                                        onSelect={(date) => {
                                            if (date) {
                                                setMeasurementDate(date);
                                                setCalendarOpen(false);
                                            }
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Time Selection */}
                        <div className="space-y-2">
                            <TimeSelect
                                label="Hora da Medição"
                                value={measurementTime}
                                onChange={setMeasurementTime}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Observações (opcional)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Adicione observações sobre esta medição..."
                                rows={3}
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                {isSubmitting ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        );
    }
);

ReportRuntimeSheet.displayName = 'ReportRuntimeSheet';

export default ReportRuntimeSheet; 