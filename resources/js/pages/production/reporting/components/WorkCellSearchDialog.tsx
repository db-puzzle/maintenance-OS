import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Factory, Users, BarChart3, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkCell } from '@/types/production';

interface WorkCellSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workCells: WorkCell[];
    selectedWorkCellId?: string;
    onSelectWorkCell: (workCellId: string | undefined) => void;
}

export function WorkCellSearchDialog({
    open,
    onOpenChange,
    workCells,
    selectedWorkCellId,
    onSelectWorkCell,
}: WorkCellSearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | undefined>(selectedWorkCellId);

    // Reset selected ID when dialog opens with a new selection
    useEffect(() => {
        if (open) {
            setSelectedId(selectedWorkCellId);
        }
    }, [open, selectedWorkCellId]);

    // Add "All Work Cells" option to the list
    const enrichedWorkCells = useMemo(() => {
        const allOption = {
            id: 'all',
            name: 'All Work Cells',
            code: 'ALL',
            description: 'Show orders from all work cells',
            is_active: true,
            status: 'active' as const,
            available_hours_per_day: 0,
            efficiency_percentage: 0,
            routing_steps_count: workCells.reduce((sum, wc) => sum + (wc.routing_steps_count || 0), 0),
            production_schedules_count: workCells.reduce((sum, wc) => sum + (wc.production_schedules_count || 0), 0),
        };

        return [allOption, ...workCells.map(wc => ({
            ...wc,
            id: wc.id.toString(),
        }))];
    }, [workCells]);

    // Filter work cells based on search query
    const filteredWorkCells = useMemo(() => {
        if (!searchQuery.trim()) {
            return enrichedWorkCells;
        }

        const query = searchQuery.toLowerCase();
        return enrichedWorkCells.filter(workCell => {
            return (
                (workCell.name?.toLowerCase() || '').includes(query) ||
                (workCell.code?.toLowerCase() || '').includes(query) ||
                (workCell.description?.toLowerCase() || '').includes(query)
            );
        });
    }, [enrichedWorkCells, searchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const handleSelect = () => {
        if (selectedId === 'all') {
            onSelectWorkCell(undefined);
        } else {
            onSelectWorkCell(selectedId);
        }
        onOpenChange(false);
        setSearchQuery('');
    };

    const handleCancel = () => {
        onOpenChange(false);
        setSearchQuery('');
        setSelectedId(selectedWorkCellId);
    };

    const getUtilizationPercentage = (workCell: WorkCell | { id: string; name: string; code: string; description: string; is_active: boolean; status: 'active' | 'maintenance' | 'inactive'; available_hours_per_day: number; efficiency_percentage: number; routing_steps_count: number; production_schedules_count: number }) => {
        if (!workCell.available_hours_per_day || workCell.available_hours_per_day === 0) return 0;
        if (!workCell.production_schedules_count) return 0;
        // Simple utilization based on schedules vs available hours
        const utilizationEstimate = (workCell.production_schedules_count * 2) / workCell.available_hours_per_day * 100;
        return Math.min(100, Math.round(utilizationEstimate));
    };

    const getUtilizationColor = (percentage: number) => {
        if (percentage >= 90) return 'text-red-600';
        if (percentage >= 70) return 'text-yellow-600';
        return 'text-green-600';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle>Select Work Cell</DialogTitle>
                    <DialogDescription>
                        Search and select a work cell to filter manufacturing orders
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, code or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            autoFocus
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    {/* Results */}
                    <ScrollArea className="h-[400px] rounded-md border">
                        <div className="p-2">
                            {filteredWorkCells.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Search className="mb-2 h-8 w-8" />
                                    <p className="text-sm">No work cells found</p>
                                    <p className="text-xs">Try using different keywords</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredWorkCells.map((workCell) => {
                                        const isAllOption = workCell.id === 'all';

                                        return (
                                            <button
                                                key={workCell.id}
                                                onClick={() => setSelectedId(workCell.id)}
                                                onDoubleClick={handleSelect}
                                                className={cn(
                                                    "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                                                    selectedId === workCell.id && "border-primary bg-accent",
                                                    isAllOption && "border-dashed"
                                                )}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Factory className={cn(
                                                                "h-4 w-4",
                                                                isAllOption ? "text-primary" : "text-muted-foreground"
                                                            )} />
                                                            <div>
                                                                <span className="font-medium">{workCell.name}</span>
                                                                {workCell.code && workCell.code !== 'ALL' && (
                                                                    <span className="text-muted-foreground ml-2">({workCell.code})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {!isAllOption && workCell.status && (
                                                            <Badge variant={
                                                                workCell.status === 'active' ? "default" :
                                                                    workCell.status === 'maintenance' ? "outline" : "secondary"
                                                            }>
                                                                {workCell.status.charAt(0).toUpperCase() + workCell.status.slice(1)}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {workCell.description && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {workCell.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        {/* Available Hours */}
                                                        {workCell.available_hours_per_day > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                <span>
                                                                    {workCell.available_hours_per_day}h/day available
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Efficiency */}
                                                        {workCell.efficiency_percentage > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <BarChart3 className="h-3 w-3" />
                                                                <span className={getUtilizationColor(workCell.efficiency_percentage)}>
                                                                    {workCell.efficiency_percentage}% efficiency
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Production Schedules */}
                                                        {workCell.production_schedules_count !== undefined && workCell.production_schedules_count > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <Users className="h-3 w-3" />
                                                                <span>
                                                                    {workCell.production_schedules_count} schedule{workCell.production_schedules_count !== 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            {filteredWorkCells.length} of {enrichedWorkCells.length} work cells
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSelect}
                                disabled={!selectedId}
                            >
                                Select Work Cell
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
