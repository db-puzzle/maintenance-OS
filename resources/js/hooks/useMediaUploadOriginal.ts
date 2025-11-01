import { useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Media } from '@/utils/media';

interface UseMediaUploadOptions {
    onSuccess?: (media: Media | Media[]) => void;
    onError?: (error: string) => void;
    onProgress?: (progress: number) => void;
    modelType?: string;
    modelId?: number;
    collection?: string;
}

interface UploadProgress {
    percentage: number;
    loaded: number;
    total: number;
}

const useMediaUpload = ({
    onSuccess,
    onError,
    onProgress,
    modelType,
    modelId,
    collection = 'default',
}: UseMediaUploadOptions) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = useCallback(async (file: File, customProperties: Record<string, unknown> = {}) => {
        setIsUploading(true);
        setError(null);
        setUploadProgress(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model_type', modelType || '');
        formData.append('model_id', modelId ? String(modelId) : '');
        formData.append('collection', collection);
        formData.append('custom_properties', JSON.stringify(customProperties));

        try {
            // For simplicity, this example assumes direct upload.
            // For chunked uploads, you'd interact with the chunked upload API endpoints.
            // The backend FileStorageService handles the decision based on file size.
            router.post(route('api.media.upload'), formData, {
                onProgress: (progress) => {
                    if (progress?.percentage !== undefined) {
                        setUploadProgress({
                            percentage: progress.percentage,
                            loaded: progress.loaded || 0,
                            total: progress.total || 0,
                        });
                        onProgress?.(progress.percentage);
                    }
                },
                onSuccess: (page) => {
                    const pageWithProps = page as { props?: { media?: Media } };
                    const media = pageWithProps.props?.media as Media | undefined; // Type assertion for media response
                    if (media) {
                        onSuccess?.(media);
                    }
                    setIsUploading(false);
                    setUploadProgress(null);
                },
                onError: (errors) => {
                    const errorMessage = Object.values(errors).flat().join(', ');
                    setError(errorMessage);
                    onError?.(errorMessage);
                    setIsUploading(false);
                    setUploadProgress(null);
                },
            });
        } catch (e: unknown) {
            const errorMessage = (e as { message?: string }).message || 'An unknown error occurred during upload.';
            setError(errorMessage);
            onError?.(errorMessage);
            setIsUploading(false);
            setUploadProgress(null);
        }
    }, [onSuccess, onError, onProgress, modelType, modelId, collection]);

    return { uploadFile, isUploading, uploadProgress, error };
};

export default useMediaUpload;
