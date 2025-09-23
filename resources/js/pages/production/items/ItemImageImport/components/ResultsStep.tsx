import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Download, Home, RefreshCw } from 'lucide-react';
import { ImportSession } from '../types';
import { formatDuration } from '@/utils/format';
import { router } from '@inertiajs/react';
import axios from 'axios';

interface Props {
    session: ImportSession;
    onNewImport: () => void;
}

export function ResultsStep({ session, onNewImport }: Props) {
    const [finalSession, setFinalSession] = useState<ImportSession>(session);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSessionStatus = useCallback(async () => {
        try {
            const response = await axios.get(
                route('production.items.images.import.session-status', {
                    sessionId: session.sessionId,
                })
            );
            setFinalSession(response.data);
        } catch (error) {
            console.error('Failed to fetch final session status:', error);
        } finally {
            setIsLoading(false);
        }
    }, [session.sessionId]);

    useEffect(() => {
        // Fetch final session status
        fetchSessionStatus();
    }, [fetchSessionStatus]);


    const summary = finalSession.summary || {
        itemsAffected: 0,
        imagesImported: 0,
        imagesSkipped: 0,
        imagesReplaced: 0,
        duplicatesSkipped: 0,
        errors: [],
    };

    const processingTime = finalSession.completed_at && finalSession.started_at
        ? new Date(finalSession.completed_at).getTime() - new Date(finalSession.started_at).getTime()
        : 0;

    const isSuccess = finalSession.status === 'completed' && summary.errors.length === 0;
    const isPartialSuccess = finalSession.status === 'completed' && summary.errors.length > 0;
    const isFailed = finalSession.status === 'failed';

    const downloadErrorReport = () => {
        const csvContent = [
            ['Filename', 'Error'],
            ...summary.errors.map(error => {
                const parts = error.split(':');
                return [parts[0] || '', parts[1] || error];
            }),
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const goToItems = () => {
        router.visit(route('production.items.index'));
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Carregando resultados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Status Alert */}
            {isSuccess && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertDescription className="text-green-800">
                        <span className="font-medium">Importação concluída com sucesso!</span>
                        <br />
                        Todas as imagens foram importadas sem erros.
                    </AlertDescription>
                </Alert>
            )}

            {isPartialSuccess && (
                <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                        <span className="font-medium">Importação concluída com avisos</span>
                        <br />
                        Algumas imagens não puderam ser importadas. Verifique os detalhes abaixo.
                    </AlertDescription>
                </Alert>
            )}

            {isFailed && (
                <Alert variant="destructive">
                    <XCircle className="h-5 w-5" />
                    <AlertDescription>
                        <span className="font-medium">Erro na importação</span>
                        <br />
                        {finalSession.error || 'Ocorreu um erro durante o processamento.'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Summary Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle>Resumo da Importação</CardTitle>
                    <CardDescription>
                        Tempo de processamento: {formatDuration(Math.floor(processingTime / 1000))}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-3xl font-bold text-green-700">
                                {summary.imagesImported}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Imagens Importadas</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-3xl font-bold text-blue-700">
                                {summary.itemsAffected}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Itens Afetados</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <p className="text-3xl font-bold text-yellow-700">
                                {summary.imagesReplaced}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Imagens Substituídas</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-3xl font-bold text-gray-700">
                                {summary.imagesSkipped}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Imagens Ignoradas</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <p className="text-3xl font-bold text-purple-700">
                                {summary.duplicatesSkipped}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Duplicatas Detectadas</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <p className="text-3xl font-bold text-red-700">
                                {summary.errors.length}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Erros</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Errors List */}
            {summary.errors.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-red-700">
                                    <XCircle className="inline h-5 w-5 mr-2" />
                                    Erros Encontrados
                                </CardTitle>
                                <CardDescription>
                                    Lista de arquivos que não puderam ser importados
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={downloadErrorReport}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Baixar Relatório
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {summary.errors.slice(0, 20).map((error, index) => (
                                <div
                                    key={index}
                                    className="p-3 bg-red-50 rounded-lg text-sm"
                                >
                                    <p className="text-red-800">{error}</p>
                                </div>
                            ))}
                            {summary.errors.length > 20 && (
                                <p className="text-sm text-gray-600 text-center pt-2">
                                    ... e mais {summary.errors.length - 20} erros
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={goToItems}>
                    <Home className="h-4 w-4 mr-2" />
                    Ver Itens
                </Button>
                <Button variant="default" onClick={onNewImport}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nova Importação
                </Button>
            </div>
        </div>
    );
}
