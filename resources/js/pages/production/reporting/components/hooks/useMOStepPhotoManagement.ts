import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Media } from '@/types/media';
import { UseMOStepDataReturn } from './useMOStepData';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface UseMOStepPhotoManagementParams {
    stepData: UseMOStepDataReturn;
}

export interface UseMOStepPhotoManagementReturn {
    photos: Media[];
    selectedPhotoIndex: number | null;
    showingStepPhotos: boolean;
    setSelectedPhotoIndex: (index: number | null) => void;
    setShowingStepPhotos: (show: boolean) => void;
    captureDialog: {
        isOpen: boolean;
        onClose: () => void;
        onPhotoAdded: (photo: File) => void;
        open: () => void;
    };
    handleDeletePhoto: (photo: Media) => void;
}

export function useMOStepPhotoManagement({
    stepData
}: UseMOStepPhotoManagementParams): UseMOStepPhotoManagementReturn {
    const { activeExecution, stepPhotos, setStepPhotos } = stepData;
    
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [showingStepPhotos, setShowingStepPhotos] = useState(false);
    const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
    
    // Handle photo upload
    const handlePhotoAdded = (photo: File) => {
        if (!activeExecution) return;
        
        const formData = new FormData();
        formData.append('photo', photo);
        
        router.post(route('production.reporting.steps.upload-photo', { 
            execution: activeExecution.id 
        }), formData, {
            preserveUrl: true,
            onSuccess: (page) => {
                const pageProps = page.props as { newPhoto?: Media };
                if (pageProps.newPhoto) {
                    setStepPhotos([...stepPhotos, pageProps.newPhoto]);
                }
            }
        });
    };
    
    // Handle photo deletion
    const handleDeletePhoto = (photo: Media) => {
        if (!activeExecution || !photo.id) return;
        
        if (confirm('Are you sure you want to delete this photo?')) {
            router.delete(route('production.reporting.steps.delete-photo', {
                execution: activeExecution.id,
                media: photo.id
            }), {
                preserveUrl: true,
                onSuccess: () => {
                    setStepPhotos(stepPhotos.filter(p => p.id !== photo.id));
                    setSelectedPhotoIndex(null);
                }
            });
        }
    };
    
    return {
        photos: stepPhotos,
        selectedPhotoIndex,
        showingStepPhotos,
        setSelectedPhotoIndex,
        setShowingStepPhotos,
        captureDialog: {
            isOpen: photoCaptureOpen,
            onClose: () => setPhotoCaptureOpen(false),
            onPhotoAdded: handlePhotoAdded,
            open: () => setPhotoCaptureOpen(true)
        },
        handleDeletePhoto
    };
}
