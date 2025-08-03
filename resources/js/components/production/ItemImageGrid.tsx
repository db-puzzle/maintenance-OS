import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Star, Trash2, Edit, GripVertical, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ItemImageCarouselDialog } from '@/components/production/ItemImageCarouselDialog';
import { ImageWithBlurEffect } from '@/components/production/ImageWithBlurEffect';
import { cn } from '@/lib/utils';
import { ItemImage } from '@/types/production';
interface ItemImageGridProps {
    itemId: string;
    images: ItemImage[];
    canEdit: boolean;
    itemName?: string;
}
export function ItemImageGrid({ itemId, images, canEdit, itemName }: ItemImageGridProps) {
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [editingImage, setEditingImage] = useState<ItemImage | null>(null);
    const [carouselOpen, setCarouselOpen] = useState(false);
    const [carouselStartIndex, setCarouselStartIndex] = useState(0);
    const handleSelectImage = (imageId: string) => {
        setSelectedImages(prev =>
            prev.includes(imageId)
                ? prev.filter(id => id !== imageId)
                : [...prev, imageId]
        );
    };
    const handleSetPrimary = (image: ItemImage) => {
        router.patch(route('production.items.images.update', [itemId, image.id]), {
            is_primary: true,
        });
    };
    const handleDeleteImage = (image: ItemImage) => {
        if (confirm('Tem certeza que deseja excluir esta imagem?')) {
            router.delete(route('production.items.images.destroy', [itemId, image.id]));
        }
    };
    const handleBulkDelete = () => {
        if (confirm(`Tem certeza que deseja excluir ${selectedImages.length} imagens?`)) {
            router.post(route('production.items.images.bulk-delete', itemId), {
                image_ids: selectedImages,
            }, {
                onSuccess: () => setSelectedImages([]),
            });
        }
    };
    const handleSaveEdit = () => {
        if (!editingImage) return;
        router.patch(route('production.items.images.update', [itemId, editingImage.id]), {
            alt_text: editingImage.alt_text,
            caption: editingImage.caption,
        }, {
            onSuccess: () => setEditingImage(null),
        });
    };
    const openCarousel = (index: number) => {
        setCarouselStartIndex(index);
        setCarouselOpen(true);
    };
    return (
        <>
            {canEdit && selectedImages.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                        {selectedImages.length} imagem{selectedImages.length !== 1 ? 'ns' : ''} selecionada{selectedImages.length !== 1 ? 's' : ''}
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Selecionadas
                    </Button>
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image, index) => (
                    <div
                        key={image.id}
                        className={cn(
                            "relative group border rounded-lg overflow-hidden",
                            image.is_primary && "ring-2 ring-primary"
                        )}
                    >
                        <ImageWithBlurEffect
                            src={image.thumbnail_url || image.url}
                            alt={image.alt_text || `Imagem do item ${index + 1}`}
                            containerClassName="w-full h-48"
                            onClick={() => openCarousel(index)}
                        />
                        {canEdit && (
                            <div className="absolute top-2 left-2 z-20">
                                <Checkbox
                                    checked={selectedImages.includes(image.id)}
                                    onCheckedChange={() => handleSelectImage(image.id)}
                                    className="bg-white/80"
                                />
                            </div>
                        )}
                        {image.is_primary && (
                            <div className="absolute top-2 right-2 z-20 bg-primary text-white px-2 py-1 rounded text-xs flex items-center">
                                <Star className="h-3 w-3 mr-1" />
                                Principal
                            </div>
                        )}
                        <div className="p-3">
                            <p className="text-sm font-medium truncate">{image.filename}</p>
                            <p className="text-xs text-gray-500">
                                {image.width}x{image.height} • {(image.file_size / 1024).toFixed(0)}KB
                            </p>
                            {image.caption && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {image.caption}
                                </p>
                            )}
                        </div>
                        {canEdit && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {!image.is_primary && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSetPrimary(image);
                                        }}
                                    >
                                        <Star className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingImage(image);
                                    }}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteImage(image);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Detalhes da Imagem</DialogTitle>
                        <DialogDescription>
                            Atualize o texto alternativo e a legenda desta imagem.
                        </DialogDescription>
                    </DialogHeader>
                    {editingImage && (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="alt_text">Texto Alternativo</Label>
                                <Input
                                    id="alt_text"
                                    value={editingImage.alt_text || ''}
                                    onChange={(e) => setEditingImage({
                                        ...editingImage,
                                        alt_text: e.target.value,
                                    })}
                                    placeholder="Descreva esta imagem para acessibilidade"
                                />
                            </div>
                            <div>
                                <Label htmlFor="caption">Legenda</Label>
                                <Textarea
                                    id="caption"
                                    value={editingImage.caption || ''}
                                    onChange={(e) => setEditingImage({
                                        ...editingImage,
                                        caption: e.target.value,
                                    })}
                                    placeholder="Legenda opcional para esta imagem"
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingImage(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ItemImageCarouselDialog
                images={images}
                open={carouselOpen}
                onOpenChange={setCarouselOpen}
                startIndex={carouselStartIndex}
                itemName={itemName}
            />
        </>
    );
}