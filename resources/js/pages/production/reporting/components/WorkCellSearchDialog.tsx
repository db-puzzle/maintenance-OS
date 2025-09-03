import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Search, Factory } from 'lucide-react';
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

    // Convert work cell IDs to strings for consistency
    const normalizedWorkCells = useMemo(() => {
        return workCells.map(wc => ({
            ...wc,
            id: wc.id.toString(),
        }));
    }, [workCells]);

    // Filter work cells based on search query
    const filteredWorkCells = useMemo(() => {
        if (!searchQuery.trim()) {
            return normalizedWorkCells;
        }

        const query = searchQuery.toLowerCase();
        return normalizedWorkCells.filter(workCell => {
            return (
                (workCell.name?.toLowerCase() || '').includes(query) ||

                (workCell.description?.toLowerCase() || '').includes(query)
            );
        });
    }, [normalizedWorkCells, searchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onOpenChange(false);
            setSearchQuery('');
            setSelectedId(selectedWorkCellId);
        }
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
                    {/* All Work Cells Button */}
                    <button
                        onClick={() => {
                            onSelectWorkCell(undefined);
                            onOpenChange(false);
                            setSearchQuery('');
                        }}
                        className={cn(
                            "w-full rounded-lg border border-dashed p-3 text-left transition-colors hover:bg-accent",
                            selectedWorkCellId === undefined && "border-primary bg-accent"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-primary" />
                            <div>
                                <span className="font-medium">All Work Cells</span>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Show orders from all work cells
                                </p>
                            </div>
                        </div>
                    </button>

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
                    <ScrollArea className="h-[320px] rounded-md border">
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
                                        return (
                                            <button
                                                key={workCell.id}
                                                onClick={() => {
                                                    onSelectWorkCell(workCell.id);
                                                    onOpenChange(false);
                                                    setSearchQuery('');
                                                }}
                                                className={cn(
                                                    "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                                                    selectedId === workCell.id && "border-primary bg-accent"
                                                )}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Factory className="h-4 w-4 text-muted-foreground" />
                                                            <div>
                                                                <span className="font-medium">{workCell.name}</span>

                                                            </div>
                                                        </div>

                                                    </div>

                                                    {workCell.description && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {workCell.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        {/* Available Hours */}


                                                        {/* Efficiency */}


                                                        {/* Production Schedules */}

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
                    <div className="flex justify-end">
                        <p className="text-sm text-muted-foreground">
                            {filteredWorkCells.length} of {normalizedWorkCells.length} work cells
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
