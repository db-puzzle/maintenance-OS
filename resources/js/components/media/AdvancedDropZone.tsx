import React, { useState, useCallback, useRef } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, Image, FileText, Film, Music, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdvancedDropZoneProps {
    onDrop: (files: File[]) => void;
    accept?: Record<string, string[]>;
    maxSize?: number;
    maxFiles?: number;
    disabled?: boolean;
    currentFiles?: number;
}

export function AdvancedDropZone({
    onDrop,
    accept = {
        'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
        'application/pdf': ['.pdf'],
    },
    maxSize = 50 * 1024 * 1024,
    maxFiles = 100,
    disabled = false,
    currentFiles = 0,
}: AdvancedDropZoneProps) {
    const [dragDepth, setDragDepth] = useState(0);
    const dragCounter = useRef(0);

    const handleRejections = useCallback((rejectedFiles: FileRejection[]) => {
        rejectedFiles.forEach((rejection) => {
            let message = `File "${rejection.file.name}" was rejected: `;

            rejection.errors.forEach((error) => {
                switch (error.code) {
                    case 'file-too-large':
                        message += `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`;
                        break;
                    case 'file-invalid-type':
                        message += 'File type not accepted';
                        break;
                    case 'too-many-files':
                        message += `Maximum ${maxFiles} files allowed`;
                        break;
                    default:
                        message += error.message;
                }
            });

            toast.error(message);
        });
    }, [maxSize, maxFiles]);

    const handleDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
        setDragDepth(0);
        dragCounter.current = 0;

        if (rejectedFiles.length > 0) {
            handleRejections(rejectedFiles);
        }

        if (acceptedFiles.length > 0) {
            onDrop(acceptedFiles);
        }
    }, [onDrop, handleRejections]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop: handleDrop,
        accept,
        maxSize,
        maxFiles: maxFiles - currentFiles,
        disabled,
        multiple: true,
        onDragEnter: () => {
            dragCounter.current++;
            setDragDepth(dragCounter.current);
        },
        onDragLeave: () => {
            dragCounter.current--;
            setDragDepth(Math.max(0, dragCounter.current));
        },
    });

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return Image;
        if (type === 'application/pdf') return FileText;
        if (type.startsWith('video/')) return Film;
        if (type.startsWith('audio/')) return Music;
        return Archive;
    };

    const { onDragStart, onDrag, onDragEnd, onAnimationStart, ...rootProps } = getRootProps();

    return (
        <motion.div
            {...rootProps}
            className={cn(
                'relative overflow-hidden rounded-xl border-2 border-dashed p-8',
                'transition-all duration-300 cursor-pointer',
                isDragActive && !isDragReject && 'border-primary bg-primary/5 scale-[1.02]',
                isDragReject && 'border-red-500 bg-red-50 dark:bg-red-900/20',
                disabled && 'opacity-50 cursor-not-allowed',
                !isDragActive && !disabled && 'hover:border-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
            )}
            animate={{
                scale: dragDepth > 0 ? 1.02 : 1,
            }}
        >
            <input {...getInputProps()} />

            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="h-full w-full" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.05) 10px, rgba(0,0,0,.05) 20px)`,
                }} />
            </div>

            {/* Drop indicator overlay */}
            <AnimatePresence>
                {isDragActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
                    >
                        <div className="text-center">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <Upload className={cn(
                                    "mx-auto h-16 w-16",
                                    isDragReject ? "text-red-500" : "text-primary"
                                )} />
                            </motion.div>
                            <p className="mt-4 text-lg font-medium">
                                {isDragReject ? 'Invalid files' : 'Drop files here'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content */}
            <div className="relative z-0 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Upload className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>

                <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Drop files here or click to browse
                </p>

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {Object.entries(accept).map(([type, exts]) => (
                        <span key={type} className="inline-flex items-center gap-1 mx-1">
                            {React.createElement(getFileIcon(type), { className: 'h-3 w-3' })}
                            {exts.join(', ')}
                        </span>
                    ))}
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Up to {maxFiles - currentFiles} files, {Math.round(maxSize / 1024 / 1024)}MB each
                </p>
            </div>
        </motion.div>
    );
}
