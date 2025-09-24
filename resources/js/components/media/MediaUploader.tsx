import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/utils/media';

interface MediaUploaderProps {
    modelType: string;
    modelId: number;
    collection: string;
    maxFiles?: number;
    maxFileSize?: number;
    allowedMimeTypes?: string[];
    onUploadComplete?: () => void;
    className?: string;
}

export function MediaUploader({
    modelType,
    modelId,
    collection,
    maxFiles = 10,
    maxFileSize,
    allowedMimeTypes,
    onUploadComplete,
    className
}: MediaUploaderProps) {
    const [uploadedCount, setUploadedCount] = useState(0);

    const {
        uploading,
        progress,
        uploadMultiple,
        clearProgress,
        removeFromProgress,
        validateFile: _validateFile
    } = useMediaUpload({
        modelType,
        modelId,
        collection,
        maxFileSize,
        allowedMimeTypes,
        onSuccess: () => {
            setUploadedCount(prev => prev + 1);
            if (onUploadComplete) {
                onUploadComplete();
            }
        }
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > maxFiles) {
            alert(`You can only upload up to ${maxFiles} files at a time.`);
            return;
        }

        uploadMultiple(acceptedFiles);
    }, [uploadMultiple, maxFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: allowedMimeTypes ?
            allowedMimeTypes.reduce((acc, mimeType) => {
                acc[mimeType] = [];
                return acc;
            }, {} as Record<string, string[]>)
            : undefined,
        maxSize: maxFileSize,
        multiple: maxFiles > 1
    });

    const progressItems = Object.entries(progress);
    const hasUploads = progressItems.length > 0;

    return (
        <div className={cn('space-y-4', className)}>
            <div
                {...getRootProps()}
                className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
                    uploading && 'pointer-events-none opacity-50'
                )}
            >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600">
                    {isDragActive
                        ? 'Drop the files here...'
                        : `Drag & drop files here, or click to select`}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                    {maxFiles > 1 ? `Up to ${maxFiles} files` : 'Single file only'}
                    {maxFileSize && ` • Max ${formatFileSize(maxFileSize)}`}
                </p>
                {allowedMimeTypes && (
                    <p className="text-xs text-gray-500 mt-1">
                        Allowed types: {allowedMimeTypes.map(type => type.split('/')[1]).join(', ')}
                    </p>
                )}
            </div>

            {hasUploads && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium">Upload Progress</h4>
                        {!uploading && uploadedCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearProgress}
                            >
                                Clear completed
                            </Button>
                        )}
                    </div>

                    {progressItems.map(([fileId, item]) => (
                        <div key={fileId} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(item.file.size)}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2 -mt-1"
                                    onClick={() => removeFromProgress(fileId)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {item.status === 'uploading' && (
                                <Progress value={item.progress} className="h-2" />
                            )}

                            {item.status === 'success' && (
                                <div className="flex items-center text-sm text-green-600">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Upload complete
                                </div>
                            )}

                            {item.status === 'error' && (
                                <div className="flex items-center text-sm text-red-600">
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    {item.error || 'Upload failed'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}