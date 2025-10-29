import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ImportFile, FieldMapping, ImportOptions, csvFields, findBestMatch } from '../types';

interface Props {
    files: ImportFile[];
    onNext: (mapping: FieldMapping, options: ImportOptions) => void;
    onBack: () => void;
}

export function ConfigurationStep({ files, onNext, onBack }: Props) {
    const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
    const [importOptions, setImportOptions] = useState<ImportOptions>({
        updateExisting: true,
        skipDuplicates: false,
    });

    const file = files[0];
    const fileType = file.file.name.split('.').pop()?.toLowerCase();
    const isJson = fileType === 'json';

    useEffect(() => {
        // Auto-map fields for CSV files
        if (!isJson && file.headers) {
            const mapping: FieldMapping = {};
            file.headers.forEach((header) => {
                const match = findBestMatch(header);
                if (match) {
                    mapping[header] = match;
                }
            });
            setFieldMapping(mapping);
        }
    }, [file.headers, isJson]);

    const handleFieldChange = (header: string, value: string) => {
        const newMapping = { ...fieldMapping };
        if (value === '_ignore') {
            delete newMapping[header];
        } else {
            // Check if this field is already mapped elsewhere
            Object.keys(newMapping).forEach((key) => {
                if (newMapping[key] === value && key !== header) {
                    delete newMapping[key];
                }
            });
            newMapping[header] = value;
        }
        setFieldMapping(newMapping);
    };

    const isValidMapping = (): boolean => {
        if (isJson) return true; // JSON files don't need mapping

        const requiredFields = csvFields.filter(f => f.required).map(f => f.value);
        const mappedValues = Object.values(fieldMapping);
        return requiredFields.every(field => mappedValues.includes(field));
    };

    const getMappedFieldLabel = (value: string): string => {
        const field = csvFields.find(f => f.value === value);
        return field ? field.label : value;
    };

    const _getUnmappedFields = (): string[] => {
        const mappedValues = Object.values(fieldMapping);
        return csvFields
            .filter(f => !mappedValues.includes(f.value))
            .map(f => f.value);
    };

    const handleNext = () => {
        if (isValidMapping()) {
            onNext(fieldMapping, importOptions);
        }
    };

    // For JSON files, skip directly to next step
    if (isJson) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Configuração de Importação</CardTitle>
                        <CardDescription>
                            Arquivos JSON não requerem mapeamento de campos
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                O arquivo JSON será importado usando a estrutura de dados nativa do sistema.
                                Todos os campos serão mapeados automaticamente.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="update-existing"
                                    checked={importOptions.updateExisting}
                                    onCheckedChange={(checked) =>
                                        setImportOptions({ ...importOptions, updateExisting: checked as boolean })
                                    }
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="update-existing" className="font-medium cursor-pointer">
                                        Atualizar templates existentes
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Se um template com o mesmo nome já existir, ele será atualizado com os novos dados.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="skip-duplicates"
                                    checked={importOptions.skipDuplicates}
                                    onCheckedChange={(checked) =>
                                        setImportOptions({ ...importOptions, skipDuplicates: checked as boolean })
                                    }
                                    disabled={importOptions.updateExisting}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="skip-duplicates" className="font-medium cursor-pointer">
                                        Ignorar duplicados
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Templates com nomes duplicados serão ignorados em vez de gerar erro.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-between">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                    <Button onClick={handleNext}>
                        Próximo
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    }

    // CSV Configuration
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Mapeamento de Campos</CardTitle>
                    <CardDescription>
                        Mapeie as colunas do CSV para os campos do sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {file.headers?.map((header) => (
                            <div key={header} className="space-y-2">
                                <Label>{header}</Label>
                                <Select
                                    value={fieldMapping[header] || '_ignore'}
                                    onValueChange={(value) => handleFieldChange(header, value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecionar campo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_ignore">Ignorar</SelectItem>
                                        {csvFields.map((field) => (
                                            <SelectItem key={field.value} value={field.value}>
                                                {field.label} {field.required && '*'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {file.data && file.data.length > 0 && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        Ex: {file.data[0][header] as string || '(vazio)'}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {!isValidMapping() && (
                        <Alert className="mt-4" variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Campos obrigatórios não mapeados: {csvFields
                                    .filter(f => f.required)
                                    .filter(f => !Object.values(fieldMapping).includes(f.value))
                                    .map(f => f.label)
                                    .join(', ')}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Import Options */}
            <Card>
                <CardHeader>
                    <CardTitle>Opções de Importação</CardTitle>
                    <CardDescription>
                        Configure como lidar com templates existentes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="update-existing"
                            checked={importOptions.updateExisting}
                            onCheckedChange={(checked) =>
                                setImportOptions({ ...importOptions, updateExisting: checked as boolean })
                            }
                        />
                        <div className="space-y-1">
                            <Label htmlFor="update-existing" className="font-medium cursor-pointer">
                                Atualizar templates existentes
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Se um template com o mesmo nome já existir, ele será atualizado com os novos dados.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="skip-duplicates"
                            checked={importOptions.skipDuplicates}
                            onCheckedChange={(checked) =>
                                setImportOptions({ ...importOptions, skipDuplicates: checked as boolean })
                            }
                            disabled={importOptions.updateExisting}
                        />
                        <div className="space-y-1">
                            <Label htmlFor="skip-duplicates" className="font-medium cursor-pointer">
                                Ignorar duplicados
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Templates com nomes duplicados serão ignorados em vez de gerar erro.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Preview */}
            {file.data && file.data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pré-visualização dos Dados</CardTitle>
                        <CardDescription>
                            Mostrando as primeiras {Math.min(5, file.data.length)} linhas com mapeamento aplicado
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {Object.values(fieldMapping).map((field) => (
                                            <TableHead key={field}>
                                                {getMappedFieldLabel(field)}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {file.data.slice(0, 5).map((row, index) => (
                                        <TableRow key={index}>
                                            {Object.entries(fieldMapping).map(([header, field]) => (
                                                <TableCell key={field}>
                                                    {row[header] as React.ReactNode || '-'}
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

            {/* Action Buttons */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={!isValidMapping()}
                >
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
