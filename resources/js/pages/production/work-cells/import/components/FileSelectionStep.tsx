import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, X } from 'lucide-react';
import { ImportFile } from '../types';
import { cn } from '@/lib/utils';

interface Props {
    supportedFormats: string[];
    onNext: (files: ImportFile[]) => void;
}

export function FileSelectionStep({ supportedFormats, onNext }: Props) {
    const [selectedFiles, setSelectedFiles] = useState<ImportFile[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!extension || !supportedFormats.includes(extension)) {
            setError(`Formato de arquivo inválido. Formatos suportados: ${supportedFormats.join(', ')}`);
            return;
        }

        // Preview first few lines for CSV
        if (extension === 'csv') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim()).slice(0, 5);

                setSelectedFiles([{
                    file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    preview: lines
                }]);
            };
            reader.readAsText(file.slice(0, 1024)); // Read first 1KB for preview
        } else {
            setSelectedFiles([{
                file,
                name: file.name,
                size: file.size,
                type: file.type
            }]);
        }

        setError(null);
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    }, []);

    const removeFile = () => {
        setSelectedFiles([]);
        setError(null);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Selecione o arquivo para importação</CardTitle>
                    <CardDescription>
                        Escolha um arquivo CSV ou JSON contendo as células de trabalho que deseja importar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* File drop zone */}
                    <div
                        className={cn(
                            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                            isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-700',
                            'hover:border-primary hover:bg-primary/5'
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept={supportedFormats.map(f => `.${f}`).join(',')}
                            onChange={(e) => handleFileSelect(e.target.files)}
                        />

                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <label
                                htmlFor="file-upload"
                                className="font-medium text-primary hover:text-primary/80 cursor-pointer"
                            >
                                Clique para selecionar
                            </label>
                            {' '}ou arraste e solte o arquivo aqui
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Formatos suportados: {supportedFormats.join(', ').toUpperCase()}
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Selected file */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium">Arquivo selecionado:</h3>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <FileText className="h-8 w-8 text-gray-400" />
                                        <div>
                                            <p className="text-sm font-medium">{selectedFiles[0].name}</p>
                                            <p className="text-xs text-gray-500">
                                                {formatFileSize(selectedFiles[0].size)}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={removeFile}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Preview for CSV files */}
                                {selectedFiles[0].preview && (
                                    <div className="mt-4">
                                        <p className="text-xs font-medium text-gray-500 mb-2">Prévia do arquivo:</p>
                                        <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs font-mono overflow-x-auto">
                                            {selectedFiles[0].preview.map((line, index) => (
                                                <div key={index} className="whitespace-pre">
                                                    {line}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* File format templates */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Templates de arquivo
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                            Baixe um template para ver o formato esperado:
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open('/templates/work-cells-template.csv', '_blank')}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Template CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open('/templates/work-cells-template.json', '_blank')}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Template JSON
                            </Button>
                        </div>
                    </div>

                    {/* Next button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={() => onNext(selectedFiles)}
                            disabled={selectedFiles.length === 0}
                        >
                            Próximo
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
