import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    ImportFile,
    FieldMapping,
    ImportOptions,
    ImportSession,
    ImportError,
    STEP_TYPES,
    validateEnumValue
} from '../types';

interface Props {
    files: ImportFile[];
    mapping: FieldMapping;
    options: ImportOptions;
    onNext: (session: ImportSession) => void;
    onBack: () => void;
}

interface ValidationResult {
    isValid: boolean;
    errors: ImportError[];
    warnings: ImportError[];
    summary: {
        totalTemplates: number;
        validTemplates: number;
        invalidTemplates: number;
        warningCount: number;
    };
}

export function ValidationStep({ files, mapping, options: _options, onNext, onBack }: Props) {
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [progress, setProgress] = useState(0);
    const [session, setSession] = useState<ImportSession | null>(null);

    const file = files[0];
    const fileType = file.file.name.split('.').pop()?.toLowerCase();
    const isJson = fileType === 'json';

    const performClientSideValidation = useCallback(() => {
        // This is a fallback when server validation is not available
        const errors: ImportError[] = [];
        const warnings: ImportError[] = [];
        let validTemplates = 0;
        let totalTemplates = 0;


        if (isJson && file.data) {
            // Validate JSON data
            file.data.forEach((template: Record<string, unknown>, index) => {
                totalTemplates++;
                let isValid = true;

                // Check required fields
                if (!template.name) {
                    errors.push({
                        row: index + 1,
                        field: 'name',
                        message: 'Nome do template é obrigatório',
                        data: template
                    });
                    isValid = false;
                }

                // Validate steps
                if (template.steps && Array.isArray(template.steps)) {
                    template.steps.forEach((step: Record<string, unknown>, stepIndex: number) => {
                        if (!step.name) {
                            errors.push({
                                row: index + 1,
                                field: `steps[${stepIndex}].name`,
                                message: `Nome da etapa ${stepIndex + 1} é obrigatório`,
                                data: step
                            });
                            isValid = false;
                        }

                        // Validate enums
                        if (step.step_type && !validateEnumValue(step.step_type, STEP_TYPES)) {
                            errors.push({
                                row: index + 1,
                                field: `steps[${stepIndex}].step_type`,
                                message: `Tipo de etapa inválido: ${step.step_type}`,
                                data: step
                            });
                            isValid = false;
                        }
                    });
                }

                if (isValid) validTemplates++;
            });
        } else if (!isJson && file.data) {
            // Validate CSV data with mapping
            const templateMap = new Map<string, Record<string, unknown>>();

            // Group rows by template name
            file.data.forEach((row: Record<string, unknown>, index) => {
                const mappedRow: Record<string, unknown> = {};

                // Apply mapping to convert CSV headers to field names
                Object.entries(mapping).forEach(([csvHeader, fieldName]) => {
                    if (fieldName && fieldName !== '_ignore') {
                        mappedRow[fieldName] = row[csvHeader];
                    }
                });

                const templateName = mappedRow.template_name || `Template ${index + 1}`;
                if (!templateMap.has(templateName as string)) {
                    templateMap.set(templateName as string, {
                        name: templateName,
                        description: mappedRow.template_description || '',
                        item_category_name: mappedRow.item_category_name || '',
                        version: mappedRow.version || '1',
                        is_active: mappedRow.is_active || 'true',
                        steps: [] as unknown[]
                    });
                }

                // Add step data
                if (mappedRow.name || mappedRow.step_number) {
                    (templateMap.get(templateName as string)!.steps as unknown[]).push(mappedRow);
                }
            });

            // Validate each template
            templateMap.forEach((template, templateName) => {
                totalTemplates++;
                let isValid = true;

                // Check required template fields
                if (!template.name) {
                    errors.push({
                        row: 1,
                        field: 'template_name',
                        message: 'Nome do template é obrigatório',
                        data: template
                    });
                    isValid = false;
                }

                // Validate steps
                (template.steps as unknown[]).forEach((step: Record<string, unknown>, stepIndex: number) => {
                    if (!step.name) {
                        errors.push({
                            row: stepIndex + 2,
                            field: 'name',
                            message: `Nome da etapa é obrigatório para ${templateName}`,
                            data: step
                        });
                        isValid = false;
                    }

                    // Check for work cell
                    if (!step.work_cell_name) {
                        warnings.push({
                            row: stepIndex + 2,
                            field: 'work_cell_name',
                            message: `Célula de trabalho não especificada para etapa "${step.name || stepIndex + 1}"`,
                            data: step
                        });
                    }
                });

                if (isValid) validTemplates++;
            });
        }

        const validationResult: ValidationResult = {
            isValid: errors.length === 0,
            errors,
            warnings,
            summary: {
                totalTemplates,
                validTemplates,
                invalidTemplates: totalTemplates - validTemplates,
                warningCount: warnings.length
            }
        };

        setValidationResult(validationResult);

        // If valid, create a dummy session but don't auto-proceed
        if (validationResult.isValid) {
            const dummySession: ImportSession = {
                id: Date.now().toString(),
                status: 'pending',
                totalTemplates,
                processedTemplates: 0,
                successfulTemplates: 0,
                failedTemplates: 0,
                errors: []
            };

            setSession(dummySession);
        }
    }, [isJson, file.data, mapping]);

    const validateData = useCallback(async () => {
        setIsValidating(true);
        setProgress(0);

        // For now, skip server validation since the route doesn't exist
        // and go directly to client-side validation
        setTimeout(() => {
            setProgress(100);
            performClientSideValidation();
            setIsValidating(false);
        }, 500);
    }, [performClientSideValidation]);

    useEffect(() => {
        validateData();
    }, [validateData]);

    const _getErrorIcon = (error: ImportError) => {
        if (error.field?.includes('warning')) {
            return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        }
        return <XCircle className="h-4 w-4 text-red-500" />;
    };

    if (isValidating) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Validando Dados</CardTitle>
                        <CardDescription>
                            Verificando a integridade dos dados antes da importação
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                        <Progress value={progress} />
                        <p className="text-center text-sm text-muted-foreground">
                            Validando templates e etapas...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!validationResult) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Resumo da Validação</CardTitle>
                    <CardDescription>
                        Resultado da validação dos dados de importação
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{validationResult.summary.totalTemplates}</p>
                            <p className="text-sm text-muted-foreground">Total de Templates</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{validationResult.summary.validTemplates}</p>
                            <p className="text-sm text-muted-foreground">Templates Válidos</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">{validationResult.summary.invalidTemplates}</p>
                            <p className="text-sm text-muted-foreground">Templates Inválidos</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-600">{validationResult.summary.warningCount}</p>
                            <p className="text-sm text-muted-foreground">Avisos</p>
                        </div>
                    </div>

                    {validationResult.isValid && (
                        <Alert className="mt-4">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-600">
                                Todos os dados foram validados com sucesso e estão prontos para importação.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Erros de Validação</CardTitle>
                        <CardDescription>
                            Estes erros devem ser corrigidos antes de prosseguir com a importação
                        </CardDescription>
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
                                    {validationResult.errors.map((error, index) => (
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

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Avisos</CardTitle>
                        <CardDescription>
                            Estes avisos não impedem a importação, mas devem ser revisados
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Linha</TableHead>
                                        <TableHead>Campo</TableHead>
                                        <TableHead>Aviso</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {validationResult.warnings.map((warning, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Badge variant="secondary">{warning.row}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {warning.field || '-'}
                                            </TableCell>
                                            <TableCell>{warning.message}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <div className="flex gap-2">
                    {!validationResult.isValid && (
                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                        >
                            Corrigir e Tentar Novamente
                        </Button>
                    )}
                    {validationResult.isValid && session && (
                        <Button
                            onClick={() => onNext(session)}
                            className="flex items-center gap-2"
                        >
                            Prosseguir com Importação
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
