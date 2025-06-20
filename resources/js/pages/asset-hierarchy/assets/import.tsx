import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { ArrowLeftRight, Lightbulb, Upload, X } from 'lucide-react';
import * as React from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/asset-hierarchy/layout';

const importFields = [
    { value: 'tag', label: 'Tag' },
    { value: 'serial_number', label: 'Número de Série' },
    { value: 'part_number', label: 'Part Number' },
    { value: 'asset_type_id', label: 'Tipo de Ativo' },
    { value: 'description', label: 'Descrição' },
    { value: 'manufacturer', label: 'Fabricante' },
    { value: 'manufacturing_year', label: 'Ano de Fabricação' },
    { value: 'plant_id', label: 'Planta' },
    { value: 'area_id', label: 'Área' },
    { value: 'sector_id', label: 'Setor' },
];

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Importar Ativos',
        href: '/asset-hierarchy/assets/importar',
    },
];

// Função para normalizar string (remover espaços e converter para minúsculo)
const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/\s+/g, '').trim();
};

// Função para encontrar o melhor match entre uma string e uma lista de campos
const findBestMatch = (header: string, fields: typeof importFields): string => {
    const normalizedHeader = normalizeString(header);

    for (const field of fields) {
        const normalizedFieldLabel = normalizeString(field.label);
        if (normalizedHeader === normalizedFieldLabel) {
            return field.value;
        }
    }

    return '';
};

export default function ImportAsset() {
    const [processing, setProcessing] = React.useState(false);
    const [showProgress, setShowProgress] = React.useState(false);
    const [progressValue, setProgressValue] = React.useState(0);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [showErrorDialog, setShowErrorDialog] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [csvData, setCsvData] = React.useState<{
        headers: string[];
        data: Record<string, string | number | boolean>[];
        validationErrors: string[];
        progress: number;
        totalLines: number;
        processedLines: number;
    } | null>(null);
    const [showFormat, setShowFormat] = React.useState(true);
    const [showFormatInstructions, setShowFormatInstructions] = React.useState(true);
    const [showDuplicateTagsInfo, setShowDuplicateTagsInfo] = React.useState(true);
    const [fieldMapping, setFieldMapping] = React.useState<Record<string, string>>({});
    const [showInstructions, setShowInstructions] = React.useState(true);
    const [showTable, setShowTable] = React.useState(false);
    const [importing, setImporting] = React.useState(false);
    const [importErrors, setImportErrors] = React.useState<string[]>([]);
    const [showImportDialog, setShowImportDialog] = React.useState(false);
    const [showImportProgress, setShowImportProgress] = React.useState(false);
    const [importProgress, setImportProgress] = React.useState(0);
    const [importProgressInterval, setImportProgressInterval] = React.useState<NodeJS.Timeout | null>(null);
    const [importSuccess, setImportSuccess] = React.useState(false);
    const [importStats, setImportStats] = React.useState<{ imported: number; skipped: number } | null>(null);

    // Função para validar o mapeamento dos campos
    const isMappingValid = React.useCallback(() => {
        if (!csvData?.headers || !fieldMapping) return false;

        // Campos obrigatórios que devem estar mapeados
        const requiredFields = ['tag'];

        // Verifica se todos os campos obrigatórios estão mapeados
        const hasAllRequiredFields = requiredFields.every((field) => Object.values(fieldMapping).includes(field));

        // Verifica se há pelo menos uma coluna mapeada
        const hasAtLeastOneMapping = Object.values(fieldMapping).some((value) => value !== '');

        return hasAllRequiredFields && hasAtLeastOneMapping;
    }, [csvData?.headers, fieldMapping]);

    const handleStartMapping = () => {
        setShowProgress(false);
        setShowTable(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setSelectedFile(null);
            return;
        }

        // Validação do tamanho do arquivo (1MB = 1024 * 1024 bytes)
        const maxSize = 1024 * 1024; // 1MB
        if (file.size > maxSize) {
            setErrorMessage('O arquivo é muito grande. O tamanho máximo permitido é 1MB.');
            setShowErrorDialog(true);
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setShowProgress(true);
        setProgressValue(0);
        setProcessing(true);
        setShowTable(false);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axios.post(route('asset-hierarchy.assets.import.analyze'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Accept: 'application/json',
                },
            });

            setCsvData({
                headers: response.data.headers,
                data: response.data.data,
                validationErrors: response.data.validationErrors,
                progress: response.data.progress,
                totalLines: response.data.totalLines,
                processedLines: response.data.processedLines,
            });

            // Mapeamento automático dos campos
            const autoMapping: Record<string, string> = {};
            response.data.headers.forEach((header: string) => {
                const bestMatch = findBestMatch(header, importFields);
                if (bestMatch) {
                    autoMapping[header] = bestMatch;
                }
            });
            setFieldMapping(autoMapping);

            setShowFormat(false);
            setShowInstructions(true);
            setProgressValue(response.data.progress);
        } catch (error: unknown) {
            console.error('Erro ao processar arquivo:', error);
            setProgressValue(0);
            setShowProgress(false);

            // Extrai a mensagem de erro da resposta
            const errorMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao processar o arquivo CSV.';
            setErrorMessage(errorMessage);
            setShowErrorDialog(true);
        } finally {
            setProcessing(false);
        }
    };

    const handleFieldMappingChange = (csvHeader: string, fieldValue: string) => {
        setFieldMapping((prev) => ({
            ...prev,
            [csvHeader]: fieldValue === 'none' ? '' : fieldValue,
        }));
    };

    const handleImport = async () => {
        if (!csvData) return;

        // Primeiro, mostra o diálogo de progresso e inicia o monitoramento
        setShowImportProgress(true);
        setImportProgress(0);
        setImporting(true);
        setImportErrors([]);
        setImportSuccess(false);
        setImportStats(null);

        // Inicia o intervalo ANTES da importação
        const progressInterval = setInterval(async () => {
            try {
                const progressResponse = await axios.get(route('asset-hierarchy.assets.import.progress'));

                if (progressResponse.data.progress !== undefined) {
                    setImportProgress(progressResponse.data.progress);
                }

                if (!progressResponse.data.import_in_progress) {
                    clearInterval(progressInterval);
                }
            } catch (error) {
                console.error('Erro ao verificar progresso:', error);
            }
        }, 500);

        setImportProgressInterval(progressInterval);

        // Agora inicia a importação
        try {
            const response = await axios.post(route('asset-hierarchy.assets.import.data'), {
                data: csvData.data,
                mapping: fieldMapping,
            });

            if (response.data.success) {
                setImportSuccess(true);
                setImportStats({
                    imported: response.data.imported,
                    skipped: response.data.skipped,
                });
                setShowFormat(true);
                setCsvData(null);
                setFieldMapping({});
            }
        } catch (error: unknown) {
            const errorObj = error as { response?: { data?: { validationErrors?: string[] } } };
            if (errorObj.response?.data?.validationErrors) {
                setImportErrors(errorObj.response.data.validationErrors);
                setShowImportDialog(true);
            } else {
                setErrorMessage('Erro ao importar os dados. Por favor, tente novamente.');
                setShowErrorDialog(true);
            }
        } finally {
            clearInterval(progressInterval);
            setImportProgressInterval(null);
            setImporting(false);
        }
    };

    const handleCancelImport = async () => {
        try {
            // Limpa o intervalo
            if (importProgressInterval) {
                clearInterval(importProgressInterval);
                setImportProgressInterval(null);
            }

            // Envia requisição de cancelamento para o backend
            await axios.post(
                route('asset-hierarchy.assets.import.data'),
                {
                    data: csvData?.data,
                    mapping: fieldMapping,
                    cancel: true,
                },
                {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    withCredentials: true,
                },
            );

            // Limpa o estado local
            setShowFormat(true);
            setCsvData(null);
            setFieldMapping({});
            setImporting(false);
            setShowImportProgress(false);
        } catch (error) {
            console.error('Erro ao cancelar importação:', error);
            // Mesmo com erro, limpa o estado local
            setShowFormat(true);
            setCsvData(null);
            setFieldMapping({});
            setImporting(false);
            setShowImportProgress(false);
        }
    };

    const handleCloseImportDialog = () => {
        setShowImportProgress(false);
        setImportSuccess(false);
        setImportStats(null);
    };

    // Adiciona listener para fechamento da janela
    React.useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (importing) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        const handleUnload = () => {
            if (importing) {
                // Usa sendBeacon para garantir que a requisição seja enviada mesmo com a janela fechando
                const formData = new FormData();
                formData.append('data', JSON.stringify(csvData?.data || []));
                formData.append('mapping', JSON.stringify(fieldMapping || {}));
                formData.append('cancel', 'true');
                formData.append('X-Requested-With', 'XMLHttpRequest');

                navigator.sendBeacon(route('asset-hierarchy.assets.import.data'), formData);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('unload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('unload', handleUnload);
        };
    }, [importing, csvData, fieldMapping]);

    // Limpa o intervalo quando o componente é desmontado
    React.useEffect(() => {
        return () => {
            if (importProgressInterval) {
                clearInterval(importProgressInterval);
            }
        };
    }, [importProgressInterval]);

    // Adiciona um efeito para monitorar o estado de importação
    React.useEffect(() => {
        if (importing) {
            setShowImportProgress(true);
        }
    }, [importing, importProgress]);

    // Adiciona um efeito para monitorar mudanças no showImportProgress
    React.useEffect(() => {
        // Monitor progress dialog state changes
    }, [showImportProgress, importProgress]);

    React.useEffect(() => {
        if (showProgress && progressValue < 100) {
            const timer = setInterval(() => {
                setProgressValue((prev) => Math.min(prev + 10, 90));
            }, 500);

            return () => clearInterval(timer);
        }
    }, [showProgress, progressValue]);

    // Adiciona um efeito para monitorar mudanças no importProgress
    React.useEffect(() => {
        // Monitor import progress updates
    }, [importProgress]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar Ativos" />

            <CadastroLayout>
                <div className="space-y-8">
                    <div className="max-w-2xl">
                        <HeadingSmall title="Importar Ativos" description="Importe ativos através de um arquivo CSV" />

                        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="file">Arquivo CSV</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <Input
                                                id="file"
                                                type="file"
                                                accept=".csv"
                                                onChange={handleFileChange}
                                                className="flex-1 file:mr-4 file:px-2 file:text-sm file:font-semibold"
                                            />
                                        </div>
                                        <Button type="submit" disabled={processing || !selectedFile}>
                                            <Upload className="mr-2 h-4 w-4" />
                                            {processing ? 'Analisando...' : 'Analisar'}
                                        </Button>
                                    </div>
                                    {!selectedFile && (
                                        <p className="text-muted-foreground text-sm">Selecione um arquivo CSV para importação (máximo 1 MB)</p>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Diálogo de Erro */}
                    <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Erro de Validação</DialogTitle>
                                <DialogDescription>{errorMessage}</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button onClick={() => setShowErrorDialog(false)}>OK</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="w-full">
                        {showFormat ? (
                            <div className="max-w-2xl">
                                {showFormatInstructions && (
                                    <div className="bg-muted relative rounded-lg p-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="hover:bg-muted-foreground/20 absolute top-2 right-2 h-6 w-6"
                                            onClick={() => setShowFormatInstructions(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <div className="space-y-1 pr-8">
                                            <h3 className="text-base font-medium">Colunas esperadas no CSV</h3>
                                            <p className="text-muted-foreground text-sm">
                                                Seu arquivo CSV deve conter as colunas abaixo para uma importação bem-sucedida.
                                            </p>
                                            <div className="mt-4 grid grid-cols-3 gap-x-12 gap-y-1 font-mono text-sm">
                                                <div>Tag</div>
                                                <div>Número de Série</div>
                                                <div>Part Number</div>
                                                <div>Tipo de Ativo</div>
                                                <div>Descrição</div>
                                                <div>Fabricante</div>
                                                <div>Ano de Fabricação</div>
                                                <div>Planta</div>
                                                <div>Área</div>
                                                <div>Setor</div>
                                            </div>
                                            <div className="mt-4 flex items-center gap-1.5 text-sm">
                                                <Lightbulb className="text-muted-foreground h-4 w-4" />
                                                <span className="font-medium">
                                                    Use a funcionalidade de exportar para faciliar a criação do modelo do arquivo CSV.
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showDuplicateTagsInfo && (
                                    <div className="bg-muted relative mt-4 rounded-lg p-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="hover:bg-muted-foreground/20 absolute top-2 right-2 h-6 w-6"
                                            onClick={() => setShowDuplicateTagsInfo(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <div className="space-y-1 pr-8">
                                            <h3 className="text-base font-medium">Tags Duplicadas</h3>
                                            <p className="text-muted-foreground text-sm">
                                                Durante a importação, o sistema verifica automaticamente por tags duplicadas.
                                            </p>
                                            <div className="mt-4 space-y-2 text-sm">
                                                <p>• Tags que já existem na mesma combinação de planta/área/setor não serão importadas</p>
                                                <p>• A mesma tag pode existir em diferentes plantas, áreas ou setores</p>
                                                <p>• Tags duplicadas dentro do arquivo CSV serão consideradas apenas uma vez</p>
                                            </div>
                                            <div className="mt-4 flex items-center gap-1.5 text-sm">
                                                <Lightbulb className="text-muted-foreground h-4 w-4" />
                                                <span className="font-medium">
                                                    A importação mostrará ao final quantos tags foram pulados por duplicidade
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            showTable &&
                            csvData && (
                                <div className="space-y-8">
                                    <div className="max-w-2xl">
                                        {showInstructions && !csvData.validationErrors?.length && (
                                            <div className="bg-muted relative rounded-lg p-4">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="hover:bg-muted-foreground/20 absolute top-2 right-2 h-6 w-6"
                                                    onClick={() => setShowInstructions(false)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <div className="space-y-1 pr-8">
                                                    <h3 className="text-base font-medium">Correlacione os campos</h3>
                                                    <p className="text-muted-foreground text-sm">
                                                        Para cada coluna do seu arquivo CSV, selecione o campo correspondente do sistema. Se uma
                                                        coluna não deve ser importada, selecione "Não importar".
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {csvData.validationErrors && csvData.validationErrors.length > 0 && (
                                        <div className="max-w-2xl space-y-4 rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-200/10 dark:bg-red-700/10">
                                            <div className="relative space-y-0.5 text-red-600 dark:text-red-100">
                                                <p className="font-medium">Atenção</p>
                                                <p className="text-sm">Foram encontrados erros de validação no arquivo CSV.</p>
                                            </div>
                                            <ul className="list-inside list-disc space-y-1 text-sm text-red-600 dark:text-red-100">
                                                {csvData.validationErrors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                            <div className="relative space-y-0.5 text-red-600 dark:text-red-100">
                                                <p className="text-sm">Por favor, corrija os erros no arquivo CSV e tente a importação novamente.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {csvData.headers.map((header, index) => (
                                                        <TableHead key={index} className="bg-muted/50 dark:bg-muted/30 pt-2">
                                                            <div className="space-y-2">
                                                                <Select
                                                                    value={fieldMapping[header] || ''}
                                                                    onValueChange={(value) => handleFieldMappingChange(header, value)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Selecione o campo" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">Não importar</SelectItem>
                                                                        {importFields.map((field) => (
                                                                            <SelectItem key={field.value} value={field.value}>
                                                                                {field.label}
                                                                                {['tag'].includes(field.value) && (
                                                                                    <span className="ml-1 text-xs text-red-500">*</span>
                                                                                )}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <div className="mb-2 ml-3 font-bold">{header}</div>
                                                            </div>
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {csvData.data.map((row, rowIndex) => (
                                                    <TableRow key={rowIndex}>
                                                        {csvData.headers.map((header, colIndex) => (
                                                            <TableCell key={colIndex} className="ml-3">
                                                                <div className="ml-3">{row[header]}</div>
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {csvData.totalLines > 10 && (
                                            <div className="text-muted-foreground mt-2 text-sm">Mostrando 10 de {csvData.totalLines} linhas</div>
                                        )}
                                        {!isMappingValid() && (
                                            <div className="mt-4 text-sm text-yellow-600 dark:text-yellow-100">
                                                <p className="font-medium">Campos obrigatórios não mapeados:</p>
                                                <ul className="mt-1 list-inside list-disc">
                                                    {!Object.values(fieldMapping).includes('tag') && <li>Tag</li>}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="outline" asChild>
                        <Link href={route('asset-hierarchy.assets')}>Cancelar</Link>
                    </Button>
                    <Button onClick={() => handleImport()} disabled={importing || !isMappingValid() || !selectedFile}>
                        <Upload className="mr-2 h-4 w-4" />
                        {importing ? 'Importando...' : 'Importar'}
                    </Button>
                </div>

                {/* Diálogo de Erro de Importação */}
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Erros de Validação</DialogTitle>
                            <DialogDescription>
                                Foram encontrados erros de validação nos dados. Por favor, corrija-os antes de tentar importar novamente.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <ul className="list-inside list-disc space-y-1 text-sm text-red-600 dark:text-red-100">
                                {importErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>

                        <DialogFooter>
                            <Button onClick={() => setShowImportDialog(false)}>OK</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showProgress} onOpenChange={setShowProgress}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Analisando CSV</DialogTitle>
                            <DialogDescription>Processando arquivo para importação.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <div className="text-muted-foreground flex justify-between text-sm">
                                    <span>
                                        {progressValue === 100
                                            ? 'Análise concluída!'
                                            : `Processando linha ${csvData?.processedLines || 0} de ${csvData?.totalLines || 0}...`}
                                    </span>
                                    <span>{progressValue}%</span>
                                </div>
                                <Progress value={progressValue} className="w-full" />
                            </div>
                            {progressValue === 100 && (
                                <p className="text-muted-foreground text-left text-sm">
                                    O próximo passo é fazer a correlação entre os campos do seu CSV e os campos esperados pelo sistema.
                                </p>
                            )}
                        </div>

                        <DialogFooter className="justify-center pt-2 sm:justify-center">
                            {progressValue === 100 ? (
                                <Button onClick={handleStartMapping} className="w-fit">
                                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                                    Fazer correlacionamento
                                </Button>
                            ) : (
                                <Button disabled className="w-fit">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Analisando...
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Diálogo de Progresso da Importação */}
                <Dialog
                    open={showImportProgress}
                    onOpenChange={(open) => {
                        if (!open && importing && !importSuccess) {
                            handleCancelImport();
                        } else if (!open && importSuccess) {
                            handleCloseImportDialog();
                        }
                        setShowImportProgress(open);
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{importSuccess ? 'Importação Concluída' : 'Importando Ativos'}</DialogTitle>
                            <DialogDescription>
                                {importSuccess ? 'A importação foi concluída com sucesso!' : 'A importação está em andamento. Por favor, aguarde...'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {!importSuccess ? (
                                <div className="space-y-2">
                                    <div className="text-muted-foreground flex justify-between text-sm">
                                        <span>Progresso da importação</span>
                                        <span>{importProgress}%</span>
                                    </div>
                                    <Progress value={importProgress} className="w-full" />
                                </div>
                            ) : (
                                importStats && (
                                    <div className="space-y-2">
                                        <div className="text-muted-foreground text-sm">
                                            <p>Ativos importados: {importStats.imported}</p>
                                            <p>Ativos pulados: {importStats.skipped}</p>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>

                        <DialogFooter>
                            {importSuccess ? (
                                <Button onClick={handleCloseImportDialog}>Fechar</Button>
                            ) : (
                                <Button variant="destructive" onClick={handleCancelImport} disabled={importing}>
                                    Cancelar Importação
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CadastroLayout>
        </AppLayout>
    );
}
