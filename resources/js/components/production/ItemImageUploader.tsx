import React, { useState, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
interface ItemImageUploaderProps {
    itemId: string;
    maxImages: number;
    currentImageCount: number;
}
export function ItemImageUploader({ itemId, maxImages, currentImageCount }: ItemImageUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
    const { data, setData, post, progress, errors, processing } = useForm({
        images: [] as File[],
        set_primary: currentImageCount === 0,
    });
    const remainingSlots = maxImages - currentImageCount;
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    }, []);
    const handleFiles = (files: FileList) => {
        const validFiles = Array.from(files).filter(file => {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
            return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB
        }).slice(0, remainingSlots);
        const newPreviews = validFiles.map(file => ({
            file,
            url: URL.createObjectURL(file)
        }));
        setPreviews(prev => [...prev, ...newPreviews]);
        setData('images', [...data.images, ...validFiles]);
    };
    const removeFile = (index: number) => {
        URL.revokeObjectURL(previews[index].url);
        setPreviews(prev => prev.filter((_, i) => i !== index));
        setData('images', data.images.filter((_, i) => i !== index));
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('production.items.images.store', itemId), {
            forceFormData: true,
            onSuccess: () => {
                setPreviews([]);
                setData('images', []);
            },
            onError: (errors: unknown) => {
                console.error('Upload errors:', errors);
            }
        });
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-gray-300",
                    remainingSlots === 0 && "opacity-50 cursor-not-allowed"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                    {remainingSlots > 0 ? (
                        <>Arraste e solte imagens aqui, ou clique para selecionar</>
                    ) : (
                        <>Número máximo de imagens atingido</>
                    )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, WebP, HEIC até 10MB (será otimizado para 500KB se maior)
                </p>
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                    id="file-input"
                    disabled={remainingSlots === 0}
                />
                <label
                    htmlFor="file-input"
                    className={cn(
                        "mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 cursor-pointer",
                        remainingSlots === 0 && "opacity-50 cursor-not-allowed"
                    )}
                >
                    Selecionar Imagens
                </label>
                <p className="text-xs text-gray-500 mt-2">
                    {currentImageCount} de {maxImages} imagens usadas
                </p>
            </div>
            {errors.images && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.images}</AlertDescription>
                </Alert>
            )}
            {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                            <img
                                src={preview.url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                                {(preview.file.size / 1024).toFixed(0)}KB
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {processing && progress && (
                <div className="space-y-2">
                    <Progress value={progress.percentage} />
                    <p className="text-sm text-gray-600 text-center">
                        Enviando... {progress.percentage}%
                    </p>
                </div>
            )}
            {previews.length > 0 && (
                <div className="flex justify-end space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            previews.forEach(p => URL.revokeObjectURL(p.url));
                            setPreviews([]);
                            setData('images', []);
                        }}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing}>
                        Enviar {previews.length} Imagem{previews.length !== 1 ? 'ns' : ''}
                    </Button>
                </div>
            )}
        </form>
    );
}