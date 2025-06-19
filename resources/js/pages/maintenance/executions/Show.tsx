import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Clock,
    User,
    Calendar,
    Download,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Camera,
    FileText,
    Ruler,
    ListChecks
} from 'lucide-react';
import type { RoutineExecution, TaskResponse } from '@/types/maintenance';
import { toast } from 'sonner';

interface ExecutionShowProps {
    execution: RoutineExecution;
    taskResponses: TaskResponse[];
    canExport: boolean;
}

const ExecutionShow: React.FC<ExecutionShowProps> = ({
    execution,
    taskResponses,
    canExport,
}) => {
    const [activeTab, setActiveTab] = useState('responses');
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set(taskResponses.map(tr => tr.id)));
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'ready'>('idle');
    const [exportId, setExportId] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Maintenance',
            href: '/maintenance/dashboard',
        },
        {
            title: 'Executions',
            href: '/maintenance/executions',
        },
        {
            title: `#${execution.id}`,
            href: `/maintenance/executions/${execution.id}`,
        },
    ];

    const toggleTaskExpanded = (taskId: number) => {
        const newExpanded = new Set(expandedTasks);
        if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
        } else {
            newExpanded.add(taskId);
        }
        setExpandedTasks(newExpanded);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getResponseStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case 'warning':
                return <AlertCircle className="h-5 w-5 text-yellow-600" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-600" />;
            default:
                return <AlertCircle className="h-5 w-5 text-gray-400" />;
        }
    };

    const getTaskTypeIcon = (type: string) => {
        switch (type) {
            case 'measurement':
                return <Ruler className="h-4 w-4" />;
            case 'photo':
                return <Camera className="h-4 w-4" />;
            case 'multiple_choice':
            case 'multiple_select':
                return <ListChecks className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const handleExport = async () => {
        setIsExporting(true);
        setExportError(null);

        try {
            const response = await fetch(`/maintenance/executions/${execution.id}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    format: 'pdf',
                    template: 'standard',
                    include_images: true,
                    compress_images: true,
                    include_signatures: false,
                    paper_size: 'A4',
                    delivery: {
                        method: 'download',
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error && data.error.includes('Chrome')) {
                    throw new Error('Chrome/Chromium is required for PDF generation. Please install Google Chrome: brew install --cask google-chrome');
                }
                throw new Error(data.error || `Export failed: ${response.statusText}`);
            }

            setExportStatus('processing');
            setExportId(data.export_id);

            const pollInterval = setInterval(async () => {
                try {
                    const statusResponse = await fetch(`/maintenance/executions/exports/${data.export_id}/status`, {
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    });
                    const statusData = await statusResponse.json();

                    if (statusData.status === 'completed' && statusData.download_url) {
                        clearInterval(pollInterval);
                        setExportStatus('ready');

                        window.location.href = statusData.download_url;

                        setTimeout(() => {
                            setExportStatus('idle');
                            setExportId(null);
                        }, 2000);
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);
                        setExportStatus('idle');
                        setExportId(null);
                        toast.error('Export Failed: The export process failed. Please try again.');
                    }
                } catch (error) {
                    console.error('Status polling error:', error);
                }
            }, 2000);

            setTimeout(() => {
                clearInterval(pollInterval);
                if (exportStatus === 'processing') {
                    setExportStatus('idle');
                    setExportId(null);
                    toast.error('Export Timeout: The export is taking longer than expected. Please check your exports page.');
                }
            }, 300000);
        } catch (error) {
            console.error('Export error:', error);
            setExportStatus('idle');
            toast.error(error instanceof Error ? error.message : 'An error occurred while exporting');
        } finally {
            setIsExporting(false);
        }
    };

    const renderTaskResponse = (response: TaskResponse) => {
        const formattedResponse = response.response;

        switch (formattedResponse.type) {
            case 'measurement':
                return (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Value:</span>
                            <Badge variant={formattedResponse.is_within_range ? 'default' : 'destructive'}>
                                {formattedResponse.display_value}
                            </Badge>
                        </div>
                        {formattedResponse.range_info && (
                            <p className="text-sm text-muted-foreground">
                                {formattedResponse.range_info.range_text}
                            </p>
                        )}
                    </div>
                );

            case 'multiple_choice':
                return (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Selected:</span>
                            <span>{formattedResponse.display_value}</span>
                        </div>
                    </div>
                );

            case 'multiple_select':
                return (
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <span className="font-medium">Selected ({formattedResponse.selected_count}):</span>
                            <span>{formattedResponse.display_value}</span>
                        </div>
                    </div>
                );

            case 'question':
                return (
                    <div className="space-y-2">
                        <p className="text-sm">{formattedResponse.display_value}</p>
                        <p className="text-xs text-muted-foreground">
                            {formattedResponse.word_count} words • {formattedResponse.character_count} characters
                        </p>
                    </div>
                );

            case 'photo':
                return (
                    <div className="space-y-2">
                        <p className="text-sm">{formattedResponse.display_value}</p>
                        {formattedResponse.photos && formattedResponse.photos.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {formattedResponse.photos.map((photo) => (
                                    <div key={photo.id} className="relative group">
                                        <img
                                            src={photo.thumbnail_url}
                                            alt={photo.filename}
                                            className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(photo.url, '_blank')}
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            {photo.filename}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'file_upload':
                return (
                    <div className="space-y-2">
                        <p className="text-sm">{formattedResponse.display_value}</p>
                        {formattedResponse.files && formattedResponse.files.length > 0 && (
                            <div className="space-y-1">
                                {formattedResponse.files.map((file) => (
                                    <a
                                        key={file.id}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                    >
                                        <FileText className="h-4 w-4" />
                                        {file.filename}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'code_reader':
                return (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Code:</span>
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                                {formattedResponse.display_value}
                            </code>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Type: {formattedResponse.code_type}
                        </p>
                    </div>
                );

            default:
                return (
                    <div className="text-sm">
                        {formattedResponse.display_value}
                    </div>
                );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Execution #${execution.id} - Maintenance`} />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">
                            Execution #{execution.id}
                        </h1>
                        <p className="text-muted-foreground">
                            {execution.routine.name} • {execution.assets[0]?.tag || execution.primary_asset_tag}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {canExport && (
                            <>
                                <Button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    {isExporting ? 'Exporting...' : 'Export PDF'}
                                </Button>
                                {exportError && (
                                    <p className="text-sm text-red-600 self-center">
                                        {exportError}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Summary Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Execution Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span className="text-sm">Executor</span>
                                </div>
                                <p className="font-medium">{execution.executor.name}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-sm">Started At</span>
                                </div>
                                <p className="font-medium">{formatDate(execution.started_at)}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm">Duration</span>
                                </div>
                                <p className="font-medium">
                                    {execution.duration_minutes ? `${execution.duration_minutes} minutes` : 'In Progress'}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-sm">Status</span>
                                </div>
                                <Badge className={getStatusColor(execution.status)}>
                                    {execution.status.replace('_', ' ')}
                                </Badge>
                            </div>
                        </div>

                        {execution.status === 'in_progress' && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Progress</span>
                                    <span className="text-sm font-medium">{execution.progress}%</span>
                                </div>
                                <Progress value={execution.progress} />
                            </div>
                        )}

                        {execution.notes && (
                            <div className="mt-6">
                                <h4 className="font-medium mb-2">Notes</h4>
                                <p className="text-sm text-muted-foreground">{execution.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <TabsList>
                        <TabsTrigger value="responses">
                            Task Responses ({taskResponses.length})
                        </TabsTrigger>
                        <TabsTrigger value="timeline">
                            Timeline
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="responses" className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Task Responses</h3>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExpandedTasks(new Set(taskResponses.map(tr => tr.id)))}
                                >
                                    Expand All
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExpandedTasks(new Set())}
                                >
                                    Collapse All
                                </Button>
                            </div>
                        </div>

                        {taskResponses.map((response, index) => (
                            <Card key={response.id}>
                                <CardHeader
                                    className="cursor-pointer"
                                    onClick={() => toggleTaskExpanded(response.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {index + 1}.
                                                </span>
                                                {getTaskTypeIcon(response.task.type)}
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">
                                                    {response.task.description}
                                                </CardTitle>
                                                {response.task.is_required && (
                                                    <Badge variant="secondary" className="mt-1">
                                                        Required
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getResponseStatusIcon(response.response.status)}
                                            <ChevronRight
                                                className={`h-4 w-4 transition-transform ${expandedTasks.has(response.id) ? 'rotate-90' : ''
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>

                                {expandedTasks.has(response.id) && (
                                    <CardContent>
                                        {response.task.instructions.length > 0 && (
                                            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                                                <p className="text-sm font-medium mb-2">Instructions:</p>
                                                {response.task.instructions.map((instruction) => (
                                                    <p key={instruction.id} className="text-sm text-muted-foreground">
                                                        {instruction.content}
                                                    </p>
                                                ))}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Response:</p>
                                            {renderTaskResponse(response)}
                                        </div>

                                        {response.responded_at && (
                                            <p className="text-xs text-muted-foreground mt-4">
                                                Responded at: {formatDate(response.responded_at)}
                                            </p>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="timeline" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Execution Timeline</CardTitle>
                                <CardDescription>
                                    Complete history of execution events
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {execution.timeline.map((event, index) => (
                                        <div key={index} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-3 h-3 bg-primary rounded-full" />
                                                {index < execution.timeline.length - 1 && (
                                                    <div className="w-0.5 h-16 bg-border" />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-8">
                                                <p className="font-medium">{event.description}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDate(event.timestamp)}
                                                    {event.user && ` • ${event.user}`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
};

export default ExecutionShow; 