import React from 'react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from '@/components/ui/carousel';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Maximize2, Image as ImageIcon, FileImage } from 'lucide-react';
import { ItemImage } from '@/types/production';
interface ItemImageCarouselDialogProps {
    images: ItemImage[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    startIndex?: number;
    itemName?: string;
}
export function ItemImageCarouselDialog({
    images,
    open,
    onOpenChange,
    startIndex = 0,
    itemName
}: ItemImageCarouselDialogProps) {
    const [currentIndex, setCurrentIndex] = React.useState(startIndex);
    const [carouselApi, setCarouselApi] = React.useState<CarouselApi | null>(null);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const dialogContentRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        setCurrentIndex(startIndex);
    }, [startIndex, open]);
    React.useEffect(() => {
        if (!carouselApi) return;
        carouselApi.on('select', () => {
            setCurrentIndex(carouselApi.selectedScrollSnap());
        });
        return () => {
            carouselApi.off('select');
        };
    }, [carouselApi]);
    // Handle focus when dialog opens
    React.useEffect(() => {
        if (open && dialogContentRef.current) {
            // Delay to ensure dialog is fully rendered
            setTimeout(() => {
                dialogContentRef.current?.focus();
            }, 100);
        }
    }, [open]);
    const handleDownload = (image: ItemImage) => {
        const link = document.createElement('a');
        link.href = image.url;
        link.download = image.filename;
        link.click();
    };
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                ref={dialogContentRef}
                className="max-w-6xl max-h-[90vh] flex flex-col p-0"
                tabIndex={-1}
            >
                <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        {itemName || 'Visualizador de Imagens'}
                    </DialogTitle>
                    <DialogDescription>
                        {images.length} {images.length === 1 ? 'imagem' : 'imagens'} disponível
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Main Image Display */}
                    <div className="flex-1 relative bg-background flex items-center justify-center p-4">
                        <Carousel
                            opts={{
                                startIndex,
                                loop: true,
                            }}
                            setApi={setCarouselApi}
                            className="w-full max-w-5xl"
                        >
                            <CarouselContent>
                                {images.map((image, index) => (
                                    <CarouselItem key={image.id}>
                                        <div className="flex flex-col items-center">
                                            <img
                                                src={image.large_url || image.medium_url || image.url}
                                                alt={image.alt_text || `Imagem ${index + 1}`}
                                                className="max-h-[400px] max-w-full object-contain rounded-lg"
                                            />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="left-4" />
                            <CarouselNext className="right-4" />
                        </Carousel>
                    </div>
                    {/* Image Information */}
                    <div className="px-6 py-4 border-t -mb-4 bg-muted/10">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <FileImage className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{images[currentIndex]?.filename}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>{images[currentIndex]?.width}x{images[currentIndex]?.height}</span>
                                    <span>•</span>
                                    <span>{((images[currentIndex]?.file_size || 0) / 1024).toFixed(0)}KB</span>
                                    <span>•</span>
                                    <span>{images[currentIndex]?.mime_type}</span>
                                </div>
                                {images[currentIndex]?.caption && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {images[currentIndex].caption}
                                    </p>
                                )}
                            </div>
                            <Badge variant="secondary">
                                {currentIndex + 1} de {images.length}
                            </Badge>
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
                    <div className="flex w-full items-center justify-between">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(images[currentIndex])}
                                autoFocus={false}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleFullscreen}
                            >
                                <Maximize2 className="h-4 w-4 mr-2" />
                                Tela Cheia
                            </Button>
                        </div>
                        <Button onClick={() => onOpenChange(false)}>
                            Fechar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}