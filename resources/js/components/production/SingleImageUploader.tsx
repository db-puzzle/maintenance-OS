import React, { useState, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface SingleImageUploaderProps {
    itemId: string;
    onUploadComplete?: () => void;
    onCancel?: () => void;
    isReplacing?: boolean;
}

export function SingleImageUploader({ itemId, onUploadComplete, onCancel, isReplacing = false }: SingleImageUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
    const { setData, post, progress, errors, processing } = useForm({
        images: [] as File[],
        set_primary: true,
    });

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleFile = useCallback((file: File) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
        if (!validTypes.includes(file.type)) {
            alert('Tipo de arquivo não suportado. Use JPG, PNG, WebP ou HEIC.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande. O tamanho máximo é 10MB.');
            return;
        }

        const url = URL.createObjectURL(file);
        setPreview({ file, url });
        setData('images', [file]);
    }, [setData]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [handleFile]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        if (preview) {
            URL.revokeObjectURL(preview.url);
            setPreview(null);
            setData('images', []);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!preview) return;

        post(route('production.items.images.store', itemId), {
            forceFormData: true,
            onSuccess: () => {
                if (preview) {
                    URL.revokeObjectURL(preview.url);
                }
                setPreview(null);
                setData('images', []);
                onUploadComplete?.();
            },
            onError: (errors: unknown) => {
                console.error('Upload errors:', errors);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {!preview && (
                <>
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                            dragActive ? "border-primary bg-primary/5" : "border-gray-300"
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                            Arraste e solte uma imagem aqui, ou clique para selecionar
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            JPG, PNG, WebP, HEIC até 10MB
                        </p>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="single-file-input"
                        />
                        <label
                            htmlFor="single-file-input"
                            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 cursor-pointer"
                        >
                            Selecionar Imagem
                        </label>
                    </div>
                    {isReplacing && onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="w-full"
                        >
                            Cancelar
                        </Button>
                    )}
                </>
            )}

            {errors.images && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.images}</AlertDescription>
                </Alert>
            )}

            {preview && (
                <div className="space-y-4">
                    <div className="relative">
                        <img
                            src={preview.url}
                            alt="Preview"
                            className="w-full max-h-96 object-contain rounded-lg border"
                        />
                        <button
                            type="button"
                            onClick={removeFile}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-2 left-2 text-sm text-white bg-black/70 px-3 py-1 rounded">
                            {(preview.file.size / 1024).toFixed(0)}KB
                        </div>
                    </div>

                    {processing && progress && (
                        <div className="space-y-2">
                            <Progress value={progress.percentage} />
                            <p className="text-sm text-gray-600 text-center">
                                Enviando... {progress.percentage}%
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                removeFile();
                                onCancel?.();
                            }}
                            disabled={processing}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="flex-1"
                        >
                            {processing ? 'Enviando...' : (isReplacing ? 'Substituir Imagem' : 'Enviar Imagem')}
                        </Button>
                    </div>
                </div>
            )}
        </form>
    );
}
