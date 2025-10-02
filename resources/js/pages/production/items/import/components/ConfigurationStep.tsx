import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, AlertCircle, FileText, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ImportFile, FieldMapping, ImportOptions, csvFields, findBestMatch } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

interface Props {
    files: ImportFile[];
    onNext: (mapping: FieldMapping, options: ImportOptions) => void;
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

export function ConfigurationStep({ files, onNext, onBack }: Props) {
    const file = files[0]; // Single file import
    const fileType = file.file.name.split('.').pop()?.toLowerCase();
    const isCsv = fileType === 'csv' || fileType === 'txt';

    const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
    const [updateExisting, setUpdateExisting] = useState(true);
    const [mappingValidated, setMappingValidated] = useState(false);
    const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
    const [isLoadingExisting, setIsLoadingExisting] = useState(false);
    const [showExistingItems, setShowExistingItems] = useState(false);

    // Auto-map CSV fields on mount
    useEffect(() => {
        if (isCsv && file.headers) {
            const mapping: FieldMapping = {};
            file.headers.forEach((header) => {
                const match = findBestMatch(header);
                if (match) {
                    mapping[header] = match;
                }
            });
            setFieldMapping(mapping);
        }
    }, [isCsv, file.headers]);

    // Validate mapping whenever it changes
    useEffect(() => {
        if (isCsv) {
            const requiredFields = csvFields.filter(f => f.required).map(f => f.value);
            const mappedValues = Object.values(fieldMapping).filter(v => v);
            const isValid = requiredFields.every(field => mappedValues.includes(field));
            setMappingValidated(isValid);
        } else {
            // JSON files don't need mapping
            setMappingValidated(true);
        }
    }, [fieldMapping, isCsv]);

    // Check for existing items when updateExisting changes (only for CSV files in configuration)
    useEffect(() => {
        if (updateExisting && file.data && file.data.length > 0 && isCsv) {
            checkExistingItems();
        } else {
            setExistingItems([]);
            setShowExistingItems(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateExisting, file.data, fieldMapping]); // Added fieldMapping dependency to recheck when mapping changes

    const checkExistingItems = async () => {
        setIsLoadingExisting(true);
        try {
            let itemNumbers: string[] = [];

            if (isCsv && file.data) {
                // For CSV, extract item numbers based on mapping
                const itemNumberField = Object.entries(fieldMapping).find(
                    ([_, systemField]) => systemField === 'item_number'
                )?.[0];

                if (itemNumberField) {
                    itemNumbers = file.data
                        .map(row => row[itemNumberField] as string)
                        .filter(Boolean);
                }
            } else if (!isCsv && file.data) {
                // For JSON, directly access item_number
                itemNumbers = file.data
                    .map(item => item.item_number as string)
                    .filter(Boolean);
            }

            if (itemNumbers.length > 0) {
                const response = await axios.post(route('production.items.import.check-existing'), {
                    item_numbers: itemNumbers,
                });

                setExistingItems(response.data.existing_items);
                setShowExistingItems(response.data.existing_items.length > 0);
            }
        } catch (error) {
            console.error('Error checking existing items:', error);
        } finally {
            setIsLoadingExisting(false);
        }
    };

    const handleMappingChange = (header: string, value: string) => {
        const newMapping = { ...fieldMapping };
        if (value === '_ignore') {
            delete newMapping[header];
        } else {
            newMapping[header] = value;
        }
        setFieldMapping(newMapping);
    };

    const handleNext = () => {
        const options: ImportOptions = {
            updateExisting,
            skipDuplicates: !updateExisting
        };
        onNext(fieldMapping, options);
    };

    const getMissingRequiredFields = () => {
        const requiredFields = csvFields.filter(f => f.required);
        const mappedValues = Object.values(fieldMapping);
        return requiredFields.filter(field => !mappedValues.includes(field.value));
    };

    return (
        <div className="space-y-6">
            {/* File Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Arquivo Selecionado
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Nome do arquivo:</span>
                            <span className="font-medium">{file.file.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Formato:</span>
                            <span className="font-medium uppercase">{fileType}</span>
                        </div>
                        {isCsv && file.totalRows && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total de linhas:</span>
                                <span className="font-medium">{file.totalRows.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* CSV Field Mapping */}
            {isCsv && file.headers && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5" />
                            Mapeamento de Campos
                        </CardTitle>
                        <CardDescription>
                            Mapeie as colunas do CSV para os campos do sistema. Campos obrigatórios são marcados com *
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {file.headers.map((header) => (
                                <div key={header} className="space-y-2">
                                    <Label className="text-sm font-medium">{header}</Label>
                                    <Select
                                        value={fieldMapping[header] || '_ignore'}
                                        onValueChange={(value) => handleMappingChange(header, value)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecione o campo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_ignore">
                                                <span className="text-muted-foreground">Ignorar esta coluna</span>
                                            </SelectItem>
                                            {csvFields.map((field) => (
                                                <SelectItem key={field.value} value={field.value}>
                                                    {field.label} {field.required && '*'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>

                        {/* Mapping Validation */}
                        {!mappingValidated && (
                            <Alert className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Campos obrigatórios ausentes:</strong>{' '}
                                    {getMissingRequiredFields().map(f => f.label).join(', ')}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}


            {/* Duplicate Handling */}
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

            {/* Existing Items to be Overwritten */}
            {updateExisting && (
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
                    {showExistingItems && existingItems.length > 0 && (
                        <CardContent>
                            <div className="overflow-x-auto">
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
                <Button variant="outline" onClick={onBack}>
                    Voltar
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={!mappingValidated}
                    className="min-w-[120px]"
                >
                    Próximo
                </Button>
            </div>
        </div>
    );
}
