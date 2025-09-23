import React, { useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImportFile } from '../types';
import { formatBytes } from '@/utils/format';
import { SimpleFileGrid } from './SimpleFileGrid';

interface Props {
    acceptedExtensions: string[];
    maxFileSize: number; // MB
    maxTotalSize: number; // MB
    onNext: (files: ImportFile[]) => void;
}

export function FileSelectionStep({
    acceptedExtensions,
    maxFileSize,
    maxTotalSize,
    onNext,
}: Props) {
    const [selectedFiles, setSelectedFiles] = useState<ImportFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(async (fileList: FileList) => {
        setIsProcessing(true);
        const newErrors: string[] = [];
        const allowedExt = new Set(acceptedExtensions.map(e => e.toLowerCase()));

        // First, process files without previews for faster initial display
        const filesArray = Array.from(fileList);
        const initialFiles = filesArray.map((file) => {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const fileObj: ImportFile = {
                file,
                filename: file.name,
                size: file.size,
                type: file.type,
                valid: true,
                errors: [],
                itemCode: null,
                itemExists: false,
                itemName: null,
                hasExistingImage: false,
            };

            // Validate extension
            if (!allowedExt.has(ext)) {
                fileObj.valid = false;
                fileObj.errors.push(`Tipo de arquivo não suportado: .${ext}`);
            }

            // Validate size
            if (file.size > maxFileSize * 1024 * 1024) {
                fileObj.valid = false;
                fileObj.errors.push(`Arquivo muito grande (máx. ${maxFileSize}MB)`);
            }

            return fileObj;
        });

        // Add files immediately without previews
        setSelectedFiles(prev => {
            // Check total size with previous files
            const totalSize = [...prev, ...initialFiles].reduce((sum, f) => sum + f.size, 0);
            if (totalSize > maxTotalSize * 1024 * 1024) {
                newErrors.push(`Tamanho total excede o limite de ${maxTotalSize}MB`);
            }
            return [...prev, ...initialFiles];
        });
        setErrors(newErrors);

        // Generate previews in batches to avoid blocking
        const batchSize = 10;
        for (let i = 0; i < initialFiles.length; i += batchSize) {
            const batch = initialFiles.slice(i, i + batchSize);
            const batchStart = i;

            const previews = await Promise.all(batch.map(async (fileObj) => {
                if (fileObj.valid && fileObj.file.type.startsWith('image/')) {
                    try {
                        const preview = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target?.result as string);
                            reader.onerror = () => resolve('');
                            reader.readAsDataURL(fileObj.file);
                        });
                        return preview;
                    } catch (error) {
                        console.error('Error generating preview:', error);
                        return undefined;
                    }
                }
                return undefined;
            }));

            // Update files with previews
            setSelectedFiles(prev => {
                const updated = [...prev];
                previews.forEach((preview, index) => {
                    const fileIndex = batchStart + index;
                    if (preview && updated[fileIndex]) {
                        updated[fileIndex] = { ...updated[fileIndex], preview };
                    }
                });
                return updated;
            });
        }

        setIsProcessing(false);
    }, [acceptedExtensions, maxFileSize, maxTotalSize]);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await handleFiles(e.dataTransfer.files);
        }
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await handleFiles(e.target.files);
        }
    }, [handleFiles]);

    const removeFile = useCallback((filename: string) => {
        setSelectedFiles(prev => prev.filter(f => f.filename !== filename));
    }, []);

    const clearAll = useCallback(() => {
        setSelectedFiles([]);
        setErrors([]);
    }, []);

    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    const validFiles = selectedFiles.filter(f => f.valid);
    const invalidFiles = selectedFiles.filter(f => !f.valid);

    return (
        <div className="space-y-6">
            {/* Hidden file input - always available */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedExtensions.map(ext => `.${ext}`).join(',')}
                onChange={handleFileInput}
                className="hidden"
            />

            {/* Drop Zone - Only show when no files are selected */}
            {selectedFiles.length === 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Selecione os Arquivos</CardTitle>
                        <CardDescription>
                            Arraste e solte as imagens aqui ou clique para selecionar.
                            Formatos aceitos: {acceptedExtensions.join(', ')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className={cn(
                                'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
                                {
                                    'border-gray-300 bg-gray-50 hover:bg-gray-100': !isDragging,
                                    'border-primary bg-primary/10': isDragging,
                                }
                            )}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-900">
                                Arraste arquivos aqui
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                ou clique para selecionar
                            </p>
                            <Button variant="outline" className="mt-4">
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Escolher Arquivos
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Errors */}
            {errors.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <ul className="list-disc list-inside">
                            {errors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
                <>
                    {/* Header Section */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Arquivos Selecionados</h3>
                            <p className="text-sm text-gray-600">
                                {selectedFiles.length} arquivo(s) • {formatBytes(totalSize)} total
                                • {validFiles.length} válido(s), {invalidFiles.length} inválido(s)
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4 mr-2" />
                                Adicionar Mais
                            </Button>
                            <Button variant="outline" size="sm" onClick={clearAll}>
                                Limpar Tudo
                            </Button>
                        </div>
                    </div>

                    {/* Image Grid directly on canvas */}
                    <SimpleFileGrid
                        files={selectedFiles}
                        onRemoveFile={removeFile}
                    />
                </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
                <Button
                    variant="default"
                    onClick={() => onNext(selectedFiles)}
                    disabled={validFiles.length === 0 || isProcessing}
                >
                    {isProcessing ? 'Processando...' : `Continuar com ${validFiles.length} arquivo(s)`}
                </Button>
            </div>
        </div>
    );
}
