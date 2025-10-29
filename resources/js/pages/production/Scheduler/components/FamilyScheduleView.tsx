import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    ChevronDown,
    ChevronRight,
    Users,
    Clock,
    Calendar,
    Lock,
    AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface FamilyScheduleViewProps {
    family: {
        top_parent: string;
        priority: number;
        orders: Array<{
            order_number: string;
            schedules: Array<{
                id: number;
                step_name: string;
                work_cell: string;
                scheduled_start: string;
                scheduled_end: string;
                is_locked: boolean;
                conflicts: Array<{ id: string; description: string }>;
            }>;
        }>;
        metrics: {
            start_date: string;
            end_date: string;
            total_duration: number;
            utilization: number;
        };
    };
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
}

export default function FamilyScheduleView({
    family,
    index,
    isExpanded,
    onToggle
}: FamilyScheduleViewProps) {
    const getFamilyColor = (index: number) => {
        const colors = [
            'border-blue-300 bg-blue-50',
            'border-green-300 bg-green-50',
            'border-purple-300 bg-purple-50',
            'border-yellow-300 bg-yellow-50',
            'border-pink-300 bg-pink-50',
            'border-indigo-300 bg-indigo-50',
        ];
        return colors[index % colors.length];
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const totalSteps = family.orders.reduce((sum, order) => sum + order.schedules.length, 0);
    const lockedSteps = family.orders.reduce((sum, order) =>
        sum + order.schedules.filter(s => s.is_locked).length, 0
    );
    const hasConflicts = family.orders.some(order =>
        order.schedules.some(s => s.conflicts && s.conflicts.length > 0)
    );

    return (
        <Card className={`border-2 ${getFamilyColor(index)}`}>
            <CardContent className="p-4">
                {/* Family Header */}
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={onToggle}
                >
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="p-1">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                        <Users className="w-5 h-5" />
                        <div>
                            <h3 className="font-semibold text-lg">{family.top_parent}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{family.orders.length} orders</span>
                                <span>{totalSteps} steps</span>
                                <Badge variant="outline">Priority: {family.priority}</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm text-gray-600">Duration</div>
                            <div className="font-medium">{formatDuration(family.metrics.total_duration)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-600">Utilization</div>
                            <Progress value={family.metrics.utilization} className="w-20 h-2 mt-1" />
                        </div>
                        {lockedSteps > 0 && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                {lockedSteps} locked
                            </Badge>
                        )}
                        {hasConflicts && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Conflicts
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Family Timeline Summary */}
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                            {format(new Date(family.metrics.start_date), 'MMM d, yyyy HH:mm')}
                        </span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                            {format(new Date(family.metrics.end_date), 'MMM d, yyyy HH:mm')}
                        </span>
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="mt-4 space-y-3">
                        {family.orders.map(order => (
                            <div key={order.order_number} className="bg-white rounded-lg p-3 border">
                                <h4 className="font-medium mb-2">{order.order_number}</h4>
                                <div className="space-y-2">
                                    {order.schedules.map(schedule => (
                                        <div
                                            key={schedule.id}
                                            className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                {schedule.is_locked && <Lock className="w-3 h-3 text-gray-500" />}
                                                <span className="font-medium">{schedule.step_name}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {schedule.work_cell}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span>
                                                    {format(new Date(schedule.scheduled_start), 'MMM d HH:mm')}
                                                </span>
                                                <span>-</span>
                                                <span>
                                                    {format(new Date(schedule.scheduled_end), 'HH:mm')}
                                                </span>
                                                {schedule.conflicts && schedule.conflicts.length > 0 && (
                                                    <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
