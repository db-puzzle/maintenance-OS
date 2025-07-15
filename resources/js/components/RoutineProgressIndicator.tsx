import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar } from 'lucide-react';

interface Routine {
    id: number;
    name: string;
    trigger_type: 'runtime_hours' | 'calendar_days';
    trigger_runtime_hours?: number;
    trigger_calendar_days?: number;
    execution_mode: 'automatic' | 'manual';
    last_execution_runtime_hours?: number;
    last_execution_completed_at?: string;
    progress_percentage?: number;
    estimated_hours_until_due?: number;
    next_due_date?: string;
    asset?: {
        current_runtime_hours?: number;
    };
}

interface RoutineProgressIndicatorProps {
    routine: Routine;
}

export const RoutineProgressIndicator: React.FC<RoutineProgressIndicatorProps> = ({ routine }) => {
    // Calculate progress based on trigger type
    const calculateProgress = (): { progress: number; nextDue: string; isOverdue: boolean } => {
        if (routine.trigger_type === 'runtime_hours') {
            if (!routine.last_execution_runtime_hours || !routine.trigger_runtime_hours || !routine.asset?.current_runtime_hours) {
                return { progress: 0, nextDue: 'Não calculado', isOverdue: false };
            }

            const currentRuntime = routine.asset.current_runtime_hours;
            const lastExecution = routine.last_execution_runtime_hours;
            const triggerHours = routine.trigger_runtime_hours;

            const hoursSinceLastExecution = currentRuntime - lastExecution;
            const progress = Math.min((hoursSinceLastExecution / triggerHours) * 100, 100);
            const hoursRemaining = Math.max(0, triggerHours - hoursSinceLastExecution);

            const isOverdue = progress >= 100;
            const nextDue = isOverdue ? 'Vencido' : `~${Math.ceil(hoursRemaining)}h`;

            return { progress: Math.round(progress), nextDue, isOverdue };
        } else {
            // Calendar days
            if (!routine.last_execution_completed_at || !routine.trigger_calendar_days) {
                return { progress: 0, nextDue: 'Não calculado', isOverdue: false };
            }

            const lastExecution = new Date(routine.last_execution_completed_at);
            const now = new Date();
            const triggerDays = routine.trigger_calendar_days;

            const daysSinceLastExecution = Math.floor((now.getTime() - lastExecution.getTime()) / (1000 * 60 * 60 * 24));
            const progress = Math.min((daysSinceLastExecution / triggerDays) * 100, 100);

            const nextDueDate = new Date(lastExecution);
            nextDueDate.setDate(nextDueDate.getDate() + triggerDays);

            const isOverdue = progress >= 100;
            const nextDue = isOverdue ? 'Vencido' : nextDueDate.toLocaleDateString('pt-BR');

            return { progress: Math.round(progress), nextDue, isOverdue };
        }
    };

    const { progress, nextDue, isOverdue } = calculateProgress();

    // Determine progress bar color
    const getProgressColor = (progress: number): string => {
        if (progress < 70) return 'bg-green-500';
        if (progress < 90) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const progressColor = getProgressColor(progress);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                    {routine.trigger_type === 'runtime_hours' ? (
                        <Clock className="h-3 w-3" />
                    ) : (
                        <Calendar className="h-3 w-3" />
                    )}
                    <span>{progress}%</span>
                </div>
                <div className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                    {nextDue}
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all ${progressColor}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
            {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                    Manutenção Vencida
                </Badge>
            )}
        </div>
    );
};

export default RoutineProgressIndicator; 