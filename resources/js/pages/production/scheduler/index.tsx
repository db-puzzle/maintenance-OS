import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { BreadcrumbItem } from '@/types';
import { useScheduler } from '@/hooks/production/useScheduler';
import { SchedulerToolbar } from '@/components/production/scheduler/SchedulerToolbar';
import { SchedulerGrid } from '@/components/production/scheduler/SchedulerGrid';
import { SchedulerTimeline } from '@/components/production/scheduler/SchedulerTimeline';
import { ResourcePanel } from '@/components/production/scheduler/ResourcePanel';
import { AlertsPanel } from '@/components/production/scheduler/AlertsPanel';
import { SchedulerProvider } from '@/contexts/SchedulerContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Production',
        href: '/production',
    },
    {
        title: 'Scheduler',
        href: '/scheduler',
    },
];

interface Props {
    can: {
        create: boolean;
        publish: boolean;
    };
}

function ProductionSchedulerIndex({ can }: Props) {
    const [showResourcePanel, setShowResourcePanel] = useState(true);
    const [showAlertsPanel, setShowAlertsPanel] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentVersion, setCurrentVersion] = useState<number | null>(null);
    const [splitPosition, setSplitPosition] = useState(300); // Grid width in pixels
    const [resourcePanelHeight, setResourcePanelHeight] = useState(200); // Resource panel height

    const scheduler = useScheduler(currentVersion);

    useEffect(() => {
        // Load initial data
        loadSchedulerData();
    }, []);

    const loadSchedulerData = async () => {
        setIsLoading(true);
        try {
            // Get current or latest draft version
            const response = await fetch(route('scheduler.versions'), {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                // Find the latest draft or published version
                const latestVersion = data.data.find((v: any) => v.status === 'draft') || data.data[0];
                setCurrentVersion(latestVersion.id);
            }
        } catch (error) {
            console.error('Failed to load scheduler data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateVersion = async () => {
        try {
            const response = await fetch(route('scheduler.versions.create'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    copy_from_version_id: currentVersion,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentVersion(data.version.id);
                await scheduler.loadScheduleData();
            }
        } catch (error) {
            console.error('Failed to create version:', error);
        }
    };

    const handleMouseDown = (e: React.MouseEvent, type: 'horizontal' | 'vertical') => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startSplitPosition = splitPosition;
        const startResourceHeight = resourcePanelHeight;

        const handleMouseMove = (e: MouseEvent) => {
            if (type === 'horizontal') {
                const diff = e.clientX - startX;
                const newPosition = Math.max(200, Math.min(600, startSplitPosition + diff));
                setSplitPosition(newPosition);
            } else {
                const diff = startY - e.clientY;
                const newHeight = Math.max(100, Math.min(400, startResourceHeight + diff));
                setResourcePanelHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    if (isLoading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Production Scheduler" />
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </AppLayout>
        );
    }

    return (
        <SchedulerProvider versionId={currentVersion}>
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Production Scheduler" />
                
                <div className="flex flex-col h-[calc(100vh-4rem)]">
                    {/* Toolbar */}
                    <SchedulerToolbar
                        canCreate={can.create}
                        canPublish={can.publish}
                        onCreateVersion={handleCreateVersion}
                        onToggleResourcePanel={() => setShowResourcePanel(!showResourcePanel)}
                        onToggleAlerts={() => setShowAlertsPanel(!showAlertsPanel)}
                        showingAlerts={showAlertsPanel}
                    />

                    {/* Main content area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Upper section: Grid and Timeline */}
                        <div className={cn(
                            "flex-1 flex overflow-hidden",
                            showResourcePanel && "pb-2"
                        )}>
                            {/* Grid Panel */}
                            <div 
                                className="bg-background border-r"
                                style={{ width: `${splitPosition}px` }}
                            >
                                <SchedulerGrid />
                            </div>

                            {/* Horizontal Splitter */}
                            <div
                                className="w-1 bg-border cursor-col-resize hover:bg-primary/20 transition-colors"
                                onMouseDown={(e) => handleMouseDown(e, 'horizontal')}
                            />

                            {/* Timeline Panel */}
                            <div className="flex-1 overflow-hidden">
                                <SchedulerTimeline />
                            </div>
                        </div>

                        {/* Vertical Splitter */}
                        {showResourcePanel && (
                            <>
                                <div
                                    className="h-1 bg-border cursor-row-resize hover:bg-primary/20 transition-colors"
                                    onMouseDown={(e) => handleMouseDown(e, 'vertical')}
                                />

                                {/* Resource Panel */}
                                <div 
                                    className="border-t"
                                    style={{ height: `${resourcePanelHeight}px` }}
                                >
                                    <ResourcePanel />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Alerts Panel (Overlay) */}
                    {showAlertsPanel && (
                        <AlertsPanel onClose={() => setShowAlertsPanel(false)} />
                    )}
                </div>
            </AppLayout>
        </SchedulerProvider>
    );
}

export default ProductionSchedulerIndex;