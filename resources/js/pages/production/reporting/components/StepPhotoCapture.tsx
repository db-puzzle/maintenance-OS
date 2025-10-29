import React, { useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, RotateCw } from 'lucide-react';

interface StepPhotoCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onPhotoAdded: (photo: File) => void;
}

export function StepPhotoCapture({
    isOpen,
    onClose,
    onPhotoAdded
}: StepPhotoCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
    }, [facingMode]);

    React.useEffect(() => {
        if (isOpen) {
            startCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, startCamera, stream]);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                setCapturedImage(dataUrl);
            }
        }
    };

    const confirmPhoto = () => {
        if (canvasRef.current) {
            canvasRef.current.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `step-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onPhotoAdded(file);
                    onClose();
                }
            }, 'image/jpeg', 0.85);
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Capture Step Photo</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">

                    <div className="relative aspect-video bg-black rounded overflow-hidden">
                        {!capturedImage ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute top-4 right-4"
                                    onClick={toggleCamera}
                                >
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <img
                                src={capturedImage}
                                alt="Captured"
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex gap-2">
                        {!capturedImage ? (
                            <>
                                <Button
                                    className="flex-1"
                                    onClick={capturePhoto}
                                >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Capture
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                >
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    className="flex-1"
                                    onClick={confirmPhoto}
                                >
                                    Use Photo
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={retakePhoto}
                                >
                                    Retake
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
