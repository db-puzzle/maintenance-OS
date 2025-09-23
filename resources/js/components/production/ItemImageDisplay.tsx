import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, ZoomIn, Download, X } from 'lucide-react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { ImageWithBlurEffect } from '@/components/production/ImageWithBlurEffect';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface MediaItem {
    uuid: string;
    name: string;
    file_name: string;
    mime_type: string;
    size: number;
    blurhash?: string;
    responsive_images?: {
        preview?: {
            urls: string[];
        };
        thumb?: {
            urls: string[];
        };
    };
    original_url: string;
    preview_url?: string;
}

interface ItemImageDisplayProps {
    itemId: string;
    media: MediaItem[];
    canEdit: boolean;
    itemName: string;
}

export function ItemImageDisplay({ itemId, media, canEdit, itemName }: ItemImageDisplayProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Get the first (and only) media item
    const image = media?.[0];

    if (!image) {
        return null;
    }

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja remover esta imagem?')) return;

        setDeleting(true);
        router.delete(route('production.items.images.destroy', { item: itemId, image: image.uuid }), {
            onSuccess: () => {
                toast.success('Imagem removida com sucesso');
            },
            onError: () => {
                toast.error('Erro ao remover imagem');
            },
            onFinish: () => {
                setDeleting(false);
            }
        });
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = image.original_url;
        link.download = image.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Get preview URL
    const previewUrl = image.preview_url || image.original_url;
    const responsivePreview = image.responsive_images?.preview?.urls?.[0];
    const displayUrl = responsivePreview || previewUrl;

    return (
        <>
            <div className="relative group rounded-lg overflow-hidden bg-muted max-w-lg mx-auto">
                <ImageWithBlurEffect
                    src={displayUrl}
                    alt={itemName}
                    blurhash={image.blurhash || undefined}
                    className="w-full h-64 object-cover cursor-pointer transition-transform group-hover:scale-105"
                    containerClassName="w-full h-64"
                    onClick={() => setShowPreview(true)}
                />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowPreview(true)}
                    >
                        <ZoomIn className="h-4 w-4 mr-2" />
                        Visualizar
                    </Button>

                    {canEdit && (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover
                        </Button>
                    )}
                </div>
            </div>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{itemName}</DialogTitle>
                    </DialogHeader>
                    <div className="relative">
                        <ImageWithBlurEffect
                            src={image.original_url}
                            alt={itemName}
                            blurhash={image.blurhash || undefined}
                            className="w-full h-auto max-h-[70vh] object-contain"
                            containerClassName="w-full"
                        />
                        <div className="absolute top-4 right-4 flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleDownload}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setShowPreview(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
