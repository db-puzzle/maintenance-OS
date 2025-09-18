import React, { useState, useCallback } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeftRight, Upload, FileText, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
import { ItemCategory, WorkCell } from '@/types/production';

interface Props {
    categories: ItemCategory[];
    workCells: WorkCell[];
    supportedFormats: string[];
    csvHeaders: Record<string, string>;
}

// CSV field mappings
const csvFields = [
    { value: 'template_name', label: 'Template Name', required: true },
    { value: 'template_description', label: 'Template Description', required: false },
    { value: 'item_category_name', label: 'Category', required: false },
    { value: 'version', label: 'Version', required: false },
    { value: 'is_active', label: 'Is Active', required: false },
    { value: 'step_number', label: 'Step Number', required: true },
    { value: 'name', label: 'Step Name', required: true },
    { value: 'description', label: 'Step Description', required: false },
    { value: 'step_type', label: 'Step Type', required: false },
    { value: 'work_cell_name', label: 'Work Cell', required: false },
    { value: 'setup_time_minutes', label: 'Setup Time (Minutes)', required: false },
    { value: 'cycle_time_minutes', label: 'Cycle Time (Minutes)', required: false },
    { value: 'quality_check_mode', label: 'Quality Check Mode', required: false },
    { value: 'sampling_size', label: 'Sampling Size', required: false },
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
    if (normalizedHeader.includes('template') && normalizedHeader.includes('name')) return 'template_name';
    if (normalizedHeader.includes('template') && normalizedHeader.includes('desc')) return 'template_description';
    if (normalizedHeader.includes('category')) return 'item_category_name';
    if (normalizedHeader.includes('version')) return 'version';
    if (normalizedHeader.includes('active')) return 'is_active';
    if (normalizedHeader.includes('step') && normalizedHeader.includes('number')) return 'step_number';
    if (normalizedHeader.includes('step') && normalizedHeader.includes('name')) return 'name';
    if (normalizedHeader.includes('step') && normalizedHeader.includes('desc')) return 'description';
    if (normalizedHeader.includes('type')) return 'step_type';
    if (normalizedHeader.includes('work') && normalizedHeader.includes('cell')) return 'work_cell_name';
    if (normalizedHeader.includes('setup')) return 'setup_time_minutes';
    if (normalizedHeader.includes('cycle')) return 'cycle_time_minutes';
    if (normalizedHeader.includes('quality')) return 'quality_check_mode';
    if (normalizedHeader.includes('sampling')) return 'sampling_size';

    return '';
};

export default function RouteTemplateImport({ supportedFormats }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<string>('');
    const [csvData, setCsvData] = useState<{
        headers: string[];
        data: Record<string, unknown>[];
        totalRows: number;
    } | null>(null);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [showPreview, setShowPreview] = useState(false);
    const [updateExisting, setUpdateExisting] = useState(true); // Default to update existing

    const { setData, post, processing, errors } = useForm({
        file: null as File | null,
        mapping: {} as Record<string, string>,
        update_existing: true as boolean,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/home' },
        { title: 'Templates de Rotas de Produção', href: route('production.routing.index') },
        { title: 'Importar Templates', href: route('production.routing.import.wizard') },
    ];

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
    }, [selectedFile, fileType, csvData, fieldMapping]);

    const handleImport = () => {
        if (!selectedFile || !isMappingValid()) {
            return;
        }

        // Update the form data before submitting
        setData({
            file: selectedFile,
            mapping: fieldMapping,
            update_existing: updateExisting,
        });

        post(route('production.routing.import'), {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Templates importados com sucesso!');
            },
            onError: (errors) => {
                console.error('Import errors:', errors);
                const errorMessage = Object.values(errors).flat().join(', ') || 'Erro ao importar templates';
                toast.error(errorMessage);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar Templates de Rotas" />

            <div className="flex-1 overflow-y-auto">
                <div className="container max-w-6xl mx-auto py-8 space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold">Importar Templates de Rotas</h1>
                        <p className="text-muted-foreground mt-2">
                            Importe templates de rotas de produção de arquivos CSV ou JSON
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
                                    <input
                                        type="file"
                                        accept={supportedFormats.map(f => `.${f}`).join(',')}
                                        onChange={handleFileSelect}
                                        disabled={processing}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => document.getElementById('file-upload')?.click()}
                                        className="flex items-center gap-2"
                                        disabled={processing}
                                    >
                                        <Upload className="h-4 w-4" /> Escolher Arquivo
                                    </Button>

                                    {selectedFile && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <FileText className="h-4 w-4" />
                                            {selectedFile.name}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Duplicate Handling Options */}
                            {selectedFile && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Tratamento de Duplicatas</CardTitle>
                                        <CardDescription>
                                            Escolha como tratar templates com nomes existentes
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                id="update-existing"
                                                checked={updateExisting}
                                                onCheckedChange={(checked) => {
                                                    setUpdateExisting(checked as boolean);
                                                    setData('update_existing', checked as boolean);
                                                }}
                                            />
                                            <div className="space-y-1">
                                                <Label htmlFor="update-existing" className="font-medium cursor-pointer">
                                                    Atualizar templates existentes
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Se um template com o mesmo nome já existir, ele será atualizado com os novos dados.
                                                    Todos os campos serão sobrescritos.
                                                </p>
                                            </div>
                                        </div>

                                        {!updateExisting && (
                                            <Alert>
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    <strong>Modo de ignorar:</strong> Templates com nomes existentes serão ignorados e não importados.
                                                    Você verá um resumo dos templates ignorados após a importação.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {updateExisting && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    <strong>Aviso:</strong> Templates existentes serão completamente sobrescritos com os dados importados.
                                                    Esta ação não pode ser desfeita. Certifique-se de ter um backup se necessário.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* CSV Field Mapping */}
                            {csvData && showPreview && fileType === 'csv' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <ArrowLeftRight className="h-5 w-5" />
                                            Mapeamento de Campos
                                        </CardTitle>
                                        <CardDescription>
                                            Mapeie as colunas do CSV para os campos do sistema
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {csvData.headers.map((header) => (
                                                <div key={header} className="space-y-2">
                                                    <Label>{header}</Label>
                                                    <Select
                                                        value={fieldMapping[header] || '_ignore'}
                                                        onValueChange={(value) => {
                                                            const newMapping = { ...fieldMapping };
                                                            if (value === '_ignore') {
                                                                delete newMapping[header];
                                                            } else {
                                                                newMapping[header] = value;
                                                            }
                                                            setFieldMapping(newMapping);
                                                            setData('mapping', newMapping);
                                                        }}
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
                                            Mostrando as primeiras 10 linhas de {csvData.totalRows} no total
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
                            {(errors.file || errors.mapping) && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {errors.file && <div>{errors.file}</div>}
                                        {errors.mapping && <div>{errors.mapping}</div>}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Validation Message */}
                            {selectedFile && !isMappingValid() && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {fileType === 'csv' && !csvData && 'Processando arquivo CSV...'}
                                        {fileType === 'csv' && csvData && (
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
                            <div className="flex items-center justify-end gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => router.visit(route('production.routing.index'))}
                                    disabled={processing}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={!isMappingValid() || processing}
                                    title={!isMappingValid() ? 'Por favor, preencha todos os campos obrigatórios' : ''}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {processing ? 'Importando...' : 'Importar Templates'}
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
                                                        {field.value === 'template_name' && 'Nome do template de rota'}
                                                        {field.value === 'template_description' && 'Descrição do template'}
                                                        {field.value === 'item_category_name' && 'Nome da categoria (será criada se não existir)'}
                                                        {field.value === 'version' && 'Versão do template'}
                                                        {field.value === 'is_active' && 'Se o template está ativo (Sim/Não)'}
                                                        {field.value === 'step_number' && 'Número sequencial da etapa'}
                                                        {field.value === 'name' && 'Nome da etapa'}
                                                        {field.value === 'description' && 'Descrição da etapa'}
                                                        {field.value === 'step_type' && 'Tipo da etapa (standard/quality_check/rework)'}
                                                        {field.value === 'work_cell_name' && 'Nome da célula de trabalho'}
                                                        {field.value === 'setup_time_minutes' && 'Tempo de setup em minutos'}
                                                        {field.value === 'cycle_time_minutes' && 'Tempo de ciclo em minutos'}
                                                        {field.value === 'quality_check_mode' && 'Modo de verificação de qualidade'}
                                                        {field.value === 'sampling_size' && 'Tamanho da amostragem'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {field.required ? (
                                                            <span className="text-destructive">Sim</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">Não</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-mono">
                                                        {field.value === 'template_name' && 'Rota Padrão Produto A'}
                                                        {field.value === 'template_description' && 'Rota para fabricação do Produto A'}
                                                        {field.value === 'item_category_name' && 'Eletrônicos'}
                                                        {field.value === 'version' && '1'}
                                                        {field.value === 'is_active' && 'Sim'}
                                                        {field.value === 'step_number' && '1'}
                                                        {field.value === 'name' && 'Preparação'}
                                                        {field.value === 'description' && 'Preparar materiais'}
                                                        {field.value === 'step_type' && 'standard'}
                                                        {field.value === 'work_cell_name' && 'Célula 1'}
                                                        {field.value === 'setup_time_minutes' && '30'}
                                                        {field.value === 'cycle_time_minutes' && '5'}
                                                        {field.value === 'quality_check_mode' && 'every_part'}
                                                        {field.value === 'sampling_size' && '10'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Importante:</strong> Células de trabalho que não existirem serão criadas automaticamente
                                            com capacidade infinita e configurações padrão. Você será notificado sobre quais células foram
                                            criadas para que possa configurá-las adequadamente.
                                        </AlertDescription>
                                    </Alert>

                                    <Button variant="outline" asChild>
                                        <a href="/templates/route-template-import.csv" download>
                                            <Download className="h-4 w-4 mr-2" />
                                            Baixar Template CSV
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
                                        O sistema aceita formato JSON de exportações do sistema:
                                    </p>
                                    <div>
                                        <h4 className="font-medium mb-2">Formato Nativo (Exportação do Sistema)</h4>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Este é o formato gerado quando você exporta templates do sistema. Pode ser reimportado diretamente.
                                        </p>
                                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                                            {`{
  "exported_at": "2024-01-15T10:30:00Z",
  "exported_by": "Nome do Usuário",
  "total_templates": 1,
  "templates": [
    {
      "name": "Rota Padrão Produto A",
      "description": "Rota para fabricação do Produto A",
      "item_category_name": "Eletrônicos",
      "version": 1,
      "is_active": true,
      "steps": [
        {
          "step_number": 1,
          "name": "Preparação",
          "description": "Preparar materiais",
          "step_type": "standard",
          "work_cell_name": "Célula 1",
          "setup_time_minutes": 30,
          "cycle_time_minutes": 5,
          "quality_check_mode": "every_part"
        }
      ]
    }
  ]
}`}
                                        </pre>
                                    </div>

                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Importante:</strong> Categorias e células de trabalho serão criadas automaticamente se não existirem.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
