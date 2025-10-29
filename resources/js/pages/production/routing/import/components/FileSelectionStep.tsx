import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Download, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ImportFile } from '../types';
import { formatBytes } from '@/utils/format';

interface Props {
    supportedFormats: string[];
    onNext: (files: ImportFile[]) => void;
}

export function FileSelectionStep({ supportedFormats, onNext }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [fileType, setFileType] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (file: File) => {
        const extension = file.name.split('.').pop()?.toLowerCase();

        // Accept .txt files as CSV
        const normalizedExtension = extension === 'txt' ? 'csv' : extension;

        if (!normalizedExtension || !supportedFormats.includes(normalizedExtension)) {
            toast.error(`Formato não suportado. Use: ${supportedFormats.join(', ')}`);
            return;
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Arquivo muito grande (máximo 10MB)');
            return;
        }

        setSelectedFile(file);
        setFileType(extension || '');
    }, [supportedFormats]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, [handleFileSelect]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleNext = async () => {
        if (!selectedFile || !fileType) return;

        setIsProcessing(true);
        try {
            const importFile: ImportFile = { file: selectedFile };

            // For CSV files, read and parse headers
            if (fileType === 'csv' || fileType === 'txt') {
                const text = await selectedFile.text();
                const lines = text.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    toast.error('Arquivo CSV vazio ou inválido');
                    setIsProcessing(false);
                    return;
                }

                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                const data: Record<string, unknown>[] = [];

                for (let i = 1; i < Math.min(lines.length, 11); i++) { // Preview first 10 rows
                    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                    const row: Record<string, unknown> = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });
                    data.push(row);
                }

                importFile.headers = headers;
                importFile.data = data;
                importFile.totalRows = lines.length - 1; // Exclude header row
            } else if (fileType === 'json') {
                // For JSON files, parse the data
                const text = await selectedFile.text();

                try {
                    const jsonData = JSON.parse(text);

                    // Support both exported format and array format
                    if (jsonData.templates && Array.isArray(jsonData.templates)) {
                        importFile.data = jsonData.templates;
                        importFile.totalRows = jsonData.templates.length;
                    } else if (Array.isArray(jsonData)) {
                        importFile.data = jsonData;
                        importFile.totalRows = jsonData.length;
                    } else {
                        toast.error('Formato JSON inválido. Esperado um array de templates ou objeto com propriedade "templates".');
                        setIsProcessing(false);
                        return;
                    }
                } catch (parseError) {
                    // JSON parsing failed - provide helpful error message
                    console.error('JSON parse error:', parseError);

                    // Try to extract line/column from error message
                    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
                    const positionMatch = errorMessage.match(/position (\d+)/);

                    if (positionMatch) {
                        const position = parseInt(positionMatch[1]);
                        const lines = text.substring(0, position).split('\n');
                        const line = lines.length;
                        const column = lines[lines.length - 1].length + 1;

                        toast.error(
                            `Erro de sintaxe no JSON na linha ${line}, coluna ${column}. ` +
                            'Verifique se o arquivo está bem formatado, com aspas duplas corretas, ' +
                            'vírgulas nos lugares certos e chaves/colchetes balanceados.'
                        );
                    } else {
                        toast.error(
                            'Arquivo JSON inválido. Verifique se o arquivo está bem formatado, ' +
                            'com aspas duplas corretas, vírgulas nos lugares certos e chaves/colchetes balanceados.'
                        );
                    }

                    setIsProcessing(false);
                    return;
                }
            }

            onNext([importFile]);
        } catch (error) {
            console.error('Error processing file:', error);
            toast.error('Erro ao processar arquivo. Tente novamente.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Selecionar Arquivo de Importação</CardTitle>
                    <CardDescription>
                        Faça upload de um arquivo CSV ou JSON contendo seus templates de rotas de produção
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={supportedFormats.map(f => `.${f}`).join(',') + ',.txt'}
                        onChange={handleInputChange}
                        className="hidden"
                        disabled={isProcessing}
                    />

                    {/* Drop Zone */}
                    {!selectedFile ? (
                        <div
                            className={cn(
                                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                                {
                                    'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800': !dragActive,
                                    'border-primary bg-primary/10 dark:bg-primary/20': dragActive,
                                }
                            )}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >

                            <Upload className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                Arraste o arquivo aqui
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                ou clique para selecionar
                            </p>
                            <Button variant="outline" className="mt-4">
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Escolher Arquivo
                            </Button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                                Formatos aceitos: {supportedFormats.map(f => f.toUpperCase()).join(', ')} • Máximo 10MB
                            </p>
                        </div>
                    ) : (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{selectedFile.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {formatBytes(selectedFile.size)} • {fileType.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setFileType('');
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                    }}
                                    disabled={isProcessing}
                                >
                                    Remover
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Template Downloads */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Modelos de Arquivo</p>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <a href="/templates/route-template-import.csv" download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar Modelo CSV
                                </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <a href="/templates/route-template-import.json" download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar Modelo JSON
                                </a>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end">
                <Button
                    onClick={handleNext}
                    disabled={!selectedFile || isProcessing}
                    className="min-w-[120px]"
                >
                    {isProcessing ? 'Processando...' : 'Próximo'}
                </Button>
            </div>
        </div>
    );
}
