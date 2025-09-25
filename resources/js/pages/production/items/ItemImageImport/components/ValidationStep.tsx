import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, AlertCircle, FileImage, Download } from 'lucide-react';
// import { cn } from '@/lib/utils';
import { ImportFile, ImportSession, ValidationResult, ImportOptions } from '../types';
import { formatBytes } from '@/utils/format';
import axios from 'axios';

interface Props {
    files: ImportFile[];
    onNext: (validatedFiles: ImportFile[], session: ImportSession) => void;
    onBack: () => void;
    importOptions: ImportOptions;
}

export function ValidationStep({ files, onNext, onBack }: Props) {
    const [isValidating, setIsValidating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [validatedFiles, setValidatedFiles] = useState<ImportFile[]>([]);
    const [session, setSession] = useState<ImportSession | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startValidation = useCallback(async () => {
        setIsValidating(true);
        setError(null);

        try {
            // Initialize session
            const sessionResponse = await axios.post(route('production.items.images.import.init-session'));
            const { sessionId } = sessionResponse.data;

            // Prepare files for validation
            const filesToValidate = files.filter(f => f.valid).map(f => ({
                name: f.filename,
                size: f.size,
                type: f.type,
            }));

            // Validate files
            const validationResponse = await axios.post(
                route('production.items.images.import.validate-files'),
                {
                    sessionId,
                    files: filesToValidate,
                }
            );

            const result: ValidationResult = validationResponse.data;

            // Update files with validation results
            const updatedFiles = files.map(file => {
                const validation = result.validations.find(v => v.filename === file.filename);
                if (validation) {
                    return {
                        ...file,
                        valid: validation.valid,
                        errors: validation.errors,
                        itemCode: validation.itemCode,
                        itemExists: validation.itemExists,
                        itemName: validation.itemName,
                        hasExistingImage: validation.hasExistingImage,
                    };
                }
                return file;
            });

            setValidatedFiles(updatedFiles);

            // Create session object
            const sessionData: ImportSession = {
                sessionId,
                status: 'initialized',
                files: updatedFiles,
                processed: 0,
                total: updatedFiles.length,
            };

            setSession(sessionData);
            setProgress(100);

        } catch (err) {
            console.error('Validation error:', err);
            setError('Erro ao validar arquivos. Por favor, tente novamente.');
        } finally {
            setIsValidating(false);
        }
    }, [files]);

    useEffect(() => {
        startValidation();
    }, [startValidation]);


    const validFiles = validatedFiles.filter(f => f.valid);
    const invalidFiles = validatedFiles.filter(f => !f.valid);
    const replacements = validatedFiles.filter(f => f.valid && f.hasExistingImage);

    // const extractItemCode = (filename: string): string => {
    //     return filename.replace(/\.[^/.]+$/, '');
    // };

    const downloadInvalidFilesCSV = () => {
        // Create CSV content
        const headers = ['Filename', 'Size', 'Type', 'Expected Item Number', 'Error'];
        const rows = invalidFiles.map(file => [
            file.filename,
            formatBytes(file.size),
            file.type,
            file.itemCode || '',
            file.errors.join('; ')
        ]);

        // Convert to CSV format
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `Invalid_Image_List_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {isValidating ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                            <h3 className="text-lg font-medium">Validando arquivos...</h3>
                            <p className="text-sm text-gray-600">
                                Verificando correspondências e itens existentes
                            </p>
                            <Progress value={progress} className="max-w-xs mx-auto" />
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Summary */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Resumo da Validação</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Resultados da verificação dos arquivos
                        </p>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <p className="text-2xl font-bold text-gray-900">
                                    {validatedFiles.length}
                                </p>
                                <p className="text-sm text-gray-600">Total de Arquivos</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-2xl font-bold text-green-700">
                                    {validFiles.length}
                                </p>
                                <p className="text-sm text-gray-600">Válidos</p>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                <p className="text-2xl font-bold text-red-700">
                                    {invalidFiles.length}
                                </p>
                                <p className="text-sm text-gray-600">Inválidos</p>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                <p className="text-2xl font-bold text-yellow-700">
                                    {replacements.length}
                                </p>
                                <p className="text-sm text-gray-600">Substituições</p>
                            </div>
                        </div>
                    </div>

                    {/* Valid Files */}
                    {validFiles.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-green-700">
                                    <CheckCircle className="inline h-5 w-5 mr-2" />
                                    Arquivos Válidos ({validFiles.length})
                                </CardTitle>
                                <CardDescription>
                                    Estes arquivos serão importados
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {validFiles.map((file) => (
                                        <div
                                            key={file.filename}
                                            className="flex items-center gap-4 p-3 bg-green-50 rounded-lg"
                                        >
                                            <div className="h-12 w-12 rounded overflow-hidden bg-white">
                                                {file.preview ? (
                                                    <img
                                                        src={file.preview}
                                                        alt={file.filename}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <FileImage className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{file.filename}</p>
                                                <p className="text-xs text-gray-600">
                                                    Item: <span className="font-mono">{file.itemCode}</span>
                                                    {file.itemName && ` - ${file.itemName}`}
                                                </p>
                                            </div>
                                            <div className="text-right text-xs text-gray-500">
                                                {formatBytes(file.size)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Invalid Files */}
                    {invalidFiles.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-red-700">
                                            <XCircle className="inline h-5 w-5 mr-2" />
                                            Arquivos Inválidos ({invalidFiles.length})
                                        </CardTitle>
                                        <CardDescription>
                                            Estes arquivos não serão importados
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={downloadInvalidFilesCSV}
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Baixar CSV
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {invalidFiles.map((file) => (
                                        <div
                                            key={file.filename}
                                            className="flex items-center gap-4 p-3 bg-red-50 rounded-lg"
                                        >
                                            <div className="h-12 w-12 rounded overflow-hidden bg-white">
                                                {file.preview ? (
                                                    <img
                                                        src={file.preview}
                                                        alt={file.filename}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <FileImage className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{file.filename}</p>
                                                <p className="text-xs text-red-600">
                                                    {file.errors.join(', ')}
                                                </p>
                                                {file.itemCode && (
                                                    <p className="text-xs text-gray-600">
                                                        Item detectado: <span className="font-mono">{file.itemCode}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right text-xs text-gray-500">
                                                {formatBytes(file.size)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Replacements */}
                    {replacements.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-yellow-700">
                                    <AlertCircle className="inline h-5 w-5 mr-2" />
                                    Substituições ({replacements.length})
                                </CardTitle>
                                <CardDescription>
                                    Estes arquivos substituirão imagens existentes
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {replacements.map((file) => (
                                        <div
                                            key={file.filename}
                                            className="flex items-center gap-4 p-3 bg-yellow-50 rounded-lg"
                                        >
                                            <div className="h-12 w-12 rounded overflow-hidden bg-white">
                                                {file.preview ? (
                                                    <img
                                                        src={file.preview}
                                                        alt={file.filename}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <FileImage className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{file.filename}</p>
                                                <p className="text-xs text-gray-600">
                                                    Item: <span className="font-mono">{file.itemCode}</span>
                                                    {file.itemName && ` - ${file.itemName}`}
                                                </p>
                                                <p className="text-xs text-yellow-600 font-medium">
                                                    Substituirá imagem existente do item
                                                </p>
                                            </div>
                                            <div className="text-right text-xs text-gray-500">
                                                {formatBytes(file.size)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Import Notice */}
                    {validFiles.length > 0 && (
                        <Alert className="bg-yellow-50 border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-sm">
                                <strong>Após iniciar a importação:</strong>
                                <ul className="mt-2 ml-4 list-disc text-gray-700">
                                    <li>Todas as imagens duplicadas serão substituídas automaticamente</li>
                                    <li>Blur hash será gerado para todas as imagens</li>
                                    <li>O processo não pode ser interrompido</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={onBack}>
                            Voltar
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => session && onNext(validatedFiles, session)}
                            disabled={validFiles.length === 0 || !session}
                        >
                            Iniciar Importação ({validFiles.length} arquivo{validFiles.length !== 1 ? 's' : ''})
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
