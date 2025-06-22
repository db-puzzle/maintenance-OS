import { type BreadcrumbItem } from '@/types';
import type { RoutineExecution, TaskResponse } from '@/types/maintenance';
import { Head, router, Link } from '@inertiajs/react';
import { Calendar, Clock, FileText, User, Wrench } from 'lucide-react';
import React, { useState } from 'react';

import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import RoutineExecutionFormComponent from '@/components/RoutineExecutionFormComponent';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle, CheckCircle2, ChevronRight, Camera, ListChecks, Ruler } from 'lucide-react';
import { useExportManager } from '@/hooks/use-export-manager';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import Timeline from '@/components/Timeline';

interface ExecutionShowProps {
    execution: RoutineExecution;
    taskResponses: TaskResponse[];
    canExport: boolean;
}

const ExecutionShow: React.FC<ExecutionShowProps> = ({ execution, taskResponses, canExport }) => {
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set(taskResponses.map((tr) => tr.id)));
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'ready'>('idle');
    const [exportId, setExportId] = useState<number | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);

    const { addExport, updateExport } = useExportManager();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Rotinas Executadas',
            href: '/maintenance/routines',
        },
        {
            title: `#${execution.id}`,
            href: `/maintenance/routines/${execution.id}`,
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
            const response = await fetch(`/maintenance/routines/executions/${execution.id}/export`, {
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
                    throw new Error(
                        'Chrome/Chromium is required for PDF generation. Please install Google Chrome: brew install --cask google-chrome',
                    );
                }
                throw new Error(data.error || `Export failed: ${response.statusText}`);
            }

            setExportStatus('processing');
            setExportId(data.export_id);

            // Add to export manager
            addExport({
                id: data.export_id,
                type: 'single',
                description: `Execution #${execution.id} - ${execution.routine.name}`,
                status: 'processing',
                progress: 0,
            });

            const pollInterval = setInterval(async () => {
                try {
                    const statusResponse = await fetch(`/maintenance/routines/exports/${data.export_id}/status`, {
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    });
                    const statusData = await statusResponse.json();

                    // Update progress in export manager
                    if (statusData.progress_percentage) {
                        updateExport(data.export_id, {
                            progress: statusData.progress_percentage,
                        });
                    }

                    if (statusData.status === 'completed' && statusData.download_url) {
                        clearInterval(pollInterval);
                        setExportStatus('ready');

                        // Update export manager with completion
                        updateExport(data.export_id, {
                            status: 'completed',
                            downloadUrl: statusData.download_url,
                            completedAt: new Date(),
                        });

                        setTimeout(() => {
                            setExportStatus('idle');
                            setExportId(null);
                        }, 2000);
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);
                        setExportStatus('idle');
                        setExportId(null);

                        // Update export manager with failure
                        updateExport(data.export_id, {
                            status: 'failed',
                            error: 'The export process failed. Please try again.',
                        });
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

                    // Update export manager with timeout
                    updateExport(data.export_id, {
                        status: 'failed',
                        error: 'Export timeout - check your exports page',
                    });
                }
            }, 300000);
        } catch (error) {
            console.error('Export error:', error);
            setExportStatus('idle');

            // Show error in export manager
            if (exportId) {
                updateExport(exportId, {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'An error occurred',
                });
            } else {
                toast.error(error instanceof Error ? error.message : 'An error occurred while exporting');
            }
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
                            <Badge variant={formattedResponse.is_within_range ? 'default' : 'destructive'}>{formattedResponse.display_value}</Badge>
                        </div>
                        {formattedResponse.range_info && <p className="text-muted-foreground text-sm">{formattedResponse.range_info.range_text}</p>}
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
                        <p className="text-muted-foreground text-xs">
                            {formattedResponse.word_count} words • {formattedResponse.character_count} characters
                        </p>
                    </div>
                );

            case 'photo':
                return (
                    <div className="space-y-2">
                        <p className="text-sm">{formattedResponse.display_value}</p>
                        {formattedResponse.photos && formattedResponse.photos.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                {formattedResponse.photos.map((photo) => (
                                    <div key={photo.id} className="group relative">
                                        <img
                                            src={photo.thumbnail_url}
                                            alt={photo.filename}
                                            className="h-32 w-full cursor-pointer rounded-lg border object-cover transition-opacity hover:opacity-90"
                                            onClick={() => window.open(photo.url, '_blank')}
                                        />
                                        <div className="absolute right-0 bottom-0 left-0 rounded-b-lg bg-black/50 p-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
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
                            <code className="bg-muted rounded px-2 py-1 text-sm">{formattedResponse.display_value}</code>
                        </div>
                        <p className="text-muted-foreground text-xs">Type: {formattedResponse.code_type}</p>
                    </div>
                );

            default:
                return <div className="text-sm">{formattedResponse.display_value}</div>;
        }
    };

    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            {execution.assets && execution.assets.length > 0 && (
                <>
                    <Link
                        href={route('asset-hierarchy.assets.show', execution.assets[0].id)}
                        className="text-primary hover:underline"
                    >
                        {execution.assets[0].tag}
                    </Link>
                    <span className="text-muted-foreground">•</span>
                </>
            )}
            <span className="flex items-center gap-1">
                <Wrench className="h-4 w-4" />
                <span>{execution.routine.name}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <Badge className={getStatusColor(execution.status)}>
                {execution.status.replace('_', ' ')}
            </Badge>
        </span>
    );

    // Common progress bar component to show at the top of all tabs
    const progressBar = execution.status === 'in_progress' && (
        <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Progresso da Execução</span>
                <span className="text-sm font-medium">{execution.progress}%</span>
            </div>
            <Progress value={execution.progress} className="h-2" />
        </div>
    );

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <RoutineExecutionFormComponent
                        execution={execution}
                        canExport={canExport}
                        onExport={handleExport}
                        isExporting={isExporting}
                        exportError={exportError}
                    />
                </div>
            ),
        },
        {
            id: 'responses',
            label: 'Task Responses',
            content: (
                <div className="space-y-4 py-6">
                    {progressBar}
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-medium">Task Responses ({taskResponses.length})</h3>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setExpandedTasks(new Set(taskResponses.map((tr) => tr.id)))}>
                                Expand All
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setExpandedTasks(new Set())}>
                                Collapse All
                            </Button>
                        </div>
                    </div>

                    {taskResponses.map((response, index) => (
                        <Card key={response.id}>
                            <CardHeader className="cursor-pointer" onClick={() => toggleTaskExpanded(response.id)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-sm font-medium">{index + 1}.</span>
                                            {getTaskTypeIcon(response.task.type)}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{response.task.description}</CardTitle>
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
                                            className={`h-4 w-4 transition-transform ${expandedTasks.has(response.id) ? 'rotate-90' : ''}`}
                                        />
                                    </div>
                                </div>
                            </CardHeader>

                            {expandedTasks.has(response.id) && (
                                <CardContent>
                                    {response.task.instructions.length > 0 && (
                                        <div className="bg-muted/50 mb-4 rounded-lg p-3">
                                            <p className="mb-2 text-sm font-medium">Instructions:</p>
                                            {response.task.instructions.map((instruction) => (
                                                <p key={instruction.id} className="text-muted-foreground text-sm">
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
                                        <p className="text-muted-foreground mt-4 text-xs">Responded at: {formatDate(response.responded_at)}</p>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            ),
        },
        {
            id: 'timeline',
            label: 'Timeline',
            content: (
                <Timeline
                    events={execution.timeline}
                    title="Execution Timeline"
                    subtitle="Complete history of execution events"
                    formatDate={formatDate}
                    className="py-0"
                />
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Execution ID ${execution.id} - Maintenance`} />

            <ShowLayout
                title={`Execução de Rotina #${execution.id}`}
                subtitle={subtitle}
                editRoute=""
                tabs={tabs}
                showEditButton={false}
            />
        </AppLayout>
    );
};

export default ExecutionShow;
