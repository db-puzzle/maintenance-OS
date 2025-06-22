import TextInput from '@/components/TextInput';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2 } from 'lucide-react';
import type { RoutineExecution } from '@/types/maintenance';

interface RoutineExecutionFormData {
    routine_name: string;
    executor_name: string;
    started_at: string;
    completed_at: string;
    duration: string;
    notes: string;
    [key: string]: string | number | boolean | null | undefined;
}

interface RoutineExecutionFormComponentProps {
    execution: RoutineExecution;
    canExport?: boolean;
    onExport?: () => void;
    isExporting?: boolean;
    exportError?: string | null;
}

export default function RoutineExecutionFormComponent({
    execution,
    canExport = false,
    onExport,
    isExporting = false,
    exportError
}: RoutineExecutionFormComponentProps) {
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    // Create form data for TextInput compatibility
    const data: RoutineExecutionFormData = {
        routine_name: execution.routine.name,
        executor_name: execution.executor.name,
        started_at: formatDate(execution.started_at),
        completed_at: formatDate(execution.completed_at),
        duration: execution.duration_minutes ? `${execution.duration_minutes} minutes` : 'In Progress',
        notes: execution.notes || '',
    };

    // Dummy form object for TextInput compatibility in view mode
    const form = {
        data,
        setData: () => { },
        errors: {},
        clearErrors: () => { },
    };

    return (
        <div className="space-y-6">
            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Routine Name */}
                <TextInput
                    form={form}
                    name="routine_name"
                    label="Rotina"
                    placeholder="Nome da rotina"
                    view={true}
                />

                {/* Executor */}
                <TextInput
                    form={form}
                    name="executor_name"
                    label="Executor"
                    placeholder="Executor não informado"
                    view={true}
                />

                {/* Started At */}
                <TextInput
                    form={form}
                    name="started_at"
                    label="Iniciado em"
                    placeholder="Data de início não informada"
                    view={true}
                />

                {/* Completed At */}
                <TextInput
                    form={form}
                    name="completed_at"
                    label="Finalizado em"
                    placeholder="Data de finalização não informada"
                    view={true}
                />

                {/* Notes */}
                {execution.notes && (
                    <div className="md:col-span-2">
                        <TextInput
                            form={form}
                            name="notes"
                            label="Observações"
                            placeholder="Sem observações"
                            view={true}
                        />
                    </div>
                )}
            </div>

            {/* Export Button */}
            {canExport && onExport && (
                <div className="flex justify-end gap-2">
                    <Button onClick={onExport} disabled={isExporting}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? 'Exportando...' : 'Exportar PDF'}
                    </Button>
                    {exportError && <p className="self-center text-sm text-red-600">{exportError}</p>}
                </div>
            )}
        </div>
    );
} 