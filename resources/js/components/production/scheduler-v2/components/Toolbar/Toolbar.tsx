import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ZoomIn,
    ZoomOut,
    Maximize2,
    Calendar,
    Play,
    Upload,
    AlertCircle,
    Search,
    ChevronDown,
    GitBranch,
    Settings,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { ScheduleVersion } from '@/types/scheduler';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ZoomLevel, ZOOM_LEVELS } from '../../utils/zoomConfig';

interface ToolbarProps {
    currentVersion: ScheduleVersion;
    publishedVersion?: ScheduleVersion;
    schedulingAlgorithms: Record<string, string>;
    alertStats: any;
    zoomLevel: ZoomLevel;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomFit: () => void;
    onZoomLevelChange: (levelId: string) => void;
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    onViewConfigChange: (config: any) => void;
    showDependencies: boolean;
    onToggleDependencies: () => void;
    onOpenOrderSelection: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    currentVersion,
    publishedVersion,
    schedulingAlgorithms,
    alertStats,
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onZoomFit,
    onZoomLevelChange,
    viewConfig,
    onViewConfigChange: _onViewConfigChange,
    showDependencies,
    onToggleDependencies,
    onOpenOrderSelection,
}) => {
    const [selectedAlgorithm, setSelectedAlgorithm] = useState('asap');
    const [searchQuery, setSearchQuery] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    const canPublish = currentVersion.status === 'draft' && alertStats.by_severity.error === 0;

    const handleRunScheduler = () => {
        setIsRunning(true);
        router.post(route('production.scheduler.run'), {
            version_id: currentVersion.id,
            algorithm: selectedAlgorithm,
            start_date: viewConfig.startDate.toISOString().split('T')[0],
            end_date: viewConfig.endDate.toISOString().split('T')[0],
        }, {
            onSuccess: () => {
                toast.success('Scheduling started');
            },
            onError: () => {
                toast.error('Failed to start scheduling');
            },
            onFinish: () => {
                setIsRunning(false);
            },
        });
    };

    const handlePublish = () => {
        router.post(route('production.scheduler.versions.publish', currentVersion.id), {}, {
            onSuccess: () => {
                toast.success('Schedule published successfully');
            },
            onError: () => {
                toast.error('Failed to publish schedule');
            },
        });
    };

    const handleCreateNewSchedule = () => {
        router.post(route('production.scheduler.versions.create'), {}, {
            onSuccess: () => {
                toast.success('New schedule version created');
            },
            onError: () => {
                toast.error('Failed to create new schedule');
            },
        });
    };

    return (
        <div className="bg-background border-b px-4 py-2">
            <div className="flex items-center justify-between gap-4">
                {/* Left section */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleCreateNewSchedule}
                    >
                        Create New Schedule
                    </Button>

                    <Button
                        variant="outline"
                        onClick={onOpenOrderSelection}
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        Setup Scheduler
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="default"
                                disabled={isRunning || currentVersion.status === 'published'}
                            >
                                <Play className="h-4 w-4 mr-2" />
                                Run Scheduler
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {Object.entries(schedulingAlgorithms).map(([key, label]) => (
                                <DropdownMenuItem
                                    key={key}
                                    onClick={() => {
                                        setSelectedAlgorithm(key);
                                        handleRunScheduler();
                                    }}
                                >
                                    {label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="outline"
                        onClick={handlePublish}
                        disabled={!canPublish}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Publish Schedule
                    </Button>

                    <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline">
                            Version {currentVersion.version_number}
                            {currentVersion.status === 'published' && ' (Published)'}
                        </Badge>

                        {publishedVersion && publishedVersion.id !== currentVersion.id && (
                            <Badge variant="secondary">
                                Published: v{publishedVersion.version_number}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Center section - Search */}
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search manufacturing orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-2">
                    {/* Alert indicator */}
                    {alertStats.total > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "gap-2",
                                alertStats.by_severity.error > 0 && "text-destructive border-destructive"
                            )}
                        >
                            <AlertCircle className="h-4 w-4" />
                            <span>{alertStats.unresolved} alerts</span>
                        </Button>
                    )}

                    {/* Time range selector */}
                    <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        {viewConfig.startDate.toLocaleDateString()} - {viewConfig.endDate.toLocaleDateString()}
                    </Button>

                    {/* Dependencies toggle */}
                    <Button
                        variant={showDependencies ? "default" : "outline"}
                        size="sm"
                        onClick={onToggleDependencies}
                        className="gap-2"
                    >
                        <GitBranch className="h-4 w-4" />
                        <span className="hidden sm:inline">Dependencies</span>
                    </Button>

                    {/* Zoom controls */}
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 px-3">
                                    <ZoomIn className="h-4 w-4 mr-2" />
                                    {zoomLevel.name}
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                {ZOOM_LEVELS.map((level) => (
                                    <DropdownMenuItem
                                        key={level.id}
                                        onClick={() => onZoomLevelChange(level.id)}
                                        className={cn(
                                            "flex flex-col items-start py-2",
                                            level.id === zoomLevel.id && "bg-accent"
                                        )}
                                    >
                                        <div className="font-medium">{level.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {level.description}
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center gap-1 border rounded-md p-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={onZoomOut}
                                disabled={zoomLevel.id === ZOOM_LEVELS[ZOOM_LEVELS.length - 1].id}
                                title="Zoom Out"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={onZoomFit}
                                title="Reset Zoom"
                            >
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={onZoomIn}
                                disabled={zoomLevel.id === ZOOM_LEVELS[0].id}
                                title="Zoom In"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

