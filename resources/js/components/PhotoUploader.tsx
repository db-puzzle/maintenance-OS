import CameraCapture from '@/components/camera-capture';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PhotoUploaderProps {
    label?: string;
    onChange: (file: File | null) => void;
    value: File | null;
    error?: string;
    minHeight?: string;
    maxHeight?: string;
    id?: string;
    initialPreview?: string | null;
    disabled?: boolean;
}

export default function PhotoUploader({
    label = 'Foto',
    onChange,
    value,
    error,
    minHeight = 'min-h-[238px]',
    maxHeight = 'max-h-[238px]',
    id = 'photo',
    initialPreview = null,
    disabled = false,
}: PhotoUploaderProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreview);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Se tivermos um valor (File) inicial, criar a previsão
        if (value instanceof File && !previewUrl) {
            setPreviewUrl(URL.createObjectURL(value));
        }
    }, [value, previewUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onChange(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handlePhotoCapture = (file: File) => {
        onChange(file);
        setPreviewUrl(URL.createObjectURL(file));
        // Resetar o input de arquivo para permitir a seleção do mesmo arquivo novamente
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemovePhoto = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevenir que o evento se propague
        setPreviewUrl(null);
        onChange(null);
        // Resetar o input de arquivo para permitir a seleção do mesmo arquivo novamente
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleOpenCamera = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevenir que o evento se propague e submeta o formulário
        setShowCamera(true);
    };

    return (
        <div className="flex h-full flex-col">
            {label && (
                <Label htmlFor={id} className="mb-2">
                    {label}
                </Label>
            )}
            <div className="flex flex-1 flex-col gap-2">
                <div className={`bg-muted relative flex-1 overflow-hidden rounded-lg border ${minHeight} ${maxHeight}`}>
                    {previewUrl ? (
                        <div className="relative h-full w-full">
                            <img src={previewUrl} alt="Preview" className="h-auto w-full object-contain" />
                            <Button
                                type="button"
                                variant="warning"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={handleRemovePhoto}
                                disabled={disabled}
                            >
                                Remover
                            </Button>
                        </div>
                    ) : (
                        <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <Camera className="h-12 w-12" />
                            <span className="text-sm">Nenhuma foto selecionada</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id={id}
                            disabled={disabled}
                        />
                        <Button type="button" variant="outline" className="w-full" asChild disabled={disabled}>
                            <label htmlFor={id} className="flex cursor-pointer items-center justify-center gap-2">
                                <Upload className="h-4 w-4" />
                                Selecionar Arquivo
                            </label>
                        </Button>
                    </div>
                    <Button type="button" variant="outline" onClick={handleOpenCamera} className="flex-1" disabled={disabled}>
                        <Camera className="mr-2 h-4 w-4" />
                        Usar Câmera
                    </Button>
                </div>
                {error && <InputError message={error} />}
            </div>

            {showCamera && <CameraCapture onCapture={handlePhotoCapture} onClose={() => setShowCamera(false)} />}
        </div>
    );
}
