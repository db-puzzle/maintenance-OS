import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    Calendar,
    Plus,
    Play,
    Upload,
    ZoomIn,
    ZoomOut,
    Maximize2,
    AlertTriangle,
    Search,
    LayoutPanelTop,
} from 'lucide-react';
import { useScheduler } from '@/hooks/production/useScheduler';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SchedulerToolbarProps {
    canCreate: boolean;
    canPublish: boolean;
    onCreateVersion: () => void;
    onToggleResourcePanel: () => void;
    onToggleAlerts: () => void;
    showingAlerts: boolean;
}

const algorithms = [
    { value: 'asap', label: 'ASAP (As Soon As Possible)' },
    { value: 'jit', label: 'JIT (Just In Time)' },
    { value: 'critical_path', label: 'Critical Path' },
    { value: 'priority', label: 'Priority Based' },
    { value: 'forward', label: 'Forward Scheduling' },
    { value: 'backward', label: 'Backward Scheduling' },
];

const zoomLevels = [
    { value: 'minute', label: 'Minutes' },
    { value: 'hour', label: 'Hours' },
    { value: 'day', label: 'Days' },
    { value: 'week', label: 'Weeks' },
    { value: 'month', label: 'Months' },
];

export function SchedulerToolbar({
    canCreate,
    canPublish,
    onCreateVersion,
    onToggleResourcePanel,
    onToggleAlerts,
    showingAlerts,
}: SchedulerToolbarProps) {
    const scheduler = useScheduler();
    const [selectedAlgorithm, setSelectedAlgorithm] = useState('asap');
    const [searchQuery, setSearchQuery] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);

    const handleRunScheduler = async () => {
        setIsScheduling(true);
        try {
            await scheduler.runScheduler(selectedAlgorithm);
        } finally {
            setIsScheduling(false);
        }
    };

    const handlePublish = async () => {
        if (!scheduler.currentVersion) return;
        await scheduler.publishVersion();
    };

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        scheduler.searchOrders(value);
    };

    const handleZoomIn = () => {
        const currentIndex = zoomLevels.findIndex(z => z.value === scheduler.zoomLevel);
        if (currentIndex > 0) {
            scheduler.setZoomLevel(zoomLevels[currentIndex - 1].value);
        }
    };

    const handleZoomOut = () => {
        const currentIndex = zoomLevels.findIndex(z => z.value === scheduler.zoomLevel);
        if (currentIndex < zoomLevels.length - 1) {
            scheduler.setZoomLevel(zoomLevels[currentIndex + 1].value);
        }
    };

    const handleFitToScreen = () => {
        scheduler.fitToScreen();
    };

    const alertCount = scheduler.alerts?.filter(a => !a.resolved).length || 0;

    return (
        <div className="border-b bg-background p-3">
            <div className="flex items-center justify-between gap-4">
                {/* Left side - Actions */}
                <div className="flex items-center gap-2">
                    {canCreate && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onCreateVersion}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            New Schedule
                        </Button>
                    )}

                    <div className="flex items-center gap-2 border-l pl-2">
                        <Select
                            value={selectedAlgorithm}
                            onValueChange={setSelectedAlgorithm}
                        >
                            <SelectTrigger className="w-[200px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {algorithms.map((algo) => (
                                    <SelectItem key={algo.value} value={algo.value}>
                                        {algo.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            size="sm"
                            onClick={handleRunScheduler}
                            disabled={isScheduling || !scheduler.currentVersion}
                        >
                            <Play className="h-4 w-4 mr-1" />
                            Run Scheduler
                        </Button>
                    </div>

                    {canPublish && scheduler.currentVersion && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handlePublish}
                            disabled={scheduler.isPublished || alertCount > 0}
                            className="border-l ml-2"
                        >
                            <Upload className="h-4 w-4 mr-1" />
                            Publish
                        </Button>
                    )}
                </div>

                {/* Center - Search */}
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                        <Input
                            type="text"
                            placeholder="Search manufacturing orders..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                </div>

                {/* Right side - View controls */}
                <div className="flex items-center gap-2">
                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 border-r pr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleZoomIn}
                            disabled={scheduler.zoomLevel === 'minute'}
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>

                        <Select
                            value={scheduler.zoomLevel}
                            onValueChange={(value) => scheduler.setZoomLevel(value)}
                        >
                            <SelectTrigger className="w-[100px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {zoomLevels.map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                        {level.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleZoomOut}
                            disabled={scheduler.zoomLevel === 'month'}
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleFitToScreen}
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* View toggles */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleResourcePanel}
                    >
                        <LayoutPanelTop className="h-4 w-4" />
                    </Button>

                    <Button
                        variant={showingAlerts ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={onToggleAlerts}
                        className={cn(
                            "relative",
                            alertCount > 0 && "text-destructive"
                        )}
                    >
                        <AlertTriangle className="h-4 w-4" />
                        {alertCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                                {alertCount}
                            </span>
                        )}
                    </Button>

                    {/* Date range selector */}
                    <div className="flex items-center gap-2 border-l pl-2">
                        <Input
                            type="date"
                            value={scheduler.dateRange.start}
                            onChange={(e) => scheduler.setDateRange({
                                ...scheduler.dateRange,
                                start: e.target.value
                            })}
                            className="h-9"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                            type="date"
                            value={scheduler.dateRange.end}
                            onChange={(e) => scheduler.setDateRange({
                                ...scheduler.dateRange,
                                end: e.target.value
                            })}
                            className="h-9"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}