import ReportRuntimeSheet from '@/components/ReportRuntimeSheet';
import { Button } from '@/components/ui/button';
import { Gauge, Clock } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
interface RuntimeData {
    current_hours: number;
    last_measurement?: {
        hours: number;
        datetime: string;
        user_name?: string;
        source?: string;
    };
    user_timezone?: string;
}
interface AssetRuntimeInputProps {
    assetId?: number;
    runtimeData?: RuntimeData;
    onRuntimeUpdated?: (data: RuntimeData) => void;
}
export default function AssetRuntimeInput({ assetId, runtimeData: initialRuntimeData, onRuntimeUpdated }: AssetRuntimeInputProps) {
    const reportSheetRef = useRef<HTMLButtonElement>(null);
    const [runtimeData, setRuntimeData] = useState<RuntimeData | undefined>(initialRuntimeData);
    // Update runtime data when initialRuntimeData changes
    useEffect(() => {
        setRuntimeData(initialRuntimeData);
    }, [initialRuntimeData]);
    const formatLastMeasurement = (datetime: string, userTimezone?: string) => {
        try {
            const date = new Date(datetime);
            const options: Intl.DateTimeFormatOptions = {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: userTimezone || 'UTC',
            };
            return date.toLocaleDateString('pt-BR', options);
        } catch {
            return datetime;
        }
    };
    const handleReportClick = () => {
        reportSheetRef.current?.click();
    };
    const currentHours = runtimeData?.current_hours || 0;
    const lastMeasurement = runtimeData?.last_measurement;
    const userTimezone = runtimeData?.user_timezone;
    return (
        <div className="h-full space-y-4">
            <div className="flex h-full flex-col rounded-lg border border-gray-200 p-6">
                {/* Header with title and report button */}
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Runtime do Ativo</h3>
                    <Button onClick={handleReportClick} size="sm" variant="action">
                        <Clock className="mr-2 h-4 w-4" />
                        Reportar Horimetro
                    </Button>
                </div>
                {/* Current Runtime - More compact */}
                <div className="mb-4">
                    <div className="mb-1 flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Horímetro Calculado</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{currentHours.toFixed(1)} horas</p>
                </div>
                {/* Last Measurement - More compact */}
                {lastMeasurement ? (
                    <div className="">
                        <div className="mb-1 flex items-center gap-2">
                            <span className="text-sm leading-none font-medium">Última Medição</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-sm">
                            <span>{lastMeasurement.hours.toFixed(1)}h</span>
                            <span>em {formatLastMeasurement(lastMeasurement.datetime, userTimezone)}</span>
                            <span>{lastMeasurement.user_name ? `por ${lastMeasurement.user_name}` : ''}</span>
                        </div>
                        {lastMeasurement.source === 'shift_change' && (
                            <p className="mt-1 text-xs text-gray-500">Registrado automaticamente devido à mudança de turno</p>
                        )}
                        {lastMeasurement.source === 'shift_update' && (
                            <p className="mt-1 text-xs text-gray-500">Registrado automaticamente devido à atualização do turno</p>
                        )}
                    </div>
                ) : (
                    <div className="rounded-md bg-gray-50 p-3">
                        <p className="text-center text-xs text-gray-500">Nenhuma medição registrada</p>
                    </div>
                )}
                {/* Hidden ReportRuntimeSheet for programmatic triggering */}
                <div style={{ display: 'none' }}>
                    <ReportRuntimeSheet
                        ref={reportSheetRef}
                        assetId={assetId}
                        currentRuntime={currentHours}
                        showTrigger
                        onSuccess={(data) => {
                            // Update local state
                            setRuntimeData(data);
                            // Call parent callback
                            if (onRuntimeUpdated) {
                                onRuntimeUpdated(data);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
