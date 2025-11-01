import { useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Media, buildMediaFormData, isFileTypeAllowed, getAllowedMimeTypesForCollection } from '@/utils/media';

export interface UseMediaUploadOptions {
    modelType: string;
    modelId: number;
    collection: string;
    onSuccess?: (media: Media) => void;
    onError?: (error: string) => void;
    maxFileSize?: number; // in bytes
    allowedMimeTypes?: string[];
}

export interface UploadProgress {
    [fileId: string]: {
        file: File;
        progress: number;
        status: 'pending' | 'uploading' | 'success' | 'error';
        error?: string;
        media?: Media;
    };
}

export function useMediaUpload(options: UseMediaUploadOptions) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<UploadProgress>({});

    const allowedMimeTypes = options.allowedMimeTypes || getAllowedMimeTypesForCollection(options.collection);
    const maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB default

    const validateFile = useCallback((file: File): string | null => {
        if (!isFileTypeAllowed(file, allowedMimeTypes)) {
            return `File type ${file.type} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`;
        }

        if (file.size > maxFileSize) {
            return `File size exceeds the maximum allowed size of ${Math.round(maxFileSize / 1024 / 1024)}MB`;
        }

        return null;
    }, [allowedMimeTypes, maxFileSize]);

    const uploadFile = useCallback(async (file: File, customProperties?: Record<string, unknown>) => {
        const fileId = `${file.name}-${Date.now()}`;

        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
            setProgress(prev => ({
                ...prev,
                [fileId]: {
                    file,
                    progress: 0,
                    status: 'error',
                    error: validationError,
                },
            }));
            options.onError?.(validationError);
            return;
        }

        // Set initial progress
        setProgress(prev => ({
            ...prev,
            [fileId]: {
                file,
                progress: 0,
                status: 'uploading',
            },
        }));

        setUploading(true);

        try {
            const formData = buildMediaFormData(file, options.collection, customProperties);

            // Upload using Inertia
            await router.post(
                `/api/${options.modelType}/${options.modelId}/media`,
                formData,
                {
                    forceFormData: true,
                    onProgress: (progressEvent) => {
                        if (progressEvent && progressEvent.lengthComputable && progressEvent.total) {
                            const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                            setProgress(prev => ({
                                ...prev,
                                [fileId]: {
                                    ...prev[fileId],
                                    progress: percentComplete,
                                },
                            }));
                        }
                    },
                    onSuccess: (page) => {
                        const media = (page.props as { media?: Media }).media;
                        setProgress(prev => ({
                            ...prev,
                            [fileId]: {
                                ...prev[fileId],
                                progress: 100,
                                status: 'success',
                                media,
                            },
                        }));
                        if (media) {
                            options.onSuccess?.(media);
                        }
                    },
                    onError: (errors) => {
                        const errorMessage = Object.values(errors).flat().join(', ');
                        setProgress(prev => ({
                            ...prev,
                            [fileId]: {
                                ...prev[fileId],
                                status: 'error',
                                error: errorMessage,
                            },
                        }));
                        options.onError?.(errorMessage);
                    },
                    preserveState: true,
                    preserveScroll: true,
                }
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            setProgress(prev => ({
                ...prev,
                [fileId]: {
                    ...prev[fileId],
                    status: 'error',
                    error: errorMessage,
                },
            }));
            options.onError?.(errorMessage);
        } finally {
            setUploading(false);
        }
    }, [options, validateFile]);

    const uploadMultiple = useCallback(async (files: File[], customProperties?: Record<string, unknown>) => {
        for (const file of files) {
            await uploadFile(file, customProperties);
        }
    }, [uploadFile]);

    const clearProgress = useCallback(() => {
        setProgress({});
    }, []);

    const removeFromProgress = useCallback((fileId: string) => {
        setProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
        });
    }, []);

    return {
        uploading,
        progress,
        uploadFile,
        uploadMultiple,
        clearProgress,
        removeFromProgress,
        validateFile,
    };
}
