import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Download, RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { router } from '@inertiajs/react';
import { ImportSession, ImportError } from '../types';

interface Props {
    session: ImportSession;
    onNewImport: () => void;
}

export function ResultsStep({ session, onNewImport }: Props) {
    const isSuccess = session.status === 'completed' && session.failedTemplates === 0;
    const hasErrors = session.failedTemplates > 0 || (session.errors && session.errors.length > 0);

    const getResultIcon = () => {
        if (isSuccess) {
            return <CheckCircle className="h-16 w-16 text-green-600" />;
        } else if (session.status === 'failed') {
            return <XCircle className="h-16 w-16 text-red-600" />;
        } else {
            return <AlertCircle className="h-16 w-16 text-yellow-600" />;
        }
    };

    const getResultTitle = () => {
        if (isSuccess) {
            return 'Importação Concluída com Sucesso!';
        } else if (session.status === 'failed') {
            return 'Importação Falhou';
        } else {
            return 'Importação Concluída com Avisos';
        }
    };

    const getResultMessage = () => {
        if (isSuccess) {
            return `Todos os ${session.successfulTemplates} templates foram importados com sucesso.`;
        } else if (session.status === 'failed') {
            return 'A importação não pôde ser concluída devido a erros críticos.';
        } else {
            return `${session.successfulTemplates} templates foram importados com sucesso, mas ${session.failedTemplates} falharam.`;
        }
    };

    const downloadErrorReport = () => {
        if (!session.errors || session.errors.length === 0) return;

        // Create CSV content
        const headers = ['Linha', 'Campo', 'Erro'];
        const rows = session.errors.map(error => [
            error.row,
            error.field || '-',
            error.message
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `import-errors-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const goToTemplates = () => {
        router.visit(route('production.routing.index'));
    };

    return (
        <div className="space-y-6">
            {/* Result Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-center">{getResultTitle()}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-center">
                        {getResultIcon()}
                    </div>

                    <p className="text-center text-lg">
                        {getResultMessage()}
                    </p>

                    {/* Statistics */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-3xl font-bold">{session.totalTemplates}</p>
                                    <p className="text-sm text-muted-foreground">Total Processado</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-green-600">{session.successfulTemplates}</p>
                                    <p className="text-sm text-muted-foreground">Sucesso</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-red-600">{session.failedTemplates}</p>
                                    <p className="text-sm text-muted-foreground">Falhas</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-blue-600">
                                        {(session.importedCount || 0) + (session.updatedCount || 0)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Total Importado</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed breakdown */}
                    {(session.importedCount !== undefined || session.updatedCount !== undefined || session.skippedCount !== undefined) && (
                        <div className="flex justify-center gap-6">
                            {session.importedCount !== undefined && (
                                <div className="text-center">
                                    <Badge variant="secondary" className="mb-2">Novos Templates</Badge>
                                    <p className="text-2xl font-semibold">{session.importedCount}</p>
                                </div>
                            )}
                            {session.updatedCount !== undefined && (
                                <div className="text-center">
                                    <Badge variant="secondary" className="mb-2">Templates Atualizados</Badge>
                                    <p className="text-2xl font-semibold">{session.updatedCount}</p>
                                </div>
                            )}
                            {session.skippedCount !== undefined && session.skippedCount > 0 && (
                                <div className="text-center">
                                    <Badge variant="secondary" className="mb-2">Templates Ignorados</Badge>
                                    <p className="text-2xl font-semibold">{session.skippedCount}</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Errors */}
            {hasErrors && session.errors && session.errors.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Detalhes dos Erros</CardTitle>
                                <CardDescription>
                                    Templates que não puderam ser importados
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
                        <ScrollArea className="h-[300px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Linha</TableHead>
                                        <TableHead>Campo</TableHead>
                                        <TableHead>Erro</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {session.errors.map((error, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Badge variant="destructive">{error.row}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {error.field || '-'}
                                            </TableCell>
                                            <TableCell>{error.message}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Success message */}
            {isSuccess && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                        <strong>Parabéns!</strong> Todos os templates foram importados com sucesso.
                        Você pode visualizá-los na lista de templates de rotas.
                    </AlertDescription>
                </Alert>
            )}

            {/* Warning message */}
            {!isSuccess && session.status === 'completed' && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Alguns templates não puderam ser importados. Verifique o relatório de erros acima
                        para mais detalhes. Os templates válidos foram importados com sucesso.
                    </AlertDescription>
                </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
                <Button
                    variant="outline"
                    onClick={onNewImport}
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nova Importação
                </Button>
                <Button onClick={goToTemplates}>
                    Ver Templates
                    <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
