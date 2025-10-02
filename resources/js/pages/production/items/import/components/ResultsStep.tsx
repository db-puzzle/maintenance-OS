import React from 'react';
import { CheckCircle, XCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportSession } from '../types';
import { router } from '@inertiajs/react';

interface Props {
    session: ImportSession;
    onNewImport: () => void;
}

export function ResultsStep({ session, onNewImport }: Props) {
    const isSuccess = session.status === 'completed' && session.successfulItems > 0;
    const hasErrors = session.failedItems > 0 || (session.errors && session.errors.length > 0);
    const skippedItems = session.processedItems - session.successfulItems - session.failedItems;

    const handleViewItems = () => {
        router.visit(route('production.items.index'));
    };

    return (
        <div className="space-y-6">
            {/* Overall Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {isSuccess ? (
                            <>
                                <CheckCircle className="h-6 w-6 text-green-600" />
                                Importação Concluída com Sucesso
                            </>
                        ) : (
                            <>
                                <XCircle className="h-6 w-6 text-destructive" />
                                Importação Falhou
                            </>
                        )}
                    </CardTitle>
                    <CardDescription>
                        {isSuccess
                            ? 'Seus itens foram importados com sucesso.'
                            : 'O processo de importação encontrou erros.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Summary Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Total de Itens</p>
                                <p className="text-2xl font-bold">{session.totalItems.toLocaleString()}</p>
                            </div>
                            {session.importedCount !== undefined && session.importedCount > 0 && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Novos</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {session.importedCount.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {session.updatedCount !== undefined && session.updatedCount > 0 && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Atualizados</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {session.updatedCount.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {(session.skippedCount !== undefined ? session.skippedCount : skippedItems) > 0 && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Pulados</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {(session.skippedCount ?? skippedItems).toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {session.failedItems > 0 && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Falhou</p>
                                    <p className="text-2xl font-bold text-destructive">
                                        {session.failedItems.toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Success Rate */}
                        {session.processedItems > 0 && (
                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Taxa de Sucesso</span>
                                    <span className="text-sm font-medium">
                                        {Math.round((session.successfulItems / session.processedItems) * 100)}%
                                    </span>
                                </div>
                                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-600 transition-all duration-500"
                                        style={{
                                            width: `${(session.successfulItems / session.processedItems) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Results */}
            {isSuccess && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        <strong>Sucesso!</strong>
                        {session.importedCount !== undefined && session.updatedCount !== undefined ? (
                            <>
                                {session.importedCount > 0 && `${session.importedCount} novos itens foram importados`}
                                {session.importedCount > 0 && session.updatedCount > 0 && ' e '}
                                {session.updatedCount > 0 && `${session.updatedCount} itens foram atualizados`}
                                {' com sucesso.'}
                            </>
                        ) : (
                            ` ${session.successfulItems} itens foram processados com sucesso.`
                        )}
                        {(session.skippedCount ?? skippedItems) > 0 && ` ${session.skippedCount ?? skippedItems} itens foram pulados porque já existem.`}
                    </AlertDescription>
                </Alert>
            )}

            {/* Errors */}
            {hasErrors && session.errors && session.errors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Erros de Importação
                        </CardTitle>
                        <CardDescription>
                            Os seguintes erros ocorreram durante a importação
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {session.errors.slice(0, 10).map((error, index) => (
                                <div key={index} className="text-sm p-2 bg-destructive/10 rounded">
                                    {error.row && <span className="font-medium">Linha {error.row}: </span>}
                                    {error.message}
                                </div>
                            ))}
                            {session.errors.length > 10 && (
                                <p className="text-sm text-muted-foreground pt-2">
                                    ...e mais {session.errors.length - 10} erros
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Next Steps */}
            <Card>
                <CardHeader>
                    <CardTitle>Próximos Passos</CardTitle>
                    <CardDescription>
                        O que você gostaria de fazer agora?
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleViewItems}
                            size="sm"
                            variant={isSuccess ? "default" : "outline"}
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            Ver Todos os Itens
                        </Button>
                        <Button
                            onClick={onNewImport}
                            variant="outline"
                            size="sm"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Nova Importação
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tips for Failed Imports */}
            {hasErrors && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Dicas para resolver erros de importação:</strong>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Verifique se todos os campos obrigatórios estão preenchidos</li>
                            <li>Certifique-se de que os números dos itens são únicos</li>
                            <li>Verifique se os campos numéricos contêm números válidos</li>
                            <li>Certifique-se de que os campos de data estão formatados corretamente</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
