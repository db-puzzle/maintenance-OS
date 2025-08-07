import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
export interface TimelineEvent {
    id?: string | number;
    description: string;
    timestamp: string;
    user?: string;
}
interface TimelineProps {
    events: TimelineEvent[];
    title?: string;
    subtitle?: string;
    showOrderToggle?: boolean;
    defaultOrder?: 'chronological' | 'reverse';
    formatDate?: (dateString: string) => string;
    className?: string;
}
export const Timeline: React.FC<TimelineProps> = ({
    events,
    title = 'Timeline',
    subtitle = 'History of events',
    showOrderToggle = true,
    defaultOrder = 'chronological',
    formatDate = (dateString) => new Date(dateString).toLocaleString(),
    className = '',
}) => {
    const [timelineOrder, setTimelineOrder] = useState<'chronological' | 'reverse'>(defaultOrder);
    const orderedEvents = timelineOrder === 'chronological' ? events : [...events].reverse();
    return (
        <div className={`py-8 ${className}`}>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-muted-foreground text-sm">{subtitle}</p>
                </div>
                {showOrderToggle && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTimelineOrder(timelineOrder === 'chronological' ? 'reverse' : 'chronological')}
                        className="flex items-center gap-2"
                    >
                        <ArrowUpDown className="h-4 w-4" />
                        {timelineOrder === 'chronological' ? 'Oldest First' : 'Newest First'}
                    </Button>
                )}
            </div>
            <div className="space-y-4">
                {orderedEvents.map((event, index, array) => (
                    <div key={event.id || index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                            {timelineOrder === 'reverse' && index > 0 && <div className="bg-border -mt-12 h-12 w-0.5" />}
                            <div className="bg-primary h-3 w-3 rounded-full" />
                            {timelineOrder === 'chronological' && index < array.length - 1 && <div className="bg-border h-12 w-0.5" />}
                        </div>
                        <div className="flex-1 pb-4">
                            <p className="font-medium">{event.description}</p>
                            <p className="text-muted-foreground text-sm">
                                {formatDate(event.timestamp)}
                                {event.user && ` • ${event.user}`}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default Timeline; 