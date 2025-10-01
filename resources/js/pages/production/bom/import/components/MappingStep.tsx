import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';
import { type CsvMapping, CSV_FIELDS } from '../types';

interface Props {
    headers: string[];
    data: Record<string, unknown>[];
    onNext: (mapping: CsvMapping) => void;
    onBack: () => void;
    initialMapping?: CsvMapping;
}

const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/\s+/g, '').trim();
};

const findBestMatch = (header: string): string => {
    const normalizedHeader = normalizeString(header);

    for (const field of CSV_FIELDS) {
        const normalizedFieldLabel = normalizeString(field.label);
        if (normalizedHeader === normalizedFieldLabel) {
            return field.value;
        }
    }

    // Additional matches for common variations
    if (normalizedHeader.includes('codigo') || normalizedHeader.includes('code')) return 'item_number';
    if (normalizedHeader.includes('nome') || normalizedHeader.includes('name')) return 'name';
    if (normalizedHeader.includes('quantidade') || normalizedHeader.includes('quantity')) return 'quantity';
    if (normalizedHeader.includes('unidade') || normalizedHeader.includes('unit')) return 'unit_of_measure';
    if (normalizedHeader.includes('nivel') || normalizedHeader.includes('level')) return 'level';
    if (normalizedHeader.includes('pai') || normalizedHeader.includes('parent')) return 'parent';

    return '';
};

export function MappingStep({ headers, data, onNext, onBack, initialMapping }: Props) {
    const [mapping, setMapping] = useState<CsvMapping>(() => {
        if (initialMapping && Object.keys(initialMapping).length > 0) {
            return initialMapping;
        }

        // Auto-map fields
        const autoMapping: CsvMapping = {};
        headers.forEach((header) => {
            const match = findBestMatch(header);
            if (match) {
                autoMapping[header] = match;
            }
        });
        return autoMapping;
    });

    const handleMappingChange = (header: string, value: string) => {
        setMapping(prev => {
            const newMapping = { ...prev };
            if (value === '') {
                delete newMapping[header];
            } else {
                newMapping[header] = value;
            }
            return newMapping;
        });
    };

    const isValid = () => {
        const requiredFields = CSV_FIELDS.filter(f => f.required).map(f => f.value);
        const mappedValues = Object.values(mapping);
        return requiredFields.every(field => mappedValues.includes(field));
    };

    const getMissingRequiredFields = () => {
        const requiredFields = CSV_FIELDS.filter(f => f.required);
        const mappedValues = Object.values(mapping);
        return requiredFields.filter(field => !mappedValues.includes(field.value));
    };

    const previewData = data.slice(0, 5);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowLeftRight className="h-5 w-5" />
                        Mapeamento de Campos
                    </CardTitle>
                    <CardDescription>
                        Associe as colunas do CSV aos campos do sistema. Campos marcados com * são obrigatórios.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {headers.map((header) => (
                            <div key={header} className="space-y-2">
                                <Label>{header}</Label>
                                <Select
                                    value={mapping[header] || ''}
                                    onValueChange={(value) => handleMappingChange(header, value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o campo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Ignorar este campo</SelectItem>
                                        {CSV_FIELDS.map((field) => (
                                            <SelectItem
                                                key={field.value}
                                                value={field.value}
                                                disabled={
                                                    Object.entries(mapping)
                                                        .some(([h, v]) => h !== header && v === field.value)
                                                }
                                            >
                                                {field.label} {field.required && '*'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Preview */}
            {previewData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pré-visualização</CardTitle>
                        <CardDescription>
                            Mostrando as primeiras {previewData.length} linhas com o mapeamento aplicado
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {headers.map((header) => (
                                            <TableHead key={header}>
                                                <div>
                                                    {header}
                                                    {mapping[header] && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            → {CSV_FIELDS.find(f => f.value === mapping[header])?.label}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.map((row, index) => (
                                        <TableRow key={index}>
                                            {headers.map((header) => (
                                                <TableCell
                                                    key={header}
                                                    className={!mapping[header] ? 'text-gray-400' : ''}
                                                >
                                                    {String(row[header] ?? '')}
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

            {/* Validation */}
            {!isValid() && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Campos obrigatórios não mapeados:</strong>{' '}
                        {getMissingRequiredFields().map(f => f.label).join(', ')}
                    </AlertDescription>
                </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                    Voltar
                </Button>
                <Button onClick={() => onNext(mapping)} disabled={!isValid()}>
                    Continuar
                </Button>
            </div>
        </div>
    );
}
