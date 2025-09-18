import React, { useState } from 'react';
import { Play, Save, Upload, ZoomIn, ZoomOut, Maximize2, AlertCircle, Calendar as CalendarIcon, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ScheduleVersion } from '@/types/scheduler';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface Props {
    currentVersion: ScheduleVersion;
    publishedVersion?: ScheduleVersion;
    schedulingAlgorithms: Record<string, string>;
    alertStats: {
        total: number;
        unresolved: number;
        by_severity: {
            error: number;
            warning: number;
        };
    };
    canPublish: boolean;
    isRunningScheduler: boolean;
    zoomLevel: number;
    dateRange: {
        start: Date;
        end: Date;
    };
    searchQuery: string;
    onRunScheduler: (algorithm: string) => void;
    onPublish: () => void;
    onShowAlerts: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomFit: () => void;
    onDateRangeChange: (range: { start: Date; end: Date }) => void;
    onSearchChange: (query: string) => void;
}

export default function SchedulerToolbar({
    currentVersion,
    publishedVersion,
    schedulingAlgorithms,
    alertStats,
    canPublish,
    isRunningScheduler,
    zoomLevel,
    dateRange,
    searchQuery,
    onRunScheduler,
    onPublish,
    onShowAlerts,
    onZoomIn,
    onZoomOut,
    onZoomFit,
    onDateRangeChange,
    onSearchChange,
}: Props) {
    const [selectedAlgorithm, setSelectedAlgorithm] = useState('asap');
    const [date, setDate] = useState<DateRange | undefined>({
        from: dateRange.start,
        to: dateRange.end,
    });

    const hasErrors = alertStats.by_severity.error > 0;
    const hasWarnings = alertStats.by_severity.warning > 0;

    const handleDateSelect = (range: DateRange | undefined) => {
        setDate(range);
        if (range?.from && range?.to) {
            onDateRangeChange({
                start: range.from,
                end: range.to,
            });
        }
    };

    return (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
            <div className="flex items-center gap-4">
                {/* Version info */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Version:</span>
                    <Badge variant={currentVersion.status === 'published' ? 'default' : 'secondary'}>
                        v{currentVersion.version_number} ({currentVersion.status})
                    </Badge>
                    {publishedVersion && currentVersion.id !== publishedVersion.id && (
                        <>
                            <span className="text-sm text-muted-foreground">Published:</span>
                            <Badge variant="outline">v{publishedVersion.version_number}</Badge>
                        </>
                    )}
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* Actions */}
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentVersion.status === 'published'}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Version
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="default"
                            size="sm"
                            disabled={isRunningScheduler || currentVersion.status === 'published'}
                        >
                            <Play className="h-4 w-4 mr-2" />
                            Run Scheduler
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {Object.entries(schedulingAlgorithms).map(([key, label]) => (
                            <DropdownMenuItem
                                key={key}
                                onSelect={() => {
                                    setSelectedAlgorithm(key);
                                    onRunScheduler(key);
                                }}
                            >
                                {label}
                                {selectedAlgorithm === key && (
                                    <span className="ml-auto text-xs">✓</span>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {canPublish && (
                    <Button
                        variant="default"
                        size="sm"
                        disabled={currentVersion.status === 'published' || hasErrors}
                        onClick={onPublish}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Publish
                    </Button>
                )}

                <Separator orientation="vertical" className="h-6" />

                {/* Date Range Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            selected={date}
                            onSelect={handleDateSelect}
                            numberOfMonths={2}
                            captionLayout="buttons"
                        />
                    </PopoverContent>
                </Popover>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8 w-[200px] h-8"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Alerts */}
                {alertStats.total > 0 && (
                    <Button
                        variant={hasErrors ? 'destructive' : hasWarnings ? 'warning' : 'secondary'}
                        size="sm"
                        onClick={onShowAlerts}
                        className="gap-2"
                    >
                        <AlertCircle className="h-4 w-4" />
                        <span>
                            {alertStats.unresolved} Alert{alertStats.unresolved !== 1 ? 's' : ''}
                        </span>
                        {hasErrors && (
                            <Badge variant="destructive" className="ml-1">
                                {alertStats.by_severity.error}
                            </Badge>
                        )}
                        {hasWarnings && (
                            <Badge variant="warning" className="ml-1">
                                {alertStats.by_severity.warning}
                            </Badge>
                        )}
                    </Button>
                )}

                <Separator orientation="vertical" className="h-6" />

                {/* Zoom controls */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onZoomOut}
                        disabled={zoomLevel <= 0.5}
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-12 text-center">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onZoomIn}
                        disabled={zoomLevel >= 3}
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onZoomFit}
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
