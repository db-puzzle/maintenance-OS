import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportFile, FieldMapping, ImportOptions, ImportSession } from '../types';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

interface Props {
    files: ImportFile[];
    mapping: FieldMapping;
    options: ImportOptions;
    session: ImportSession;
    onComplete: (session: ImportSession) => void;
}

export function ProcessingStep({ files, mapping, options, session, onComplete }: Props) {
    const [currentSession, setCurrentSession] = useState<ImportSession>(session);
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        processImport();
    }, []);

    const processImport = async () => {
        try {
            const formData = new FormData();
            formData.append('file', files[0].file);
            formData.append('update_existing', options.updateExisting.toString());
            formData.append('skip_duplicates', options.skipDuplicates.toString());

            // Add field mapping for CSV files
            if (files[0].file.name.endsWith('.csv')) {
                formData.append('mapping', JSON.stringify(mapping));
            }

            const response = await axios.post(
                route('production.work-cells.import'),
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            setCurrentSession(prev => ({
                                ...prev,
                                processedRows: Math.round((prev.totalRows * percentCompleted) / 100)
                            }));
                        }
                    }
                }
            );

            if (response.data.success) {
                const results = response.data.results;
                const completedSession: ImportSession = {
                    ...currentSession,
                    status: 'completed',
                    processedRows: currentSession.totalRows,
                    createdCount: results.created || 0,
                    updatedCount: results.updated || 0,
                    skippedCount: results.skipped || 0,
                    errors: results.errors || []
                };

                setCurrentSession(completedSession);
                onComplete(completedSession);
            } else {
                throw new Error(response.data.message || 'Import failed');
            }
        } catch (error) {
            console.error('Import error:', error);

            const failedSession: ImportSession = {
                ...currentSession,
                status: 'failed',
                errors: [{
                    row: 0,
                    message: axios.isAxiosError(error)
                        ? error.response?.data?.message || error.message
                        : 'Erro desconhecido ao processar importação'
                }]
            };

            setCurrentSession(failedSession);
            onComplete(failedSession);
        } finally {
            setIsProcessing(false);
        }
    };

    const progress = currentSession.totalRows > 0
        ? (currentSession.processedRows / currentSession.totalRows) * 100
        : 0;

    return (
        <div className="max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Processando Importação</CardTitle>
                    <CardDescription>
                        {isProcessing ? 'Importando células de trabalho...' : 'Importação concluída'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Progresso</span>
                            <span>
                                {currentSession.processedRows} de {currentSession.totalRows} registros
                            </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-center py-8">
                        {currentSession.status === 'processing' || currentSession.status === 'pending' ? (
                            <div className="text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                                <p className="mt-4 text-sm text-gray-500">
                                    Processando arquivo...
                                </p>
                            </div>
                        ) : currentSession.status === 'completed' ? (
                            <div className="text-center">
                                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                                <p className="mt-4 text-sm font-medium text-green-600">
                                    Importação concluída com sucesso!
                                </p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <XCircle className="h-12 w-12 text-red-600 mx-auto" />
                                <p className="mt-4 text-sm font-medium text-red-600">
                                    Erro ao processar importação
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Statistics */}
                    {currentSession.status === 'completed' && (
                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-green-600">
                                        {currentSession.createdCount}
                                    </div>
                                    <p className="text-xs text-gray-500">Criadas</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {currentSession.updatedCount}
                                    </div>
                                    <p className="text-xs text-gray-500">Atualizadas</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {currentSession.skippedCount}
                                    </div>
                                    <p className="text-xs text-gray-500">Ignoradas</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Errors */}
                    {currentSession.errors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                <p className="font-medium mb-2">Erros encontrados:</p>
                                <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                                    {currentSession.errors.map((error, index) => (
                                        <li key={index}>
                                            {error.row > 0 && `Linha ${error.row}: `}
                                            {error.message}
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;
