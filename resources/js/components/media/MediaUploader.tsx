import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';
import { MediaUploadOptions, UploadProgress } from '@/types/media';

interface MediaUploaderProps extends MediaUploadOptions {
    className?: string;
}

export function MediaUploader({
    modelType,
    modelId,
    collection,
    maxFiles = 10,
    maxSize = 50 * 1024 * 1024, // 50MB
    acceptedTypes = ['image/*', 'application/pdf'],
    checkDuplicates = false,
    allowDuplicates = true,
    onUploadComplete,
    onError,
    className,
}: MediaUploaderProps) {
    const [uploads, setUploads] = useState<UploadProgress[]>([]);

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model_type', modelType);
        formData.append('model_id', String(modelId));
        formData.append('collection', collection);
        formData.append('check_duplicates', String(checkDuplicates));
        formData.append('allow_duplicates', String(allowDuplicates));

        const uploadId = Date.now() + Math.random();

        try {
            // Add to upload queue
            setUploads(prev => [...prev, {
                id: uploadId,
                name: file.name,
                progress: 0,
                status: 'uploading',
            }]);

            const response = await axios.post('/api/media/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const progress = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;

                    setUploads(prev => prev.map(u =>
                        u.id === uploadId ? { ...u, progress } : u
                    ));
                },
            });

            // Handle duplicate detection
            if (response.data.duplicate) {
                setUploads(prev => prev.map(u =>
                    u.id === uploadId ? {
                        ...u,
                        status: 'error',
                        error: 'Duplicate file detected'
                    } : u
                ));

                if (onError) {
                    onError('Duplicate file: ' + file.name);
                }
                return;
            }

            // Mark as complete
            setUploads(prev => prev.map(u =>
                u.id === uploadId ? { ...u, status: 'complete', media: response.data.media } : u
            ));

            if (onUploadComplete) {
                onUploadComplete([response.data.media]);
            }

        } catch (error) {
            // Mark as error
            const errorMessage = (error as any).response?.data?.message || (error as any).message || 'Upload failed';

            setUploads(prev => prev.map(u =>
                u.id === uploadId ? { ...u, status: 'error', error: errorMessage } : u
            ));

            if (onError) {
                onError(errorMessage);
            }
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => uploadFile(file));
    }, [uploadFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles,
        maxSize,
        accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    });

    const removeUpload = (id: string | number) => {
        setUploads(prev => prev.filter(u => u.id !== id));
    };

    return (
        <div className={`space-y-4 ${className || ''}`}>
            <div
                {...getRootProps()}
                className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragActive
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 hover:border-gray-400'
                    }
                `}
            >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                    {isDragActive
                        ? 'Drop the files here...'
                        : 'Drag & drop files here, or click to select'
                    }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each
                </p>
            </div>

            {uploads.length > 0 && (
                <div className="space-y-2">
                    {uploads.map(upload => (
                        <div key={upload.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            {upload.status === 'uploading' && (
                                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                            )}
                            {upload.status === 'complete' && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            {upload.status === 'error' && (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            )}

                            <div className="flex-1">
                                <p className="text-sm font-medium">{upload.name}</p>
                                {upload.status === 'uploading' && (
                                    <Progress value={upload.progress} className="h-1 mt-1" />
                                )}
                                {upload.status === 'error' && (
                                    <p className="text-xs text-red-500">{upload.error}</p>
                                )}
                            </div>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeUpload(upload.id)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
