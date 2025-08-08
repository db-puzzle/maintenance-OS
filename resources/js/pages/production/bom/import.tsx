import React, { useState, useCallback } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeftRight, Upload, FileText, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
interface Props {
    supportedFormats: string[];
    csvHeaders: Record<string, string>;
}
// CSV field mappings
const csvFields = [
    { value: 'item_number', label: 'Código do Item', required: true },
    { value: 'name', label: 'Nome/Descrição', required: true },
    { value: 'quantity', label: 'Quantidade', required: true },
    { value: 'unit_of_measure', label: 'Unidade de Medida', required: true },
    { value: 'level', label: 'Nível', required: false },
    { value: 'parent', label: 'Item Pai', required: false },
    { value: 'description', label: 'Descrição Detalhada', required: false },
    { value: 'reference_designators', label: 'Designadores de Referência', required: false },
];
const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/\s+/g, '').trim();
};
const findBestMatch = (header: string, fields: typeof csvFields): string => {
    const normalizedHeader = normalizeString(header);
    for (const field of fields) {
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
export default function BomImport({ supportedFormats }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<string>('');
    const [csvData, setCsvData] = useState<{
        headers: string[];
        data: Record<string, unknown>[];
        totalRows: number;
    } | null>(null);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [showPreview, setShowPreview] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        file: null as File | null,
        mapping: {},
        bom_info: JSON.stringify({
            name: '',
            description: '',
            external_reference: '',
        }),
    });
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/home' },
        { title: 'BOMs', href: route('production.bom.index') },
        { title: 'Importar BOM', href: route('production.bom.import.wizard') },
    ];
    // Get BOM info from form data
    const bomInfo = React.useMemo(() => {
        try {
            return JSON.parse(data.bom_info);
        } catch {
            return { name: '', description: '', external_reference: '' };
        }
    }, [data.bom_info]);
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!supportedFormats.includes(extension || '')) {
            toast.error(`Formato não suportado. Use: ${supportedFormats.join(', ')}`);
            return;
        }
        setSelectedFile(file);
        setFileType(extension || '');
        setData('file', file);
        if (extension === 'csv' || extension === 'txt') {
            await processCsvFile(file);
        }
    };
    const processCsvFile = async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                toast.error('Arquivo CSV vazio ou inválido');
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const data: Record<string, unknown>[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const row: Record<string, unknown> = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
            setCsvData({ headers, data, totalRows: data.length });
            // Auto-map fields
            const mapping: Record<string, string> = {};
            headers.forEach((header) => {
                const match = findBestMatch(header, csvFields);
                if (match) {
                    mapping[header] = match;
                }
            });
            setFieldMapping(mapping);
            setData('mapping', mapping);
            setShowPreview(true);
        };
        reader.readAsText(file);
    };
    const isMappingValid = useCallback(() => {
        // Must have a file
        if (!selectedFile) return false;
        // Must have a BOM name
        if (!bomInfo.name || bomInfo.name.trim() === '') return false;
        // For JSON files, that's all we need
        if (fileType === 'json') {
            return true;
        }
        // For CSV files, we need proper field mapping
        if (fileType === 'csv' || fileType === 'txt') {
            if (!csvData || !fieldMapping) return false;
            const requiredFields = csvFields.filter(f => f.required).map(f => f.value);
            const mappedValues = Object.values(fieldMapping).filter(v => v);
            return requiredFields.every(field => mappedValues.includes(field));
        }
        return false;
    }, [selectedFile, fileType, csvData, fieldMapping, bomInfo.name]);
    const handleImport = () => {
        if (!selectedFile || !isMappingValid()) {
            console.log('Validation failed:', {
                selectedFile: !!selectedFile,
                fileType,
                bomInfo,
                isMappingValid: isMappingValid()
            });
            return;
        }
        // Update the form data before submitting
        setData(prevData => ({
            ...prevData,
            file: selectedFile,
            mapping: fieldMapping,
            bom_info: JSON.stringify(bomInfo)
        }));
        post(route('production.bom.import'), {
            forceFormData: true,
            onSuccess: () => {
                toast.success('BOM importada com sucesso!');
            },
            onError: (errors) => {
                console.error('Import errors:', errors);
                const errorMessage = Object.values(errors).flat().join(', ') || 'Erro ao importar BOM';
                toast.error(errorMessage);
            }
        });
    };
    const updateBomInfo = (field: string, value: string) => {
        const currentInfo = JSON.parse(data.bom_info);
        currentInfo[field] = value;
        setData('bom_info', JSON.stringify(currentInfo));
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar BOM" />
            <div className="container max-w-6xl mx-auto py-8 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Importar BOM</h1>
                    <p className="text-muted-foreground mt-2">
                        Importe estruturas de produtos a partir de arquivos CSV ou JSON
                    </p>
                </div>
                <Tabs defaultValue="upload" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="upload">Upload de Arquivo</TabsTrigger>
                        <TabsTrigger value="instructions">Instruções</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="space-y-6">
                        {/* File Upload */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Selecionar Arquivo</CardTitle>
                                <CardDescription>
                                    Formatos suportados: {supportedFormats.join(', ')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept={supportedFormats.map(f => `.${f}`).join(',')}
                                        onChange={handleFileSelect}
                                        disabled={processing}
                                    />
                                    {selectedFile && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <FileText className="h-4 w-4" />
                                            {selectedFile.name}
                                        </div>
                                    )}
                                </div>
                                {/* BOM Information */}
                                {selectedFile && (
                                    <div className="grid gap-4 pt-4 border-t">
                                        <h3 className="font-medium">Informações da BOM</h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="bom-name">Nome da BOM *</Label>
                                                <Input
                                                    id="bom-name"
                                                    value={bomInfo.name}
                                                    onChange={(e) => updateBomInfo('name', e.target.value)}
                                                    placeholder="Ex: BOM Produto XYZ"
                                                    required
                                                />
                                                {!bomInfo.name && (
                                                    <p className="text-xs text-destructive">Campo obrigatório</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="external-ref">Referência Externa</Label>
                                                <Input
                                                    id="external-ref"
                                                    value={bomInfo.external_reference}
                                                    onChange={(e) => updateBomInfo('external_reference', e.target.value)}
                                                    placeholder="Ex: DWG-001"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Descrição</Label>
                                            <Input
                                                id="description"
                                                value={bomInfo.description}
                                                onChange={(e) => updateBomInfo('description', e.target.value)}
                                                placeholder="Descrição da BOM"
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {/* CSV Field Mapping */}
                        {csvData && showPreview && fileType === 'csv' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ArrowLeftRight className="h-5 w-5" />
                                        Mapeamento de Campos
                                    </CardTitle>
                                    <CardDescription>
                                        Associe as colunas do CSV aos campos do sistema
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {csvData.headers.map((header) => (
                                            <div key={header} className="space-y-2">
                                                <Label>{header}</Label>
                                                <Select
                                                    value={fieldMapping[header] || ''}
                                                    onValueChange={(value) => {
                                                        const newMapping = { ...fieldMapping, [header]: value };
                                                        setFieldMapping(newMapping);
                                                        setData('mapping', newMapping);
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o campo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="">Ignorar</SelectItem>
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
                                </CardContent>
                            </Card>
                        )}
                        {/* Data Preview */}
                        {csvData && showPreview && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Pré-visualização dos Dados</CardTitle>
                                    <CardDescription>
                                        Mostrando as primeiras 10 linhas de {csvData.totalRows} total
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {csvData.headers.map((header) => (
                                                        <TableHead key={header}>
                                                            {header}
                                                            {fieldMapping[header] && (
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    → {csvFields.find(f => f.value === fieldMapping[header])?.label}
                                                                </div>
                                                            )}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {csvData.data.slice(0, 10).map((row, index) => (
                                                    <TableRow key={index}>
                                                        {csvData.headers.map((header) => (
                                                            <TableCell key={header}>
                                                                {row[header] as React.ReactNode}
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
                        {/* Import Progress */}
                        {processing && (
                            <Card>
                                <CardContent className="py-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Importando...</span>
                                        </div>
                                        <Progress value={50} className="animate-pulse" />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {/* Import Errors */}
                        {(errors.file || errors.mapping || errors.bom_info) && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {errors.file && <div>{errors.file}</div>}
                                    {errors.mapping && <div>{errors.mapping}</div>}
                                    {errors.bom_info && <div>{errors.bom_info}</div>}
                                </AlertDescription>
                            </Alert>
                        )}
                        {/* Validation Message */}
                        {selectedFile && !isMappingValid() && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {!bomInfo.name.trim() && 'Por favor, informe o nome da BOM.'}
                                    {bomInfo.name.trim() && fileType === 'csv' && !csvData && 'Processando arquivo CSV...'}
                                    {bomInfo.name.trim() && fileType === 'csv' && csvData && (
                                        <>
                                            Campos obrigatórios não mapeados:
                                            {csvFields
                                                .filter(f => f.required)
                                                .filter(f => !Object.values(fieldMapping).includes(f.value))
                                                .map(f => f.label)
                                                .join(', ')}
                                        </>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}
                        {/* Action Buttons */}
                        <div className="flex justify-end gap-4">
                            <Button
                                variant="outline"
                                onClick={() => router.visit(route('production.bom.index'))}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={!isMappingValid() || processing}
                                title={!isMappingValid() ? 'Preencha todos os campos obrigatórios' : ''}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {processing ? 'Importando...' : 'Importar BOM'}
                            </Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="instructions" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Formato CSV</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    O arquivo CSV deve conter as seguintes colunas:
                                </p>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Campo</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Obrigatório</TableHead>
                                            <TableHead>Exemplo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {csvFields.map((field) => (
                                            <TableRow key={field.value}>
                                                <TableCell className="font-medium">{field.label}</TableCell>
                                                <TableCell className="text-sm">
                                                    {field.value === 'item_number' && 'Código único do item'}
                                                    {field.value === 'name' && 'Nome ou descrição do item'}
                                                    {field.value === 'quantity' && 'Quantidade necessária'}
                                                    {field.value === 'unit_of_measure' && 'Unidade de medida (UN, KG, M, etc)'}
                                                    {field.value === 'level' && 'Nível na hierarquia (0, 1, 2, ...)'}
                                                    {field.value === 'parent' && 'Código do item pai na estrutura'}
                                                </TableCell>
                                                <TableCell>
                                                    {field.required ? (
                                                        <span className="text-destructive">Sim</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">Não</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm font-mono">
                                                    {field.value === 'item_number' && 'ITEM-001'}
                                                    {field.value === 'name' && 'Parafuso M8x20'}
                                                    {field.value === 'quantity' && '10'}
                                                    {field.value === 'unit_of_measure' && 'UN'}
                                                    {field.value === 'level' && '1'}
                                                    {field.value === 'parent' && 'ITEM-000'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Dica:</strong> Você pode baixar um modelo de CSV de exemplo para facilitar o preenchimento.
                                    </AlertDescription>
                                </Alert>
                                <Button variant="outline" asChild>
                                    <a href="/templates/bom-import-template.csv" download>
                                        <Download className="h-4 w-4 mr-2" />
                                        Baixar Modelo CSV
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Formato JSON</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    O sistema aceita dois formatos JSON:
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium mb-2">1. Formato Nativo (Exportado pelo Sistema)</h4>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Este é o formato gerado quando você exporta uma BOM do sistema. Pode ser reimportado diretamente.
                                        </p>
                                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                                            {`{
  "bom_number": "BOM-001",
  "name": "Nome da BOM",
  "description": "Descrição",
  "external_reference": "DWG-001",
  "items": [
    {
      "level": 0,
      "item_number": "PROD-001",
      "item_name": "Produto Final",
      "quantity": 1,
      "unit_of_measure": "UN",
      "children": [
        {
          "level": 1,
          "item_number": "COMP-001",
          "item_name": "Componente A",
          "quantity": 2,
          "unit_of_measure": "UN"
        }
      ]
    }
  ]
}`}
                                        </pre>
                                    </div>
                                    <div>
                                        <h4 className="font-medium mb-2">2. Formato Inventor</h4>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Para importar do Autodesk Inventor:
                                        </p>
                                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                                            {`{
  "name": "Nome da BOM",
  "items": [
    {
      "item_number": "ITEM-001",
      "name": "Produto Final",
      "quantity": 1,
      "unit": "UN",
      "level": 0
    }
  ]
}`}
                                        </pre>
                                    </div>
                                </div>
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Importante:</strong> Todos os itens referenciados devem existir no sistema antes da importação.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}