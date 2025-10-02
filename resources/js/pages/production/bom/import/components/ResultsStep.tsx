import React from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, FileText, ExternalLink, Plus, List } from 'lucide-react';
import { type BomImportSession } from '../types';

interface Props {
    session: BomImportSession;
    onNewImport: () => void;
}

export function ResultsStep({ session, onNewImport }: Props) {
    const isSuccess = session.status === 'completed' && session.result?.bom_id;
    const result = session.result;

    const handleViewBom = () => {
        if (result?.bom_id) {
            router.visit(route('production.bom.show', { bom: result.bom_id }));
        }
    };

    const handleBackToList = () => {
        router.visit(route('production.bom.index'));
    };

    return (
        <div className="space-y-6">
            {/* Success Card */}
            {isSuccess && result && (
                <Card className="border-green-200">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                            <div>
                                <CardTitle className="text-green-900">Importação Concluída!</CardTitle>
                                <CardDescription>
                                    A BOM foi importada com sucesso para o sistema
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Número da BOM:</span>
                                <span className="font-medium font-mono">{result.bom_number}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Itens importados:</span>
                                <span className="font-medium">{result.items_created}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error Card */}
            {!isSuccess && (
                <Card className="border-red-200">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <XCircle className="h-8 w-8 text-red-600" />
                            <div>
                                <CardTitle className="text-red-900">Importação Falhou</CardTitle>
                                <CardDescription>
                                    Ocorreu um erro durante a importação da BOM
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {result?.errors && result.errors.length > 0 && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    <ul className="list-disc list-inside">
                                        {result.errors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Próximos Passos</CardTitle>
                    <CardDescription>
                        O que você gostaria de fazer agora?
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 flex-wrap">
                        {isSuccess && (
                            <Button
                                onClick={handleViewBom}
                                size="sm"
                                variant="default"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Visualizar BOM Importada
                                <ExternalLink className="h-4 w-4 ml-2" />
                            </Button>
                        )}

                        <Button
                            onClick={onNewImport}
                            variant="outline"
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Importar Outra BOM
                        </Button>

                        <Button
                            onClick={handleBackToList}
                            variant="outline"
                            size="sm"
                        >
                            <List className="h-4 w-4 mr-2" />
                            Voltar para Lista de BOMs
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Info */}
            {isSuccess && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                            <p className="text-sm text-gray-600">
                                Tempo total de processamento:{' '}
                                <span className="font-medium">
                                    {calculateProcessingTime(session)}
                                </span>
                            </p>
                            <p className="text-xs text-gray-500">
                                Importação concluída em {new Date(session.completed_at || '').toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function calculateProcessingTime(session: BomImportSession): string {
    if (!session.started_at || !session.completed_at) return 'N/A';

    const start = new Date(session.started_at).getTime();
    const end = new Date(session.completed_at).getTime();
    const seconds = Math.floor((end - start) / 1000);

    if (seconds < 60) return `${seconds} segundos`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
}
