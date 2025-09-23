import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Upload,
    Camera,
    Shield,
    ShieldCheck,
    ShieldOff,
    Download,
    Trash2,
    Eye,
    EyeOff,
    Info,
    RefreshCw,
    Hash
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { ImageWithBlurEffect } from '@/components/production/ImageWithBlurEffect';
import { SingleImageUploader } from '@/components/production/SingleImageUploader';
import EmptyCard from '@/components/ui/empty-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MediaItem {
    uuid: string;
    name: string;
    file_name: string;
    mime_type: string;
    size: number;
    human_readable_size?: string;
    blurhash?: string;
    file_hash?: string;
    width?: number;
    height?: number;
    aspect_ratio?: number;
    dominant_color?: string;
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

interface ItemImageTabProps {
    itemId: string;
    media?: MediaItem[];
    canEdit: boolean;
    itemName: string;
    onReload?: () => void;
}

export function ItemImageTab({ itemId, media, canEdit, itemName, onReload }: ItemImageTabProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showUploader, setShowUploader] = useState(false);

    // Get the first (and only) media item
    const image = media?.[0];

    const handleDelete = async () => {
        if (!image || !confirm('Tem certeza que deseja remover esta imagem?')) return;

        setDeleting(true);
        router.delete(route('production.items.images.destroy', { item: itemId, image: image.uuid }), {
            onSuccess: () => {
                toast.success('Imagem removida com sucesso');
                onReload?.();
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
        if (!image) return;

        const link = document.createElement('a');
        link.href = image.original_url;
        link.download = image.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUploadComplete = () => {
        setShowUploader(false);
        onReload?.();
    };

    // Determine file hash status
    const getFileHashStatus = () => {
        if (!image) return null;

        if (image.file_hash) {
            return {
                icon: ShieldCheck,
                label: 'Hash de Arquivo',
                color: 'text-green-600',
                bgColor: 'bg-green-100',
                description: 'Hash SHA-256 do arquivo gerado - integridade verificada'
            };
        } else {
            return {
                icon: Hash,
                label: 'Hash de Arquivo',
                color: 'text-gray-500',
                bgColor: 'bg-gray-100',
                description: 'Hash SHA-256 não gerado - aguardando processamento'
            };
        }
    };

    // Determine blur hash status
    const getBlurHashStatus = () => {
        if (!image) return null;

        if (image.blurhash) {
            return {
                icon: Eye,
                label: 'BlurHash',
                color: 'text-blue-600',
                bgColor: 'bg-blue-100',
                description: 'BlurHash gerado - pré-visualização rápida disponível'
            };
        } else {
            return {
                icon: EyeOff,
                label: 'BlurHash',
                color: 'text-gray-500',
                bgColor: 'bg-gray-100',
                description: 'BlurHash não gerado - aguardando processamento'
            };
        }
    };

    const fileHashStatus = getFileHashStatus();
    const blurHashStatus = getBlurHashStatus();

    if (!image && !canEdit) {
        return (
            <div className="py-6">
                <EmptyCard
                    icon={Camera}
                    title="Nenhuma imagem"
                    description="Ainda não há imagem enviada para este item"
                />
            </div>
        );
    }

    return (
        <div className="py-6 space-y-6">
            {image ? (
                <>
                    {/* Main Image Display */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Imagem do Item</CardTitle>
                                    <CardDescription>
                                        {image.file_name} • {image.human_readable_size || `${(image.size / 1024).toFixed(0)}KB`}
                                    </CardDescription>
                                </div>

                                {/* Hash Status Badges */}
                                <div className="flex gap-2">
                                    {fileHashStatus && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "gap-1.5 px-3 py-1.5",
                                                            fileHashStatus.color,
                                                            fileHashStatus.bgColor
                                                        )}
                                                    >
                                                        <fileHashStatus.icon className="h-4 w-4" />
                                                        {fileHashStatus.label}
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{fileHashStatus.description}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}

                                    {blurHashStatus && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "gap-1.5 px-3 py-1.5",
                                                            blurHashStatus.color,
                                                            blurHashStatus.bgColor
                                                        )}
                                                    >
                                                        <blurHashStatus.icon className="h-4 w-4" />
                                                        {blurHashStatus.label}
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{blurHashStatus.description}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="relative group rounded-lg overflow-hidden bg-muted flex items-center justify-center p-4">
                                <ImageWithBlurEffect
                                    src={image.original_url}
                                    alt={itemName}
                                    blurhash={image.blurhash || undefined}
                                    className="max-w-full max-h-[600px] w-auto h-auto object-contain cursor-pointer"
                                    containerClassName="flex items-center justify-center"
                                    onClick={() => setShowPreview(true)}
                                />

                                {/* Hover Overlay with Actions */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setShowPreview(true)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ampliar
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={handleDownload}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Baixar
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

                            {/* Image Metadata */}
                            {image.width && image.height && (
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Info className="h-4 w-4" />
                                        <span>{image.width} × {image.height}px</span>
                                    </div>
                                    {image.aspect_ratio && (
                                        <span>• Proporção {image.aspect_ratio.toFixed(2)}:1</span>
                                    )}
                                    {image.dominant_color && (
                                        <div className="flex items-center gap-1">
                                            <span>• Cor dominante:</span>
                                            <div
                                                className="w-4 h-4 rounded border border-gray-300"
                                                style={{ backgroundColor: image.dominant_color }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Replace Image Section */}
                    {canEdit && (
                        <>
                            <Separator />
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <RefreshCw className="h-5 w-5" />
                                        Substituir Imagem
                                    </CardTitle>
                                    <CardDescription>
                                        Enviar uma nova imagem substituirá a existente
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {!showUploader ? (
                                        <Button
                                            onClick={() => setShowUploader(true)}
                                            className="w-full"
                                            size="lg"
                                        >
                                            <Upload className="h-5 w-5 mr-2" />
                                            Selecionar Nova Imagem
                                        </Button>
                                    ) : (
                                        <SingleImageUploader
                                            itemId={itemId}
                                            onUploadComplete={handleUploadComplete}
                                            onCancel={() => setShowUploader(false)}
                                            isReplacing={true}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </>
            ) : (
                /* No Image - Upload Section */
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5" />
                            Adicionar Imagem
                        </CardTitle>
                        <CardDescription>
                            Adicione uma imagem para ajudar a identificar este item
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SingleImageUploader
                            itemId={itemId}
                            onUploadComplete={handleUploadComplete}
                            isReplacing={false}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Preview Dialog */}
            {image && (
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-0">
                            <DialogTitle>{itemName}</DialogTitle>
                        </DialogHeader>
                        <div className="relative p-6 pt-2 flex items-center justify-center">
                            <ImageWithBlurEffect
                                src={image.original_url}
                                alt={itemName}
                                blurhash={image.blurhash || undefined}
                                className="max-w-full max-h-[calc(80vh-120px)] w-auto h-auto object-contain rounded-lg"
                                containerClassName="flex items-center justify-center"
                            />
                            <div className="absolute top-8 right-8 flex gap-2">
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    onClick={handleDownload}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
