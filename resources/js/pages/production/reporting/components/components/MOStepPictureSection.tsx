import React from 'react';
import { ManufacturingOrder } from '@/types/production';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Package, Image, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MOStepPictureSectionProps {
    order: ManufacturingOrder;
    photos: Media[];
    selectedPhotoIndex: number | null;
    showingStepPhotos: boolean;
    onPhotoSelect: (index: number) => void;
    onToggleStepPhotos: () => void;
}

export function MOStepPictureSection({
    order,
    photos,
    selectedPhotoIndex,
    showingStepPhotos,
    onPhotoSelect,
    onToggleStepPhotos
}: MOStepPictureSectionProps) {
    const handlePrevPhoto = () => {
        if (showingStepPhotos && photos.length > 0) {
            const currentIndex = selectedPhotoIndex ?? 0;
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
            onPhotoSelect(prevIndex);
        }
    };

    const handleNextPhoto = () => {
        if (showingStepPhotos && photos.length > 0) {
            const currentIndex = selectedPhotoIndex ?? 0;
            const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
            onPhotoSelect(nextIndex);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header - matching StepNavigator design */}
            <div className="bg-background flex-shrink-0 mb-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Image className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <h3 className="text-sm font-medium">{order.item?.name || 'Item'}</h3>
                            <p className="text-xs text-muted-foreground">
                                {showingStepPhotos && photos.length > 0
                                    ? `Foto ${(selectedPhotoIndex ?? 0) + 1} de ${photos.length}`
                                    : 'Imagem do item'}
                            </p>
                        </div>
                    </div>
                    {photos.length > 0 && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7"
                                onClick={handlePrevPhoto}
                                disabled={!showingStepPhotos}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7"
                                onClick={handleNextPhoto}
                                disabled={!showingStepPhotos}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                {/* Image area */}
                <div className="flex-1 flex items-center justify-center min-h-0 p-4">
                    {showingStepPhotos && photos.length > 0 && selectedPhotoIndex !== null ? (
                        <div className="relative h-full w-full flex items-center justify-center">
                            <div className="absolute inset-0 bg-background/40 blur-2xl rounded-full scale-150" />
                            <img
                                src={photos[selectedPhotoIndex]?.url}
                                alt={`Step photo ${selectedPhotoIndex + 1}`}
                                className="relative max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            />
                        </div>
                    ) : (order.item?.primary_image_url || order.item?.media?.[0]?.original_url) ? (
                        <div className="relative h-full w-full flex items-center justify-center">
                            <div className="absolute inset-0 bg-background/40 blur-2xl rounded-full scale-150" />
                            <img
                                src={order.item.primary_image_url || order.item.media?.[0]?.original_url}
                                alt={order.item.name}
                                className="relative max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center">
                            <Package className="h-20 w-20 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground mt-2">No image available</p>
                        </div>
                    )}
                </div>

                {/* Bottom controls */}
                <div className="flex-shrink-0 pb-4">
                    {showingStepPhotos && photos.length > 0 && selectedPhotoIndex !== null && (
                        <div className="text-center mb-2">
                            <p className="text-sm font-medium">PICTURE {selectedPhotoIndex + 1}</p>
                            <p className="text-xs text-muted-foreground">Step Photo</p>
                        </div>
                    )}

                    {photos.length > 0 && (
                        <div className="text-center">
                            <Button
                                variant="ghost"
                                className="text-sm text-muted-foreground"
                                onClick={onToggleStepPhotos}
                            >
                                {showingStepPhotos ? 'SHOW ITEM' : 'SHOW PICTURES'}
                            </Button>

                            {showingStepPhotos && (
                                <div className="flex gap-2 mt-2 justify-center">
                                    {photos.map((_, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "w-2 h-2 rounded-full bg-muted-foreground/30 cursor-pointer",
                                                selectedPhotoIndex === index && "bg-primary"
                                            )}
                                            onClick={() => onPhotoSelect(index)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
