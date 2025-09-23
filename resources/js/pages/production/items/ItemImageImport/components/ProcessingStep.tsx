import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, Upload, Clock, Cpu, Database, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImportFile, ImportSession, ImportOptions, ImportPhase } from '../types';
import { formatBytes } from '@/utils/format';
import { UploadQueue } from '../services/UploadQueue';
import axios from 'axios';

interface Props {
    files: ImportFile[];
    session: ImportSession;
    options: ImportOptions;
    chunkSize: number;
    concurrentUploads: number;
    onComplete: () => void;
}

interface PhaseDisplay {
    icon: React.ReactNode;
    title: string;
    description: string;
    showDetails: boolean;
}

const phaseConfig: Record<string, PhaseDisplay> = {
    upload: {
        icon: <Upload className="h-5 w-5" />,
        title: 'Upload de Arquivos',
        description: 'Enviando arquivos para o servidor',
        showDetails: true,
    },
    assembly: {
        icon: <FileCheck className="h-5 w-5" />,
        title: 'Montagem de Arquivos',
        description: 'Unindo partes dos arquivos enviados',
        showDetails: false,
    },
    processing: {
        icon: <Cpu className="h-5 w-5" />,
        title: 'Processamento de Imagens',
        description: 'Associando imagens aos itens',
        showDetails: false,
    },
    metadata: {
        icon: <Database className="h-5 w-5" />,
        title: 'Geração de Metadados',
        description: 'Gerando hashes e miniaturas',
        showDetails: false,
    },
};

export function ProcessingStep({
    files,
    session,
    options,
    chunkSize,
    concurrentUploads,
    onComplete,
}: Props) {
    // Convert chunkSize from MB to bytes (UploadQueue expects bytes)
    const [uploadQueue] = useState(() => new UploadQueue(concurrentUploads, chunkSize * 1024 * 1024));
    const [processedFiles, setProcessedFiles] = useState<Record<string, ImportFile>>({});
    const [currentSessionData, setCurrentSessionData] = useState<ImportSession>(session);
    const [isWaitingForQueue, setIsWaitingForQueue] = useState(false);
    const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const hasStartedUpload = useRef(false);

    const validFiles = files.filter(f => f.valid);
    const totalFiles = validFiles.length;
    const completedFiles = Object.values(processedFiles).filter(f => f.status === 'completed').length;
    const failedFiles = Object.values(processedFiles).filter(f => f.status === 'failed').length;

    const startUpload = useCallback(async () => {
        // Prevent multiple starts
        if (hasStartedUpload.current) {
            console.log('[ProcessingStep] Upload already started, skipping');
            return;
        }
        hasStartedUpload.current = true;

        console.log('[ProcessingStep] Starting upload process', {
            sessionId: session.sessionId,
            validFilesCount: validFiles.length,
            options,
        });

        // Set session ID
        uploadQueue.setSessionId(session.sessionId);

        // Initialize upload queue
        for (const file of validFiles) {
            console.log('[ProcessingStep] Adding file to queue', {
                filename: file.filename,
                size: file.size,
                itemCode: file.itemCode,
            });

            uploadQueue.addFile(file, {
                onProgress: (progress) => {
                    setProcessedFiles(prev => ({
                        ...prev,
                        [file.filename]: {
                            ...file,
                            status: 'uploading',
                            progress,
                        },
                    }));
                },
                onComplete: () => {
                    setProcessedFiles(prev => ({
                        ...prev,
                        [file.filename]: {
                            ...file,
                            status: 'completed',
                            progress: 100,
                        },
                    }));
                },
                onError: (error) => {
                    console.error('[ProcessingStep] File upload error', {
                        filename: file.filename,
                        error: error.message,
                    });
                    setProcessedFiles(prev => ({
                        ...prev,
                        [file.filename]: {
                            ...file,
                            status: 'failed',
                            errors: [error.message],
                        },
                    }));
                },
            });
        }

        // Start processing after all files are queued
        uploadQueue.on('allComplete', async () => {
            console.log('[ProcessingStep] All uploads complete, triggering server processing');
            setIsWaitingForQueue(true);
            // Trigger server-side processing
            try {
                const response = await axios.post(route('production.items.images.import.process'), {
                    sessionId: session.sessionId,
                    options,
                });
                console.log('[ProcessingStep] Server processing started', response.data);
            } catch (error) {
                console.error('[ProcessingStep] Failed to start server processing:', error);
            }
        });

        console.log('[ProcessingStep] Starting upload queue');
        uploadQueue.start();
    }, [validFiles, uploadQueue, session.sessionId, options]);

    const checkSessionStatus = useCallback(async () => {
        try {
            const response = await axios.get(
                route('production.items.images.import.session-status', {
                    sessionId: session.sessionId,
                })
            );

            const sessionData: ImportSession = response.data;

            // Log significant changes
            if (sessionData.status !== currentSessionData.status ||
                sessionData.processed !== currentSessionData.processed ||
                JSON.stringify(sessionData.phases) !== JSON.stringify(currentSessionData.phases)) {
                console.log('[ProcessingStep] Session status update', {
                    sessionId: session.sessionId,
                    status: sessionData.status,
                    phases: sessionData.phases,
                });
            }

            setCurrentSessionData(sessionData);

            // Update queue waiting status
            if (sessionData.status === 'processing' && isWaitingForQueue) {
                setIsWaitingForQueue(false);
            }

            // Check if all phases are complete
            if (sessionData.phases) {
                const allPhasesComplete =
                    sessionData.phases.upload.progress === 100 &&
                    sessionData.phases.assembly.progress === 100 &&
                    sessionData.phases.processing.progress === 100 &&
                    sessionData.phases.metadata.progress >= 95; // Allow some tolerance for metadata

                if (allPhasesComplete || sessionData.status === 'completed') {
                    console.log('[ProcessingStep] All phases completed!');
                    onComplete();
                }
            } else if (sessionData.status === 'completed') {
                onComplete();
            }

            if (sessionData.status === 'failed') {
                console.error('[ProcessingStep] Import failed:', sessionData.error);
            }
        } catch (error) {
            console.error('[ProcessingStep] Failed to check session status:', error);
        }
    }, [session.sessionId, onComplete, currentSessionData, isWaitingForQueue]);

    useEffect(() => {
        // Start upload process only once
        if (!hasStartedUpload.current) {
            startUpload();
        }

        // Start status checking - more frequent when active
        const startStatusChecking = () => {
            const isActive = currentSessionData.status === 'processing' ||
                currentSessionData.status === 'uploads_completed' ||
                isWaitingForQueue;
            statusCheckInterval.current = setInterval(() => {
                checkSessionStatus();
            }, isActive ? 500 : 1000); // Check every 500ms when active, 1s otherwise
        };

        startStatusChecking();

        return () => {
            if (statusCheckInterval.current) clearInterval(statusCheckInterval.current);
            // Only cancel if component is unmounting
            if (!hasStartedUpload.current) {
                uploadQueue.cancelAll();
            }
        };
    }, [startUpload, checkSessionStatus, uploadQueue, currentSessionData.status, isWaitingForQueue]);

    const renderPhaseCard = (phaseKey: string, phase: ImportPhase) => {
        const config = phaseConfig[phaseKey];
        const isActive = phase.progress > 0 && phase.progress < 100;
        const isComplete = phase.progress === 100;
        const isPending = phase.progress === 0;

        // Special handling for queue waiting state
        const isQueueWaiting = phaseKey === 'processing' && isWaitingForQueue && phase.progress === 0;

        return (
            <Card key={phaseKey} className={cn(
                "transition-all duration-300",
                isActive && "ring-2 ring-blue-500 ring-opacity-50",
                isComplete && "bg-green-50",
                isQueueWaiting && "ring-2 ring-yellow-500 ring-opacity-50"
            )}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={cn(
                                "p-2 rounded-full",
                                isComplete ? "bg-green-100 text-green-700" :
                                    isActive ? "bg-blue-100 text-blue-700" :
                                        isQueueWaiting ? "bg-yellow-100 text-yellow-700" :
                                            "bg-gray-100 text-gray-500"
                            )}>
                                {isQueueWaiting ? <Clock className="h-5 w-5" /> : config.icon}
                            </div>
                            <div>
                                <CardTitle className="text-base">{config.title}</CardTitle>
                                <p className="text-sm text-gray-600 mt-0.5">
                                    {isQueueWaiting ? "Aguardando processador disponível..." : config.description}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            {isQueueWaiting ? (
                                <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                            ) : isActive ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            ) : isComplete ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : null}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>
                                    {phase.completed} de {phase.total}
                                    {(phase.failed ?? 0) > 0 && (
                                        <span className="text-red-600 ml-2">
                                            ({phase.failed} falharam)
                                        </span>
                                    )}
                                </span>
                                <span className="font-medium">{Math.round(phase.progress)}%</span>
                            </div>
                            <Progress
                                value={phase.progress}
                                className={cn(
                                    "h-2 transition-all duration-300",
                                    isPending && !isQueueWaiting && "opacity-50"
                                )}
                            />
                        </div>

                        {/* Show additional details for active phases */}
                        {isActive && (phase.in_progress ?? 0) > 0 && (
                            <p className="text-xs text-gray-600">
                                {phase.in_progress} em processamento
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Use local state for upload phase to avoid interference
    const uploadPhase = {
        total: totalFiles,
        completed: completedFiles,
        failed: failedFiles,
        progress: totalFiles > 0 ? ((completedFiles + failedFiles) / totalFiles) * 100 : 0,
    };

    const phases = {
        upload: uploadPhase,
        assembly: currentSessionData.phases?.assembly || { total: totalFiles, completed: 0, progress: 0 },
        processing: currentSessionData.phases?.processing || { total: totalFiles, completed: 0, progress: 0 },
        metadata: currentSessionData.phases?.metadata || { total: totalFiles, completed: 0, progress: 0 },
    };

    // Override with actual data from backend if available
    if (currentSessionData.phases) {
        phases.processing = currentSessionData.phases.processing;
        phases.metadata = currentSessionData.phases.metadata;
        phases.assembly = currentSessionData.phases.assembly;
    }

    return (
        <div className="space-y-6">
            {/* Overall Progress */}
            <div>
                <h3 className="text-lg font-semibold mb-2">Progresso da Importação</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Processando {totalFiles} imagens em múltiplas etapas
                </p>
            </div>

            {/* Phase Progress Cards */}
            <div className="grid gap-4">
                {Object.entries(phases).map(([key, phase]) => renderPhaseCard(key, phase))}
            </div>

            {/* Detailed File List (collapsible) */}
            {phaseConfig.upload.showDetails && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Detalhes dos Arquivos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {validFiles.map((file) => {
                                const processed = processedFiles[file.filename];
                                const status = processed?.status || 'pending';
                                const fileProgress = processed?.progress || 0;

                                return (
                                    <div
                                        key={file.filename}
                                        className={cn(
                                            'flex items-center gap-3 p-2 rounded-lg transition-all',
                                            {
                                                'bg-gray-50': status === 'pending',
                                                'bg-blue-50': status === 'uploading',
                                                'bg-green-50': status === 'completed',
                                                'bg-red-50': status === 'failed',
                                            }
                                        )}
                                    >
                                        <div className="h-8 w-8 rounded overflow-hidden bg-white flex-shrink-0">
                                            {file.preview ? (
                                                <img
                                                    src={file.preview}
                                                    alt={file.filename}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Upload className="h-4 w-4 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-medium truncate">{file.filename}</p>
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {formatBytes(file.size)}
                                                </span>
                                            </div>

                                            {status === 'uploading' && (
                                                <div className="mt-1">
                                                    <Progress value={fileProgress} className="h-1" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-shrink-0">
                                            {status === 'pending' && (
                                                <div className="h-4 w-4 rounded-full bg-gray-300" />
                                            )}
                                            {status === 'uploading' && (
                                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                            )}
                                            {status === 'completed' && (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            )}
                                            {status === 'failed' && (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}