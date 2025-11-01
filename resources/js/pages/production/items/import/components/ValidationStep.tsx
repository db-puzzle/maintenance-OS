import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ImportFile, FieldMapping, ImportOptions, ImportSession, csvFields } from '../types';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import axios from 'axios';

interface Props {
    files: ImportFile[];
    mapping: FieldMapping;
    options: ImportOptions;
    onNext: (session: ImportSession) => void;
    onBack: () => void;
}

interface ExistingItem {
    item_number: string;
    name: string;
    description?: string;
    category_name?: string;
    unit_of_measure: string;
    is_active: boolean;
    can_be_sold: boolean;
    can_be_purchased: boolean;
    can_be_manufactured: boolean;
    updated_at: string;
    created_by?: string;
}

export function ValidationStep({ files, mapping, options, onNext, onBack }: Props) {
    const [isValidating, setIsValidating] = useState(true);
    const [validationProgress, setValidationProgress] = useState(0);
    const [validationErrors, setValidationErrors] = useState<Array<{
        row: number;
        field: string;
        message: string;
        data?: Record<string, unknown>;
    }>>([]);
    const [_previewData, _setPreviewData] = useState<Record<string, unknown>[]>([]);
    const [allData, setAllData] = useState<Record<string, unknown>[]>([]);
    const [session, setSession] = useState<ImportSession | null>(null);
    const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
    const [isLoadingExisting, setIsLoadingExisting] = useState(false);
    const [updateExisting, setUpdateExisting] = useState(options.updateExisting);

    const file = files[0];
    const fileType = file.file.name.split('.').pop()?.toLowerCase();
    const isCsv = fileType === 'csv' || fileType === 'txt';
    const isJson = fileType === 'json';

    useEffect(() => {
        validateData();
        // Check for existing items if it's a JSON file
        if (isJson && file.data && file.data.length > 0) {
            checkExistingItems();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkExistingItems = async () => {
        setIsLoadingExisting(true);
        try {
            const itemNumbers = file.data
                ?.map(item => (item as Record<string, unknown>).item_number as string)
                .filter(Boolean) || [];

            if (itemNumbers.length > 0) {
                const response = await axios.post(route('production.items.import.check-existing'), {
                    item_numbers: itemNumbers,
                });

                setExistingItems(response.data.existing_items);
            }
        } catch (error) {
            console.error('Error checking existing items:', error);
        } finally {
            setIsLoadingExisting(false);
        }
    };

    const validateData = async () => {
        setIsValidating(true);
        setValidationProgress(0);

        try {
            let allData: Record<string, unknown>[] = [];

            // For CSV files, we already have parsed data
            if (isCsv && file.data) {
                // Transform CSV data based on mapping
                allData = file.data.map((row) => {
                    const transformed: Record<string, unknown> = {};

                    Object.entries(mapping).forEach(([csvHeader, systemField]) => {
                        if (systemField && systemField !== '_ignore') {
                            transformed[systemField] = row[csvHeader];
                        }
                    });

                    return transformed;
                });

                setAllData(allData); // Store all data
                _setPreviewData(allData.slice(0, 10)); // Preview first 10 rows (kept for reference)

                // Simulate validation progress
                const totalRows = file.totalRows || 0;
                const increment = 100 / totalRows;
                let progress = 0;

                const progressInterval = setInterval(() => {
                    progress += increment * 50; // Validate 50 rows at a time
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(progressInterval);
                    }
                    setValidationProgress(progress);
                }, 100);

                // Create session
                const newSession: ImportSession = {
                    id: `import-${Date.now()}`,
                    status: 'pending',
                    totalItems: totalRows,
                    processedItems: 0,
                    successfulItems: 0,
                    failedItems: 0,
                };
                setSession(newSession);

                // Wait for progress to complete
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                // For JSON files, parse and validate
                const text = await file.file.text();
                const jsonData = JSON.parse(text);

                if (jsonData.items && Array.isArray(jsonData.items)) {
                    allData = jsonData.items;
                    setAllData(allData); // Store all data
                    _setPreviewData(allData.slice(0, 10)); // Preview first 10 rows (kept for reference)

                    const newSession: ImportSession = {
                        id: `import-${Date.now()}`,
                        status: 'pending',
                        totalItems: jsonData.items.length,
                        processedItems: 0,
                        successfulItems: 0,
                        failedItems: 0,
                    };
                    setSession(newSession);
                } else {
                    throw new Error('Invalid JSON format. Expected { items: [...] }');
                }

                setValidationProgress(100);
            }

            // Validate ALL rows, not just preview data
            const errors: typeof validationErrors = [];
            const requiredFields = csvFields.filter(f => f.required);

            allData.forEach((row, index) => {
                // Check required fields
                requiredFields.forEach(field => {
                    if (!row[field.value] || (typeof row[field.value] === 'string' && (row[field.value] as string).trim() === '')) {
                        errors.push({
                            row: index + 1,
                            field: field.label,
                            message: `${field.label} é obrigatório`,
                            data: row // Include the data for display
                        });
                    }
                });
            });

            setValidationErrors(errors);
        } catch (error) {
            console.error('Validation error:', error);
            toast.error('Erro ao validar dados. Verifique o formato do arquivo.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleNext = () => {
        if (session) {
            // Update options if user changed their choice in JSON validation
            if (isJson) {
                options.updateExisting = updateExisting;
                options.skipDuplicates = !updateExisting;
            }
            onNext(session);
        }
    };

    const getMappedFieldLabel = (systemField: string): string => {
        return csvFields.find(f => f.value === systemField)?.label || systemField;
    };

    const exportErrorsToCSV = () => {
        // Prepare CSV headers
        const headers = [
            'Linha',
            'Número do Item',
            'Nome',
            'Campo com Erro',
            'Mensagem de Erro',
            'Categoria',
            'Unidade de Medida'
        ];

        // Prepare CSV rows
        const rows = validationErrors.map(error => [
            error.row,
            error.data?.item_number || error.data?.['Número do Item'] || '',
            error.data?.name || error.data?.['Nome'] || '',
            error.field || '',
            error.message || '',
            error.data?.category_name || error.data?.category || error.data?.['Categoria'] || '',
            error.data?.unit_of_measure || error.data?.['Unidade de Medida'] || ''
        ]);

        // Convert to CSV format
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma, newline, or quotes
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `erros_importacao_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Arquivo CSV exportado com sucesso!');
    };

    const displayedColumns = isCsv
        ? Object.values(mapping).filter(v => v && v !== '_ignore')
        : ['item_number', 'name', 'category_name', 'unit_of_measure'];

    return (
        <div className="space-y-6">
            {/* Validation Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Validação de Dados</CardTitle>
                    <CardDescription>
                        Verificando seus dados por erros e compatibilidade
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isValidating ? (
                        <>
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Validando dados...</span>
                            </div>
                            <Progress value={validationProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                                Processando {file.totalRows?.toLocaleString() || 'seus'} itens
                            </p>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="font-medium">Validação Concluída</span>
                            </div>

                            {validationErrors.length > 0 ? (
                                <>
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Encontrado {validationErrors.length} {validationErrors.length === 1 ? 'erro' : 'erros'} de validação.
                                            Corrija esses problemas antes de prosseguir.
                                        </AlertDescription>
                                    </Alert>

                                    {/* Error Summary by Field */}
                                    <div className="mt-4 space-y-2">
                                        <p className="text-sm font-medium">Resumo dos Erros:</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {Object.entries(
                                                validationErrors.reduce((acc, error) => {
                                                    const field = error.field || 'Desconhecido';
                                                    acc[field] = (acc[field] || 0) + 1;
                                                    return acc;
                                                }, {} as Record<string, number>)
                                            ).map(([field, count]) => (
                                                <div key={field} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                                                    <span className="text-muted-foreground">{field}:</span>
                                                    <span className="font-medium text-destructive">{count} {count === 1 ? 'item' : 'itens'}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Count of unique items with errors */}
                                        <div className="mt-2 text-sm text-muted-foreground">
                                            Total de itens com problemas: {
                                                new Set(validationErrors.map(e => e.row)).size
                                            } de {session?.totalItems || 0}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Alert className="border-green-200 bg-green-50">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800">
                                        Todos os dados validados com sucesso. Pronto para importar!
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Validation Errors */}
            {!isValidating && validationErrors.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Erros de Validação</CardTitle>
                                <CardDescription>
                                    Corrija esses problemas no arquivo de origem e tente novamente
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportErrorsToCSV}
                                className="ml-4"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Exportar CSV
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-20">Linha</TableHead>
                                        <TableHead>Número do Item</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Campo</TableHead>
                                        <TableHead>Erro</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Unidade</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {validationErrors.map((error, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-mono">{error.row}</TableCell>
                                            <TableCell className="font-mono">
                                                {error.data?.item_number || (error.data as any)?.['Número do Item'] || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {error.data?.name || (error.data as any)?.['Nome'] || '-'}
                                            </TableCell>
                                            <TableCell>{error.field}</TableCell>
                                            <TableCell className="text-destructive">{error.message}</TableCell>
                                            <TableCell>
                                                {error.data?.category_name || error.data?.category || (error.data as any)?.['Categoria'] || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {error.data?.unit_of_measure || (error.data as any)?.['Unidade de Medida'] || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Data Preview */}
            {!isValidating && allData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pré-visualização dos Dados</CardTitle>
                        <CardDescription>
                            Mostrando todos os {allData.length} itens que serão importados
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {displayedColumns.map((field) => (
                                            <TableHead key={field}>
                                                {getMappedFieldLabel(field)}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allData.map((row, index) => (
                                        <TableRow key={index}>
                                            {displayedColumns.map((field) => (
                                                <TableCell key={field}>
                                                    {String(row[field] || '')}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Import Summary */}
            {!isValidating && session && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resumo da Importação</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total de itens para importar:</span>
                                <span className="font-medium">{session.totalItems.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Modo de importação:</span>
                                <span className="font-medium">
                                    {options.updateExisting ? 'Atualizar itens existentes' : 'Pular itens existentes'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Duplicate Handling for JSON files */}
            {isJson && !isValidating && (
                <Card>
                    <CardHeader>
                        <CardTitle>Opções de Importação</CardTitle>
                        <CardDescription>
                            Configure como lidar com itens existentes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="update-existing"
                                checked={updateExisting}
                                onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="update-existing" className="font-medium cursor-pointer">
                                    Atualizar itens existentes
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Se um item com o mesmo número já existir, ele será atualizado com os novos dados.
                                    Todos os campos serão sobrescritos.
                                </p>
                            </div>
                        </div>

                        {!updateExisting && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Modo pular:</strong> Itens com números existentes serão pulados e não importados.
                                    Você verá um resumo dos itens pulados após a importação.
                                </AlertDescription>
                            </Alert>
                        )}

                        {updateExisting && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Aviso:</strong> Itens existentes serão completamente sobrescritos com os dados importados.
                                    Esta ação não pode ser desfeita. Certifique-se de ter um backup se necessário.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Existing Items for JSON files */}
            {isJson && !isValidating && updateExisting && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Itens Existentes que Serão Atualizados
                        </CardTitle>
                        <CardDescription>
                            {isLoadingExisting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Verificando itens existentes...
                                </span>
                            ) : existingItems.length > 0 ? (
                                `${existingItems.length} ${existingItems.length === 1 ? 'item existente será atualizado' : 'itens existentes serão atualizados'}`
                            ) : (
                                'Nenhum item existente será afetado por esta importação'
                            )}
                        </CardDescription>
                    </CardHeader>
                    {existingItems.length > 0 && (
                        <CardContent>
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Número do Item</TableHead>
                                            <TableHead>Nome Atual</TableHead>
                                            <TableHead>Categoria</TableHead>
                                            <TableHead>Unidade</TableHead>
                                            <TableHead>Capacidades</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Última Atualização</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {existingItems.map((item) => (
                                            <TableRow key={item.item_number}>
                                                <TableCell className="font-mono">{item.item_number}</TableCell>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.category_name || '-'}</TableCell>
                                                <TableCell>{item.unit_of_measure}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        {item.can_be_sold && (
                                                            <Badge variant="outline" className="text-xs">Vendível</Badge>
                                                        )}
                                                        {item.can_be_purchased && (
                                                            <Badge variant="outline" className="text-xs">Comprável</Badge>
                                                        )}
                                                        {item.can_be_manufactured && (
                                                            <Badge variant="outline" className="text-xs">Fabricável</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                                        {item.is_active ? 'Ativo' : 'Inativo'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(item.updated_at).toLocaleDateString('pt-BR')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack} disabled={isValidating}>
                    Voltar
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={isValidating || validationErrors.length > 0 || !session}
                    className="min-w-[120px]"
                >
                    Iniciar Importação
                </Button>
            </div>
        </div>
    );
}
