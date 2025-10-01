import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle, Download, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/utils/format';
import { type BomImportFile, type BomInfo } from '../types';

interface Props {
    supportedFormats: string[];
    onNext: (file: BomImportFile, bomInfo: BomInfo) => void;
    initialBomInfo?: BomInfo;
}

export function FileSelectionStep({ supportedFormats, onNext, initialBomInfo }: Props) {
    const [selectedFile, setSelectedFile] = useState<BomImportFile | null>(null);
    const [bomInfo, setBomInfo] = useState<BomInfo>(initialBomInfo || {
        name: '',
        description: '',
        external_reference: '',
    });
    const [isDragging, setIsDragging] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!extension || !supportedFormats.includes(extension)) {
            setErrors([`Formato não suportado. Use: ${supportedFormats.join(', ')}`]);
            return;
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            setErrors(['Arquivo muito grande (máximo 10MB)']);
            return;
        }

        setSelectedFile({
            file,
            filename: file.name,
            size: file.size,
            type: extension,
        });
        setErrors([]);
    }, [supportedFormats]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleNext = () => {
        if (!selectedFile || !bomInfo.name.trim()) {
            return;
        }
        onNext(selectedFile, bomInfo);
    };

    const isValid = selectedFile && bomInfo.name.trim();

    return (
        <div className="space-y-6">
            {/* File Upload */}
            <Card>
                <CardHeader>
                    <CardTitle>Selecionar Arquivo</CardTitle>
                    <CardDescription>
                        Faça upload de um arquivo CSV ou JSON contendo a estrutura da BOM
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={supportedFormats.map(f => `.${f}`).join(',')}
                        onChange={handleFileInput}
                        className="hidden"
                    />

                    {!selectedFile ? (
                        <div
                            className={cn(
                                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
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
                                Arraste o arquivo aqui
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                ou clique para selecionar
                            </p>
                            <Button variant="outline" className="mt-4">
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Escolher Arquivo
                            </Button>
                            <p className="text-xs text-gray-500 mt-4">
                                Formatos aceitos: {supportedFormats.join(', ')} • Máximo 10MB
                            </p>
                        </div>
                    ) : (
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-gray-400" />
                                    <div>
                                        <p className="font-medium">{selectedFile.filename}</p>
                                        <p className="text-sm text-gray-600">
                                            {formatBytes(selectedFile.size)} • {selectedFile.type.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                    }}
                                >
                                    Remover
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Template Downloads */}
                    <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-2">Modelos de Arquivo</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <a href="/templates/bom-import-template.csv" download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar Modelo CSV
                                </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <a href="/templates/bom-import-template.json" download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar Modelo JSON
                                </a>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* BOM Information */}
            <Card className={cn(!selectedFile && 'opacity-60')}>
                <CardHeader>
                    <CardTitle>Informações da BOM</CardTitle>
                    <CardDescription>
                        {selectedFile
                            ? 'Forneça informações básicas sobre a BOM que será importada'
                            : 'Selecione um arquivo primeiro para preencher as informações da BOM'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bom-name" className={cn(!selectedFile && 'text-muted-foreground')}>
                                Nome da BOM *
                            </Label>
                            <Input
                                id="bom-name"
                                value={bomInfo.name}
                                onChange={(e) => setBomInfo({ ...bomInfo, name: e.target.value })}
                                placeholder="Ex: BOM Produto XYZ"
                                required
                                disabled={!selectedFile}
                            />
                            {selectedFile && !bomInfo.name && (
                                <p className="text-xs text-destructive">Campo obrigatório</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="external-ref" className={cn(!selectedFile && 'text-muted-foreground')}>
                                Referência Externa
                            </Label>
                            <Input
                                id="external-ref"
                                value={bomInfo.external_reference}
                                onChange={(e) => setBomInfo({ ...bomInfo, external_reference: e.target.value })}
                                placeholder="Ex: DWG-001"
                                disabled={!selectedFile}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className={cn(!selectedFile && 'text-muted-foreground')}>
                            Descrição
                        </Label>
                        <Input
                            id="description"
                            value={bomInfo.description}
                            onChange={(e) => setBomInfo({ ...bomInfo, description: e.target.value })}
                            placeholder="Descrição da BOM"
                            disabled={!selectedFile}
                        />
                    </div>
                </CardContent>
            </Card>

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

            {/* Actions */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={!isValid}
                >
                    Continuar
                </Button>
            </div>
        </div>
    );
}
