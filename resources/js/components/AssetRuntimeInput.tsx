import { Clock, Activity, Calendar } from 'lucide-react';
import ReportRuntimeSheet from '@/components/ReportRuntimeSheet';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';

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
    onRuntimeUpdated?: (data: any) => void;
}

export default function AssetRuntimeInput({ assetId, runtimeData, onRuntimeUpdated }: AssetRuntimeInputProps) {
    const reportSheetRef = useRef<HTMLButtonElement>(null);

    const formatLastMeasurement = (datetime: string, userTimezone?: string) => {
        try {
            const date = new Date(datetime);
            const options: Intl.DateTimeFormatOptions = {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: userTimezone || 'UTC'
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
        <div className="space-y-4 h-full">
            <div className="rounded-lg border border-gray-200 p-6 h-full flex flex-col">
                {/* Header with title and report button */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Runtime do Ativo</h3>
                    <Button onClick={handleReportClick} size="sm" variant="action">
                        <Clock className="mr-2 h-4 w-4" />
                        Reportar Horimetro
                    </Button>
                </div>

                {/* Current Runtime - More compact */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Horímetro Calculado</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {currentHours.toFixed(1)} horas
                    </p>
                </div>

                {/* Last Measurement - More compact */}
                {lastMeasurement ? (
                    <div className="">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm leading-none font-medium ">Última Medição</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm mt-2">
                            <span>{lastMeasurement.hours.toFixed(1)}h</span>
                            <span>em {formatLastMeasurement(lastMeasurement.datetime, userTimezone)}</span>
                            <span>{lastMeasurement.user_name ? `por ${lastMeasurement.user_name}` : ''}</span>
                        </div>
                        {lastMeasurement.source === 'shift_change' && (
                            <p className="text-xs text-gray-500 mt-1">
                                Registrado automaticamente devido à mudança de turno
                            </p>
                        )}
                        {lastMeasurement.source === 'shift_update' && (
                            <p className="text-xs text-gray-500 mt-1">
                                Registrado automaticamente devido à atualização do turno
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-500 text-center">
                            Nenhuma medição registrada
                        </p>
                    </div>
                )}

                {/* Hidden ReportRuntimeSheet for programmatic triggering */}
                <div style={{ display: 'none' }}>
                    <ReportRuntimeSheet
                        ref={reportSheetRef}
                        assetId={assetId}
                        currentRuntime={currentHours}
                        showTrigger
                        onSuccess={onRuntimeUpdated}
                    />
                </div>
            </div>
        </div>
    );
} 