import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Expand } from 'lucide-react';

interface ImageZoomProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
}

export function ImageZoom({ src, alt, className, ...props }: ImageZoomProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
    };

    return (
        <>
            <div className="relative inline-block group" {...props}>
                <img
                    src={src}
                    alt={alt}
                    className={cn("cursor-zoom-in", className)}
                    onClick={handleClick}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded pointer-events-none" />
                <Expand className="absolute top-1 right-1 w-4 h-4 text-white bg-black/50 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
                    <img
                        src={src}
                        alt={alt}
                        className="w-full h-full object-contain"
                        onClick={() => setIsOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
