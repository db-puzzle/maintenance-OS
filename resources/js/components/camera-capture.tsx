import { useRef, useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: isMobile ? 'environment' : 'user',
                    width: { ideal: isMobile ? window.innerWidth : 1920 },
                    height: { ideal: isMobile ? window.innerHeight : 1080 }
                }
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            setError('Não foi possível acessar a câmera. Verifique as permissões.');
            console.error('Erro ao acessar a câmera:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const takePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
                        onCapture(file);
                        stopCamera();
                        onClose();
                    }
                }, 'image/jpeg', 0.8);
            }
        }
    };

    const handleClose = () => {
        stopCamera();
        onClose();
    };

    if (error) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
                <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg mx-4 sm:mx-0 sm:rounded-lg">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="text-destructive">
                            <X className="h-8 w-8" />
                        </div>
                        <p className="text-lg font-semibold">{error}</p>
                        <Button onClick={handleClose}>Fechar</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
            <div className={`fixed ${isMobile ? 'inset-0' : 'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-lg'} z-50 grid w-full gap-4 border bg-background shadow-lg ${isMobile ? '' : 'p-6 sm:rounded-lg'}`}>
                <div className="flex flex-col gap-4">
                    <div className={`relative ${isMobile ? 'h-[100dvh]' : 'aspect-video'} rounded-lg overflow-hidden bg-muted`}>
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        )}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            onLoadedMetadata={() => setIsLoading(false)}
                        />
                        <div className="absolute top-4 right-4">
                            <Button
                                variant="destructive"
                                size="icon"
                                className="h-12 w-12 rounded-full"
                                onClick={handleClose}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                    
                    <div className={`flex justify-center gap-4 ${isMobile ? 'fixed bottom-8 left-4 right-4' : ''}`}>
                        <Button
                            onClick={takePhoto}
                            disabled={isLoading}
                            className={`${isMobile ? 'h-16 text-lg rounded-full' : ''} w-full`}
                        >
                            <Camera className={`${isMobile ? 'h-6 w-6 mr-3' : 'h-4 w-4 mr-2'}`} />
                            Tirar Foto
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
} 