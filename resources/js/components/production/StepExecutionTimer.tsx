import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
interface StepExecutionTimerProps {
    startTime: Date | string;
    isPaused?: boolean;
    className?: string;
}
export function StepExecutionTimer({ startTime, isPaused = false, className }: StepExecutionTimerProps) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (isPaused) return;
        const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
        const updateElapsed = () => {
            const now = new Date();
            const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
            setElapsed(diff);
        };
        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [startTime, isPaused]);
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || hours > 0) parts.push(`${minutes}min`);
        parts.push(`${secs}s`);
        return parts.join(' ');
    };
    return (
        <div className={cn('text-4xl font-mono font-bold tabular-nums', className)}>
            {formatTime(elapsed)}
        </div>
    );
} 