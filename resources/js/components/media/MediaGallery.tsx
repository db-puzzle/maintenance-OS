import React, { useState } from 'react';
import { Media } from '@/types/media';
import { Image as ImageIcon, File, Download, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import axios from 'axios';

interface MediaGalleryProps {
    media: Media[];
    collection?: string;
    canDelete?: boolean;
    onDelete?: (media: Media) => void;
    onMediaClick?: (media: Media) => void;
    className?: string;
}

export function MediaGallery({
    media,
    collection,
    canDelete = false,
    onDelete,
    onMediaClick,
    className,
}: MediaGalleryProps) {
    const [deleteTarget, setDeleteTarget] = useState<Media | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isImage = (mimeType: string) => mimeType.startsWith('image/');

    const handleDelete = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);

        try {
            await axios.delete(`/api/media/secure/${deleteTarget.id}`);

            if (onDelete) {
                onDelete(deleteTarget);
            }

            setDeleteTarget(null);
        } catch (error) {
            console.error('Failed to delete media:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredMedia = collection
        ? media.filter(m => m.collection === collection)
        : media;

    if (filteredMedia.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No files uploaded yet</p>
            </div>
        );
    }

    return (
        <>
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className || ''}`}>
                {filteredMedia.map((item) => (
                    <div
                        key={item.id}
                        className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                        <div
                            className="aspect-square cursor-pointer bg-gray-50"
                            onClick={() => onMediaClick?.(item)}
                        >
                            {isImage(item.mime_type) && item.conversions?.thumb ? (
                                <img
                                    src={item.conversions.thumb}
                                    alt={item.alt_text || item.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                    <File className="h-12 w-12 text-gray-400" />
                                </div>
                            )}

                            {item.is_primary && (
                                <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                                    Primary
                                </div>
                            )}
                        </div>

                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex space-x-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMediaClick?.(item);
                                    }}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(item.url, '_blank');
                                    }}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>

                                {canDelete && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteTarget(item);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="p-2">
                            <p className="text-xs truncate" title={item.name}>{item.name}</p>
                            <p className="text-xs text-gray-500">{item.human_readable_size}</p>
                        </div>
                    </div>
                ))}
            </div>

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete File</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
