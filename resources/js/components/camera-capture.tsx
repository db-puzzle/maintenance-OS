import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile] = useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            // Verifica se está usando HTTPS
            if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                throw new Error('A câmera só pode ser acessada em conexões seguras (HTTPS)');
            }

            // Configurações básicas primeiro
            let constraints: MediaStreamConstraints = {
                video: {
                    facingMode: isMobile ? 'environment' : 'user',
                },
            };

            try {
                await navigator.mediaDevices.getUserMedia(constraints);

                // Se conseguir acesso, tenta melhorar a qualidade
                constraints = {
                    video: {
                        facingMode: isMobile ? 'environment' : 'user',
                        width: { ideal: isMobile ? window.innerWidth : 1920 },
                        height: { ideal: isMobile ? window.innerHeight : 1080 },
                    } as MediaTrackConstraints,
                };

                // Tenta aplicar as configurações de qualidade
                const betterStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(betterStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = betterStream;
                }
            } catch (basicError) {
                // Se falhar com configurações avançadas, usa o stream básico
                console.warn('Usando configurações básicas da câmera:', basicError);
                const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
                setStream(basicStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = basicStream;
                }
            }
        } catch (err: unknown) {
            const error = err as { name?: string; message?: string };
            console.error('Erro detalhado da câmera:', error);

            // Mensagens de erro mais específicas
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                setError('Acesso à câmera negado. Por favor, permita o acesso à câmera nas configurações do seu navegador.');
            } else if (error.name === 'NotFoundError') {
                setError('Nenhuma câmera encontrada no dispositivo.');
            } else if (error.name === 'NotReadableError' || error.name === 'AbortError') {
                setError('Não foi possível acessar a câmera. Ela pode estar sendo usada por outro aplicativo.');
            } else if (error.message?.includes('HTTPS')) {
                setError('A câmera só pode ser acessada em conexões seguras (HTTPS).');
            } else {
                setError(`Não foi possível acessar a câmera. ${error.message || 'Verifique as permissões.'}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const takePhoto = (e: React.MouseEvent) => {
        e.preventDefault(); // Previne a propagação do evento

        if (videoRef.current) {
            const canvas = document.createElement('canvas');

            // Usa as dimensões reais do vídeo
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;

            // Mantém a proporção original
            canvas.width = videoWidth;
            canvas.height = videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Desenha a imagem mantendo a orientação correta
                ctx.drawImage(videoRef.current, 0, 0);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const file = new File([blob], 'photo.jpg', {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            onCapture(file);
                            stopCamera();
                            onClose();
                        }
                    },
                    'image/jpeg',
                    0.8,
                );
            }
        }
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
        }
        stopCamera();
        onClose();
    };

    if (error) {
        return (
            <div className="bg-background/80 fixed inset-0 z-50 backdrop-blur-sm">
                <div className="bg-background fixed top-[50%] left-[50%] z-50 mx-4 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg sm:mx-0 sm:rounded-lg">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="text-destructive">
                            <X className="h-8 w-8" />
                        </div>
                        <p className="text-lg font-semibold">{error}</p>
                        <Button type="button" onClick={handleClose}>
                            Fechar
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background/80 fixed inset-0 z-50 backdrop-blur-sm">
            <div
                className={`fixed ${isMobile ? 'inset-0' : 'top-[50%] left-[50%] max-w-lg translate-x-[-50%] translate-y-[-50%]'} bg-background z-50 grid w-full gap-4 border shadow-lg ${isMobile ? '' : 'p-6 sm:rounded-lg'}`}
            >
                <div className="flex flex-col gap-4">
                    <div className={`relative ${isMobile ? 'h-[100dvh]' : 'aspect-video'} bg-muted overflow-hidden rounded-lg`}>
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
                            </div>
                        )}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted // Necessário para autoplay no iOS
                            className="h-full w-full object-cover"
                            onLoadedMetadata={() => setIsLoading(false)}
                        />
                        <div className="absolute top-4 right-4">
                            <Button type="button" variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={handleClose}>
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>

                    <div className={`flex justify-center gap-4 ${isMobile ? 'fixed right-4 bottom-8 left-4' : ''}`}>
                        <Button
                            type="button"
                            onClick={takePhoto}
                            disabled={isLoading}
                            className={`${isMobile ? 'h-16 rounded-full text-lg' : ''} w-full`}
                        >
                            <Camera className={`${isMobile ? 'mr-3 h-6 w-6' : 'mr-2 h-4 w-4'}`} />
                            Tirar Foto
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
