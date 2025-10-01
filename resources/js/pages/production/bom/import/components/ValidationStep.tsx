import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { type BomImportSession } from '../types';

interface Props {
    session: BomImportSession;
    onNext: () => void;
    onBack: () => void;
}

export function ValidationStep({ session, onNext, onBack }: Props) {
    const validation = session.validation;
    const hasErrors = validation && (validation.invalid_items > 0 || validation.errors.length > 0);
    const canProceed = validation && validation.valid_items > 0 && !hasErrors;

    return (
        <div className="space-y-6">
            {/* Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Resumo da Validação</CardTitle>
                    <CardDescription>
                        Resultado da análise do arquivo importado
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold">{validation?.total_items || 0}</p>
                            <p className="text-sm text-gray-600">Total de Itens</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{validation?.valid_items || 0}</p>
                            <p className="text-sm text-gray-600">Itens Válidos</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <p className="text-2xl font-bold text-red-600">{validation?.invalid_items || 0}</p>
                            <p className="text-sm text-gray-600">Itens Inválidos</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <p className="text-2xl font-bold text-yellow-600">{validation?.missing_items.length || 0}</p>
                            <p className="text-sm text-gray-600">Itens Não Encontrados</p>
                        </div>
                    </div>
                </CardContent>
            </Card>


            {/* Missing Items */}
            {validation?.missing_items && validation.missing_items.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-500" />
                            Itens Não Encontrados
                        </CardTitle>
                        <CardDescription>
                            Os seguintes itens não existem no sistema e precisam ser criados antes da importação
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Linha</TableHead>
                                        <TableHead>Código do Item</TableHead>
                                        <TableHead>Nome</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {validation.missing_items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.row_index}</TableCell>
                                            <TableCell className="font-mono">{item.item_number}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* General Errors */}
            {validation?.errors && validation.errors.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Erros encontrados:</strong>
                        <ul className="list-disc list-inside mt-2">
                            {validation.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* Success Message */}
            {canProceed && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        <strong>Validação concluída com sucesso!</strong> {validation.valid_items} itens estão prontos para importação.
                    </AlertDescription>
                </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                    Voltar
                </Button>
                <Button
                    onClick={onNext}
                    disabled={!canProceed}
                    variant={canProceed ? "default" : "secondary"}
                >
                    {canProceed ? 'Importar BOM' : 'Corrigir Erros'}
                </Button>
            </div>
        </div>
    );
}
