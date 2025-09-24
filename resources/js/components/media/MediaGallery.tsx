import React, { useState } from 'react';
import { Media } from '@/utils/media';
import { MediaDisplay } from './MediaDisplay';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { router } from '@inertiajs/react';

interface MediaGalleryProps {
    media: Media[];
    modelType: string;
    modelId: number;
    canDelete?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    columns?: number;
}

export function MediaGallery({
    media,
    modelType: _modelType,
    modelId: _modelId,
    canDelete = false,
    className,
    size = 'md',
    columns = 4
}: MediaGalleryProps) {
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleDelete = async (mediaItem: Media) => {
        if (!confirm('Are you sure you want to delete this file?')) {
            return;
        }

        setDeletingId(mediaItem.id);

        router.delete(`/api/media/${mediaItem.id}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setDeletingId(null);
            },
            onError: () => {
                setDeletingId(null);
                alert('Failed to delete file');
            }
        });
    };

    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        5: 'grid-cols-5',
        6: 'grid-cols-6',
    };

    if (media.length === 0) {
        return (
            <div className={cn('text-center py-8 text-gray-500', className)}>
                No files uploaded yet
            </div>
        );
    }

    return (
        <>
            <div className={cn(`grid gap-4 ${gridCols[columns as keyof typeof gridCols] || 'grid-cols-4'}`, className)}>
                {media.map((item) => (
                    <div key={item.id} className="relative group">
                        <MediaDisplay
                            media={item}
                            size={size}
                            showInfo={size !== 'sm'}
                            onClick={() => setSelectedMedia(item)}
                        />

                        {canDelete && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`/api/media/${item.id}/download`, '_blank');
                                    }}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(item);
                                    }}
                                    disabled={deletingId === item.id}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {selectedMedia && (
                <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>{selectedMedia.file_name}</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <MediaDisplay
                                media={selectedMedia}
                                size="lg"
                                showInfo={true}
                            />
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => window.open(`/api/media/${selectedMedia.id}/download`, '_blank')}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                            {canDelete && (
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        handleDelete(selectedMedia);
                                        setSelectedMedia(null);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}