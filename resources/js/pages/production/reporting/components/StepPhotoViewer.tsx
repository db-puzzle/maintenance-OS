import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Photo {
    id: number;
    url: string;
    display_url?: string;
    uploaded_at?: string;
}

interface StepPhotoViewerProps {
    photos: Photo[];
    selectedIndex: number;
    onIndexChange: (index: number) => void;
    onDelete?: (photoId: number) => void;
    onExpand?: (photoUrl: string) => void;
}

export function StepPhotoViewer({
    photos,
    selectedIndex,
    onIndexChange,
    onDelete,
    onExpand
}: StepPhotoViewerProps) {
    const currentPhoto = photos[selectedIndex];

    const handlePrevious = () => {
        onIndexChange(selectedIndex > 0 ? selectedIndex - 1 : photos.length - 1);
    };

    const handleNext = () => {
        onIndexChange(selectedIndex < photos.length - 1 ? selectedIndex + 1 : 0);
    };

    if (!currentPhoto) return null;

    return (
        <div className="relative h-full flex flex-col">
            {/* Main Image */}
            <div className="flex-1 relative bg-gray-50 rounded overflow-hidden">
                <img
                    src={currentPhoto.display_url || currentPhoto.url}
                    alt={`Step photo ${selectedIndex + 1}`}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => onExpand?.(currentPhoto.url)}
                />

                {/* Navigation Arrows */}
                {photos.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2"
                            onClick={handlePrevious}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={handleNext}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-2">
                    {onExpand && (
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => onExpand(currentPhoto.url)}
                        >
                            <Expand className="h-4 w-4" />
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => onDelete(currentPhoto.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
                <div className="flex gap-2 mt-2 justify-center">
                    {photos.map((photo, index) => (
                        <button
                            key={photo.id}
                            className={cn(
                                "w-16 h-16 rounded overflow-hidden border-2 transition-colors",
                                index === selectedIndex
                                    ? "border-primary"
                                    : "border-transparent hover:border-gray-300"
                            )}
                            onClick={() => onIndexChange(index)}
                        >
                            <img
                                src={photo.display_url || photo.url}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Photo Info */}
            <div className="text-xs text-muted-foreground text-center mt-2">
                Photo {selectedIndex + 1} of {photos.length}
                {currentPhoto.uploaded_at && (
                    <span> • {new Date(currentPhoto.uploaded_at).toLocaleString()}</span>
                )}
            </div>
        </div>
    );
}
