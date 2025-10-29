import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImportFile, FieldMapping, ImportOptions, ImportSession, ValidationResult, WorkCellPreview } from '../types';
import { ArrowLeft, AlertCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Props {
    files: ImportFile[];
    mapping: FieldMapping;
    options: ImportOptions;
    onNext: (session: ImportSession) => void;
    onBack: () => void;
}

export function ValidationStep({ files, mapping, options, onNext, onBack }: Props) {
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [_existingWorkCells, setExistingWorkCells] = useState<Record<string, WorkCellPreview>>({});

    const validateFile = useCallback(async () => {
        setIsValidating(true);

        try {
            const file = files[0].file;
            const fileType = file.name.split('.').pop()?.toLowerCase();

            let workCells: WorkCellPreview[] = [];

            if (fileType === 'json') {
                const text = await file.text();
                const data = JSON.parse(text);
                workCells = data.work_cells || [];
            } else {
                // Parse CSV
                const text = await file.text();
                const lines = text.split('\n').filter(line => line.trim());
                const headers = lines[0].split(',').map(h => h.trim());

                workCells = lines.slice(1).map((line, index) => {
                    const values = line.split(',').map(v => v.trim());
                    const workCell: WorkCellPreview = {
                        row: index + 2,
                        name: '',
                        cell_type: 'internal',
                        has_finite_capacity: true,
                        is_active: true
                    };

                    headers.forEach((header, i) => {
                        const fieldKey = Object.keys(mapping).find(key => mapping[key] === header);
                        if (fieldKey && fieldKey in workCell) {
                            (workCell as Record<string, string | number | boolean>)[fieldKey] = values[i];
                        }
                    });

                    // Convert boolean values
                    const hasCapacity = (workCell as Record<string, string | number | boolean>).has_finite_capacity;
                    if (typeof hasCapacity === 'string') {
                        workCell.has_finite_capacity = ['yes', 'true', '1'].includes(hasCapacity.toLowerCase());
                    }
                    const isActive = (workCell as Record<string, string | number | boolean>).is_active;
                    if (typeof isActive === 'string') {
                        workCell.is_active = ['yes', 'true', '1'].includes(isActive.toLowerCase());
                    }

                    return workCell;
                });
            }

            // Check for existing work cells
            const names = workCells.map(wc => wc.name).filter(Boolean);
            if (names.length > 0) {
                const response = await axios.post(route('production.work-cells.import.check-existing'), { names });
                setExistingWorkCells(response.data.existing || {});

                // Mark existing work cells
                workCells = workCells.map(wc => ({
                    ...wc,
                    exists: !!response.data.existing[wc.name]
                }));
            }

            // Validate data
            const errors: ImportError[] = [];
            const warnings: ImportError[] = [];
            let validRows = 0;

            workCells.forEach((workCell, index) => {
                const row = workCell.row || index + 2;

                // Required field validation
                if (!workCell.name) {
                    errors.push({ row, field: 'name', message: 'Nome é obrigatório' });
                }

                if (!workCell.cell_type || !['internal', 'external'].includes(workCell.cell_type)) {
                    errors.push({ row, field: 'cell_type', message: 'Tipo de célula deve ser "internal" ou "external"' });
                }

                // Warnings
                if (workCell.exists && !options.updateExisting && !options.skipDuplicates) {
                    warnings.push({ row, message: `Célula "${workCell.name}" já existe` });
                }

                if (!errors.some(e => e.row === row)) {
                    validRows++;
                }
            });

            setValidationResult({
                valid: errors.length === 0,
                totalRows: workCells.length,
                validRows,
                errors,
                warnings,
                preview: workCells.slice(0, 10) // Show first 10 rows
            });

        } catch (error) {
            console.error('Validation error:', error);
            setValidationResult({
                valid: false,
                totalRows: 0,
                validRows: 0,
                errors: [{ row: 0, message: 'Erro ao validar arquivo: ' + (error as Error).message }],
                warnings: [],
                preview: []
            });
        } finally {
            setIsValidating(false);
        }
    }, [files, mapping, options]);

    useEffect(() => {
        validateFile();
    }, [validateFile]);

    const handleProceed = () => {
        // Create a mock session for now - in a real implementation this would create a server session
        const session: ImportSession = {
            id: Date.now().toString(),
            status: 'pending',
            totalRows: validationResult?.totalRows || 0,
            processedRows: 0,
            createdCount: 0,
            updatedCount: 0,
            skippedCount: 0,
            errors: []
        };

        onNext(session);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Validação dos Dados</CardTitle>
                    <CardDescription>
                        Verificando os dados antes da importação
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isValidating ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="mt-4 text-sm text-gray-500">Validando arquivo...</p>
                        </div>
                    ) : validationResult && (
                        <>
                            {/* Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-2xl font-bold">{validationResult.totalRows}</div>
                                        <p className="text-xs text-gray-500">Total de registros</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-2xl font-bold text-green-600">
                                            {validationResult.validRows}
                                        </div>
                                        <p className="text-xs text-gray-500">Registros válidos</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-2xl font-bold text-red-600">
                                            {validationResult.errors.length}
                                        </div>
                                        <p className="text-xs text-gray-500">Erros encontrados</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Errors */}
                            {validationResult.errors.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <p className="font-medium mb-2">
                                            Foram encontrados {validationResult.errors.length} erros que precisam ser corrigidos:
                                        </p>
                                        <ScrollArea className="h-32">
                                            <ul className="text-sm space-y-1">
                                                {validationResult.errors.map((error, index) => (
                                                    <li key={index}>
                                                        Linha {error.row}: {error.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        </ScrollArea>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Warnings */}
                            {validationResult.warnings.length > 0 && (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        <p className="font-medium mb-2">Avisos:</p>
                                        <ul className="text-sm space-y-1">
                                            {validationResult.warnings.map((warning, index) => (
                                                <li key={index}>
                                                    Linha {warning.row}: {warning.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Preview */}
                            {validationResult.preview.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium">
                                        Prévia dos dados ({validationResult.preview.length} de {validationResult.totalRows} registros)
                                    </h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-900">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Linha
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Nome
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Tipo
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Planta
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {validationResult.preview.map((workCell, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 text-sm">{workCell.row}</td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {workCell.name}
                                                                {workCell.exists && (
                                                                    <Badge variant="outline" className="ml-2">
                                                                        Existente
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {workCell.cell_type === 'internal' ? 'Interna' : 'Externa'}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">{workCell.plant_name || '-'}</td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {workCell.is_active ? (
                                                                    <Badge variant="default">Ativa</Badge>
                                                                ) : (
                                                                    <Badge variant="secondary">Inativa</Badge>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Success message */}
                            {validationResult.valid && (
                                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-700 dark:text-green-300">
                                        Todos os dados foram validados com sucesso! Você pode prosseguir com a importação.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={onBack}
                            disabled={isValidating}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                        <Button
                            onClick={handleProceed}
                            disabled={isValidating || !validationResult?.valid}
                        >
                            Importar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;
