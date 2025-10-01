import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ImportFile, FieldMapping, ImportOptions, ImportSession, ImportResult } from '../types';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

interface Props {
    files: ImportFile[];
    mapping: FieldMapping;
    options: ImportOptions;
    session: ImportSession;
    onComplete: (session: ImportSession) => void;
}

export function ProcessingStep({ files, mapping, options, session, onComplete }: Props) {
    const [currentSession, setCurrentSession] = useState(session);
    const [isProcessing, setIsProcessing] = useState(true);
    const [progress, setProgress] = useState(0);
    const [currentItem, setCurrentItem] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Preparing import...');
    const [errors, setErrors] = useState<Array<{
        row: number;
        message: string;
    }>>([]);

    const file = files[0];

    useEffect(() => {
        startImport();
    }, []);

    const startImport = async () => {
        setIsProcessing(true);

        try {
            // Create FormData
            const formData = new FormData();
            formData.append('file', file.file);
            formData.append('mapping', JSON.stringify(mapping));
            formData.append('update_existing', options.updateExisting ? '1' : '0');

            // Use Inertia to post the form
            router.post(route('production.items.import'), formData, {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onProgress: (progressEvent) => {
                    if (progressEvent && progressEvent.lengthComputable && progressEvent.total) {
                        const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        setProgress(percentComplete);
                        setStatusMessage(`Uploading file... ${percentComplete}%`);
                    }
                },
                onSuccess: (page: any) => {
                    const flash = page.props.flash as { result?: ImportResult } | undefined;
                    const result = flash?.result;

                    if (result) {
                        const updatedSession: ImportSession = {
                            ...currentSession,
                            status: 'completed',
                            processedItems: result.imported + result.updated + result.skipped + result.failed,
                            successfulItems: result.imported + result.updated,
                            failedItems: result.failed,
                        };

                        setCurrentSession(updatedSession);
                        setProgress(100);
                        setStatusMessage('Import completed successfully!');

                        // Show success message
                        if (result.imported > 0 || result.updated > 0) {
                            toast.success(`Successfully imported ${result.imported} new items and updated ${result.updated} existing items.`);
                        }

                        setTimeout(() => {
                            setIsProcessing(false);
                            onComplete(updatedSession);
                        }, 1000);
                    }
                },
                onError: (errors) => {
                    console.error('Import errors:', errors);

                    const errorMessages = Object.values(errors).flat();
                    setErrors(errorMessages.map((msg, index) => ({
                        row: index + 1,
                        message: String(msg)
                    })));

                    const updatedSession: ImportSession = {
                        ...currentSession,
                        status: 'failed',
                        failedItems: currentSession.totalItems,
                        errors: errorMessages.map((msg, index) => ({
                            row: index + 1,
                            message: String(msg)
                        }))
                    };

                    setCurrentSession(updatedSession);
                    setStatusMessage('Import failed');
                    setIsProcessing(false);

                    toast.error('Import failed. Please check the errors below.');
                }
            });

            // Simulate progress updates while processing
            const progressInterval = setInterval(() => {
                setCurrentItem(prev => {
                    const next = prev + Math.floor(Math.random() * 10) + 1;
                    return Math.min(next, currentSession.totalItems);
                });
            }, 500);

            // Clean up interval when done
            setTimeout(() => clearInterval(progressInterval), 30000);

        } catch (error) {
            console.error('Import error:', error);
            setStatusMessage('Import failed');
            setIsProcessing(false);
            toast.error('An unexpected error occurred during import.');
        }
    };

    const progressPercentage = currentSession.totalItems > 0
        ? Math.round((currentItem / currentSession.totalItems) * 100)
        : progress;

    return (
        <div className="space-y-6">
            {/* Processing Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Processing Import</CardTitle>
                    <CardDescription>
                        {isProcessing ? 'Please wait while we import your items...' : 'Import process completed'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Status Message */}
                    <div className="flex items-center gap-3">
                        {isProcessing ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : currentSession.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <span className="font-medium">{statusMessage}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <Progress value={progressPercentage} className="h-3" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Processing item {currentItem.toLocaleString()} of {currentSession.totalItems.toLocaleString()}</span>
                            <span>{progressPercentage}%</span>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Processed</p>
                            <p className="text-2xl font-bold">{currentItem.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Remaining</p>
                            <p className="text-2xl font-bold">
                                {Math.max(0, currentSession.totalItems - currentItem).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Import Mode Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Import Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Mode:</span>
                            <span className="font-medium">
                                {options.updateExisting ? 'Update existing items' : 'Skip existing items'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Errors */}
            {errors.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <div className="space-y-2">
                            <p className="font-medium">Import failed with {errors.length} error(s):</p>
                            <ul className="list-disc pl-5 space-y-1">
                                {errors.slice(0, 5).map((error, index) => (
                                    <li key={index} className="text-sm">
                                        {error.message}
                                    </li>
                                ))}
                            </ul>
                            {errors.length > 5 && (
                                <p className="text-sm">...and {errors.length - 5} more errors</p>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Processing Tips */}
            {isProcessing && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Please don't close this window.</strong> Large imports may take several minutes to complete.
                        The page will automatically update when the import is finished.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
