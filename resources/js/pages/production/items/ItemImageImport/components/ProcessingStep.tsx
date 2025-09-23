import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Upload, Pause, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImportFile, ImportSession, ImportOptions } from '../types';
import { formatBytes, formatDuration } from '@/utils/format';
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
    const [isPaused, setIsPaused] = useState(false);
    const [isCancelled, setIsCancelled] = useState(false);
    const [startTime] = useState(Date.now());
    const [elapsedTime, setElapsedTime] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const hasStartedUpload = useRef(false);

    const validFiles = files.filter(f => f.valid);
    const totalFiles = validFiles.length;
    const completedFiles = Object.values(processedFiles).filter(f => f.status === 'completed').length;
    const failedFiles = Object.values(processedFiles).filter(f => f.status === 'failed').length;
    const uploadingFiles = Object.values(processedFiles).filter(f => f.status === 'uploading').length;
    const progress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

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
                    console.log('[ProcessingStep] File upload progress', {
                        filename: file.filename,
                        progress: progress.toFixed(2),
                    });
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
                    console.log('[ProcessingStep] File upload complete', {
                        filename: file.filename,
                    });
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

            if (sessionData.status === 'completed') {
                onComplete();
            } else if (sessionData.status === 'failed') {
                // Handle failure
                console.error('Import failed:', sessionData.error);
            }
        } catch (error) {
            console.error('Failed to check session status:', error);
        }
    }, [session.sessionId, onComplete]);

    useEffect(() => {
        // Start elapsed time counter
        intervalRef.current = setInterval(() => {
            setElapsedTime(Date.now() - startTime);
        }, 1000);

        // Start upload process only once
        if (!hasStartedUpload.current) {
            startUpload();
        }

        // Start status checking
        statusCheckInterval.current = setInterval(() => {
            checkSessionStatus();
        }, 5000); // Check every 5 seconds

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (statusCheckInterval.current) clearInterval(statusCheckInterval.current);
            // Only cancel if component is unmounting
            if (!hasStartedUpload.current) {
                uploadQueue.cancelAll();
            }
        };
    }, [startTime, startUpload, checkSessionStatus, uploadQueue]);



    const handlePause = () => {
        if (isPaused) {
            uploadQueue.resume();
            setIsPaused(false);
        } else {
            uploadQueue.pause();
            setIsPaused(true);
        }
    };

    const handleCancel = async () => {
        if (confirm('Tem certeza que deseja cancelar a importação?')) {
            uploadQueue.cancelAll();
            setIsCancelled(true);

            try {
                await axios.post(
                    route('production.items.images.import.cancel-session', {
                        sessionId: session.sessionId,
                    })
                );
            } catch (error) {
                console.error('Failed to cancel session:', error);
            }
        }
    };

    const estimatedTimeRemaining = () => {
        if (completedFiles === 0) return 'Calculando...';
        const averageTimePerFile = elapsedTime / completedFiles;
        const remainingFiles = totalFiles - completedFiles;
        const estimatedTime = averageTimePerFile * remainingFiles;
        return formatDuration(Math.ceil(estimatedTime / 1000));
    };

    const uploadSpeed = () => {
        if (elapsedTime === 0) return '0 MB/s';
        const totalBytes = Object.values(processedFiles)
            .filter(f => f.status === 'completed')
            .reduce((sum, f) => sum + f.size, 0);
        const bytesPerSecond = totalBytes / (elapsedTime / 1000);
        return formatBytes(bytesPerSecond) + '/s';
    };

    return (
        <div className="space-y-6">
            {/* Progress Overview */}
            <div>
                <h3 className="text-lg font-semibold mb-2">Progresso da Importação</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Processando {totalFiles} imagens
                </p>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span>{completedFiles} de {totalFiles} arquivos</span>
                            <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-700">{completedFiles}</p>
                            <p className="text-sm text-gray-600">Concluídos</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-700">{uploadingFiles}</p>
                            <p className="text-sm text-gray-600">Enviando</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <p className="text-2xl font-bold text-red-700">{failedFiles}</p>
                            <p className="text-sm text-gray-600">Falharam</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-gray-700">
                                {totalFiles - completedFiles - failedFiles - uploadingFiles}
                            </p>
                            <p className="text-sm text-gray-600">Pendentes</p>
                        </div>
                    </div>

                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Tempo decorrido: {formatDuration(Math.floor(elapsedTime / 1000))}</span>
                        <span>Tempo restante: {estimatedTimeRemaining()}</span>
                        <span>Velocidade: {uploadSpeed()}</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
                <Button
                    variant="outline"
                    onClick={handlePause}
                    disabled={isCancelled || completedFiles === totalFiles}
                >
                    {isPaused ? (
                        <>
                            <Play className="h-4 w-4 mr-2" />
                            Continuar
                        </>
                    ) : (
                        <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pausar
                        </>
                    )}
                </Button>
                <Button
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={isCancelled || completedFiles === totalFiles}
                >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                </Button>
            </div>

            {/* File List */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhes dos Arquivos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {validFiles.map((file) => {
                            const processed = processedFiles[file.filename];
                            const status = processed?.status || 'pending';
                            const fileProgress = processed?.progress || 0;

                            return (
                                <div
                                    key={file.filename}
                                    className={cn(
                                        'flex items-center gap-4 p-3 rounded-lg transition-all',
                                        {
                                            'bg-gray-50': status === 'pending',
                                            'bg-blue-50': status === 'uploading',
                                            'bg-green-50': status === 'completed',
                                            'bg-red-50': status === 'failed',
                                        }
                                    )}
                                >
                                    <div className="h-10 w-10 rounded overflow-hidden bg-white">
                                        {file.preview ? (
                                            <img
                                                src={file.preview}
                                                alt={file.filename}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Upload className="h-5 w-5 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">{file.filename}</p>
                                            <span className="text-xs text-gray-500">
                                                {formatBytes(file.size)}
                                            </span>
                                        </div>

                                        {status === 'uploading' && (
                                            <div className="mt-1">
                                                <Progress value={fileProgress} className="h-1" />
                                            </div>
                                        )}

                                        {status === 'failed' && processed?.errors && (
                                            <p className="text-xs text-red-600 mt-1">
                                                {processed.errors[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        {status === 'pending' && (
                                            <div className="h-5 w-5 rounded-full bg-gray-300" />
                                        )}
                                        {status === 'uploading' && (
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                        )}
                                        {status === 'completed' && (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        )}
                                        {status === 'failed' && (
                                            <XCircle className="h-5 w-5 text-red-600" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {isCancelled && (
                <Alert variant="destructive">
                    <AlertDescription>
                        Importação cancelada. {completedFiles} arquivo(s) foram importados com sucesso.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
