import React from 'react';
import { ManufacturingOrder } from '@/types/production';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
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
        <div className="flex flex-col h-[280px] overflow-hidden">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <h3 className="text-base font-semibold uppercase">{order.item?.name || 'PICTURE'}</h3>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8"
                        onClick={handlePrevPhoto}
                        disabled={!showingStepPhotos || photos.length === 0}
                    >
                        <span className="text-xl">‹</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8"
                        onClick={handleNextPhoto}
                        disabled={!showingStepPhotos || photos.length === 0}
                    >
                        <span className="text-xl">›</span>
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                {showingStepPhotos && photos.length > 0 && selectedPhotoIndex !== null ? (
                    <div className="flex flex-col items-center justify-center h-full w-full relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg" />
                        <div className="relative flex-1 w-full flex items-center justify-center p-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-background/40 blur-2xl rounded-full scale-150" />
                                <img
                                    src={photos[selectedPhotoIndex]?.url}
                                    alt={`Step photo ${selectedPhotoIndex + 1}`}
                                    className="relative max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                />
                            </div>
                        </div>
                        <div className="text-center mt-4 flex-shrink-0 relative z-10">
                            <p className="text-sm font-medium">PICTURE {selectedPhotoIndex + 1}</p>
                            <p className="text-xs text-muted-foreground">Step Photo</p>
                        </div>
                    </div>
                ) : (order.item?.primary_image_url || order.item?.media?.[0]?.original_url) ? (
                    <div className="flex flex-col items-center justify-center h-full w-full relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg" />
                        <div className="relative flex-1 w-full flex items-center justify-center p-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-background/40 blur-2xl rounded-full scale-150" />
                                <img
                                    src={order.item.primary_image_url || order.item.media?.[0]?.original_url}
                                    alt={order.item.name}
                                    className="relative max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg" />
                        <div className="relative">
                            <Package className="h-20 w-20 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground mt-2">No image available</p>
                        </div>
                    </div>
                )}

                {photos.length > 0 && (
                    <div className="mt-6 text-center">
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
    );
}
