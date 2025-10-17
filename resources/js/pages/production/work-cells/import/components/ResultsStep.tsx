import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportSession } from '../types';
import { CheckCircle, XCircle, AlertCircle, FileText, RotateCcw } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Props {
    session: ImportSession;
    onNewImport: () => void;
}

export function ResultsStep({ session, onNewImport }: Props) {
    const totalProcessed = session.createdCount + session.updatedCount + session.skippedCount;
    const hasErrors = session.errors.length > 0;
    const isSuccess = session.status === 'completed' && !hasErrors;

    const handleViewWorkCells = () => {
        router.visit(route('production.work-cells.index'));
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Resultados da Importação</CardTitle>
                    <CardDescription>
                        Resumo do processo de importação de células de trabalho
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Status Summary */}
                    <div className="text-center py-6">
                        {isSuccess ? (
                            <>
                                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                                <h3 className="mt-4 text-xl font-semibold text-green-600">
                                    Importação concluída com sucesso!
                                </h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    {totalProcessed} registros foram processados sem erros.
                                </p>
                            </>
                        ) : session.status === 'failed' ? (
                            <>
                                <XCircle className="h-16 w-16 text-red-600 mx-auto" />
                                <h3 className="mt-4 text-xl font-semibold text-red-600">
                                    Falha na importação
                                </h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    O processo de importação encontrou erros e não pôde ser concluído.
                                </p>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-16 w-16 text-orange-600 mx-auto" />
                                <h3 className="mt-4 text-xl font-semibold text-orange-600">
                                    Importação concluída com avisos
                                </h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    {totalProcessed} registros foram processados, mas alguns erros foram encontrados.
                                </p>
                            </>
                        )}
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold">{session.totalRows}</div>
                                <p className="text-xs text-gray-500">Total de registros</p>
                            </CardContent>
                        </Card>
                        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold text-green-600">
                                    {session.createdCount}
                                </div>
                                <p className="text-xs text-gray-500">Criadas</p>
                            </CardContent>
                        </Card>
                        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold text-blue-600">
                                    {session.updatedCount}
                                </div>
                                <p className="text-xs text-gray-500">Atualizadas</p>
                            </CardContent>
                        </Card>
                        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                            <CardContent className="pt-6">
                                <div className="text-2xl font-bold text-orange-600">
                                    {session.skippedCount}
                                </div>
                                <p className="text-xs text-gray-500">Ignoradas</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Errors */}
                    {hasErrors && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <p className="font-medium mb-2">
                                    {session.errors.length} erro(s) encontrado(s) durante a importação:
                                </p>
                                <div className="max-h-32 overflow-y-auto">
                                    <ul className="text-sm space-y-1">
                                        {session.errors.map((error, index) => (
                                            <li key={index}>
                                                {error.row > 0 && `Linha ${error.row}: `}
                                                {error.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Success Info */}
                    {isSuccess && (
                        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700 dark:text-green-300">
                                <p>Todas as células de trabalho foram importadas com sucesso!</p>
                                {session.createdCount > 0 && (
                                    <p className="mt-1">
                                        {session.createdCount} nova(s) célula(s) foi(ram) criada(s).
                                    </p>
                                )}
                                {session.updatedCount > 0 && (
                                    <p className="mt-1">
                                        {session.updatedCount} célula(s) existente(s) foi(ram) atualizada(s).
                                    </p>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            onClick={handleViewWorkCells}
                            className="flex items-center"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Células de Trabalho
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onNewImport}
                            className="flex items-center"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Nova Importação
                        </Button>
                    </div>

                    {/* Additional Help */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
                        <p className="font-medium mb-2">Próximos passos:</p>
                        <ul className="space-y-1 ml-4 list-disc">
                            <li>Verifique as células importadas na listagem</li>
                            <li>Configure os detalhes adicionais das células conforme necessário</li>
                            <li>Associe as células aos roteiros de produção</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;
