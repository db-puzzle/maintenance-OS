import React from 'react';
import { ImportFile } from '../types';
import { formatBytes } from '@/utils/format';
import { cn } from '@/lib/utils';
import { X, FileImage } from 'lucide-react';

interface SimpleFileGridProps {
    files: ImportFile[];
    onRemoveFile: (filename: string) => void;
}

export function SimpleFileGrid({ files, onRemoveFile }: SimpleFileGridProps) {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 w-full">
            {files.map((file, index) => (
                <FilePreview
                    key={`${file.filename}-${index}`}
                    file={file}
                    onRemove={() => onRemoveFile(file.filename)}
                />
            ))}
        </div>
    );
}

interface FilePreviewProps {
    file: ImportFile;
    onRemove: () => void;
}

function FilePreview({ file, onRemove }: FilePreviewProps) {
    return (
        <div className="relative group">
            {/* Remove button */}
            <button
                onClick={onRemove}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600 shadow-md"
                aria-label={`Remove ${file.filename}`}
            >
                <X className="h-4 w-4" />
            </button>

            {/* Image preview directly on canvas */}
            <div className={cn(
                "aspect-square rounded-lg overflow-hidden relative",
                {
                    'ring-2 ring-red-500': !file.valid,
                }
            )}>
                {file.preview ? (
                    <img
                        src={file.preview}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <FileImage className="h-12 w-12 text-gray-400" />
                    </div>
                )}

                {/* Overlay with file info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                    <p className="text-white text-sm font-medium truncate" title={file.filename}>
                        {file.filename}
                    </p>
                    <p className="text-white/80 text-xs">{formatBytes(file.size)}</p>
                </div>
            </div>

            {/* Error messages below image */}
            {file.errors.length > 0 && (
                <div className="mt-2 space-y-0.5">
                    {file.errors.map((error, index) => (
                        <p key={index} className="text-xs text-red-600 line-clamp-2">
                            {error}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
