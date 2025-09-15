import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useScheduler } from '@/hooks/production/useScheduler';
import { format } from 'date-fns';
import { Factory, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ResourcePanel() {
    const scheduler = useScheduler();

    const getUtilizationPercentage = (workCellId: number): number => {
        const schedules = scheduler.getSchedulesForWorkCell(workCellId);
        if (schedules.length === 0) return 0;

        const startDate = new Date(scheduler.dateRange.start);
        const endDate = new Date(scheduler.dateRange.end);
        const totalAvailableMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);

        const scheduledMinutes = schedules.reduce((total, schedule) => {
            const start = new Date(schedule.scheduled_start);
            const end = new Date(schedule.scheduled_end);
            return total + (end.getTime() - start.getTime()) / (1000 * 60);
        }, 0);

        return Math.min(100, (scheduledMinutes / totalAvailableMinutes) * 100);
    };

    const getNextAvailableSlot = (workCellId: number): Date | null => {
        const schedules = scheduler.getSchedulesForWorkCell(workCellId)
            .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

        const now = new Date();
        let nextSlot = now;

        for (const schedule of schedules) {
            const scheduleStart = new Date(schedule.scheduled_start);
            const scheduleEnd = new Date(schedule.scheduled_end);

            if (scheduleStart > nextSlot) {
                return nextSlot;
            }

            nextSlot = new Date(Math.max(nextSlot.getTime(), scheduleEnd.getTime()));
        }

        return nextSlot;
    };

    const getUnavailablePeriods = (workCellId: number) => {
        // This would normally come from the scheduler service
        // For now, return mock data
        return [
            {
                start: new Date(),
                end: new Date(Date.now() + 2 * 60 * 60 * 1000),
                type: 'maintenance',
                reason: 'Scheduled maintenance',
            },
        ];
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center px-4 py-2 border-b bg-muted/50">
                <h3 className="font-medium text-sm">Work Cell Resources</h3>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {scheduler.workCells.map((workCell) => {
                        const utilization = getUtilizationPercentage(workCell.id);
                        const nextSlot = getNextAvailableSlot(workCell.id);
                        const unavailablePeriods = getUnavailablePeriods(workCell.id);
                        const schedules = scheduler.getSchedulesForWorkCell(workCell.id);

                        return (
                            <div
                                key={workCell.id}
                                className="border rounded-lg p-4 space-y-3"
                            >
                                {/* Work Cell Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Factory className="h-4 w-4 text-muted-foreground" />
                                        <h4 className="font-medium">{workCell.name}</h4>
                                        {workCell.cell_type === 'external' && (
                                            <Badge variant="outline" className="text-xs">
                                                External
                                            </Badge>
                                        )}
                                    </div>
                                    <Badge
                                        variant={utilization > 80 ? 'destructive' : utilization > 60 ? 'secondary' : 'outline'}
                                        className="text-xs"
                                    >
                                        {utilization.toFixed(0)}% Utilized
                                    </Badge>
                                </div>

                                {/* Utilization Bar */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Capacity Utilization</span>
                                        <span>{schedules.length} scheduled tasks</span>
                                    </div>
                                    <Progress value={utilization} className="h-2" />
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Location:</span>
                                        <div className="font-medium">
                                            {workCell.plant?.name || 'Not assigned'}
                                            {workCell.area && ` / ${workCell.area.name}`}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Shift:</span>
                                        <div className="font-medium">
                                            {workCell.shift?.name || 'Standard'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Available Hours:</span>
                                        <div className="font-medium">
                                            {workCell.available_hours_per_day || 8} hours/day
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Efficiency:</span>
                                        <div className="font-medium">
                                            {workCell.efficiency_percentage || 85}%
                                        </div>
                                    </div>
                                </div>

                                {/* Next Available Slot */}
                                {nextSlot && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-muted-foreground">Next available:</span>
                                        <span className="font-medium">
                                            {format(nextSlot, 'MMM dd, HH:mm')}
                                        </span>
                                    </div>
                                )}

                                {/* Unavailable Periods */}
                                {unavailablePeriods.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span>Upcoming unavailable periods:</span>
                                        </div>
                                        {unavailablePeriods.slice(0, 2).map((period, index) => (
                                            <div
                                                key={index}
                                                className="text-xs bg-muted rounded px-2 py-1"
                                            >
                                                {format(period.start, 'MMM dd HH:mm')} - 
                                                {format(period.end, 'HH:mm')} ({period.reason})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}