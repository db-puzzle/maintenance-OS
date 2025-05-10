import { useState, useEffect, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import CameraCapture from '@/components/camera-capture';

interface PhotoUploaderProps {
    label?: string;
    onChange: (file: File | null) => void;
    value: File | null;
    error?: string;
    minHeight?: string;
    maxHeight?: string;
    id?: string;
    initialPreview?: string | null;
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
}: PhotoUploaderProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreview);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Se tivermos um valor (File) inicial, criar a previsão
        if (value instanceof File && !previewUrl) {
            setPreviewUrl(URL.createObjectURL(value));
        }
    }, [value]);

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
        <div className="flex flex-col h-full">
            {label && <Label htmlFor={id} className="mb-2">{label}</Label>}
            <div className="flex-1 flex flex-col gap-2">
                <div className={`flex-1 relative rounded-lg overflow-hidden bg-muted border ${minHeight} ${maxHeight}`}>
                    {previewUrl ? (
                        <div className="relative w-full h-full">
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-auto object-contain"
                            />
                            <Button
                                type="button"
                                variant="warning"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={handleRemovePhoto}
                            >
                                Remover
                            </Button>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Camera className="w-12 h-12" />
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
                        />
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            asChild
                        >
                            <label htmlFor={id} className="flex items-center justify-center gap-2 cursor-pointer">
                                <Upload className="w-4 h-4" />
                                Selecionar Arquivo
                            </label>
                        </Button>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleOpenCamera}
                        className="flex-1"
                    >
                        <Camera className="w-4 h-4 mr-2" />
                        Usar Câmera
                    </Button>
                </div>
                {error && <InputError message={error} />}
            </div>

            {showCamera && (
                <CameraCapture
                    onCapture={handlePhotoCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </div>
    );
} 