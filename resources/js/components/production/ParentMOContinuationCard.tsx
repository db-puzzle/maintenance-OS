import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { ArrowRightCircle } from 'lucide-react';
import { ManufacturingOrder } from '@/types/production';

interface ParentMOContinuationCardProps {
    parentMO: Pick<ManufacturingOrder, 'id' | 'order_number' | 'item'>;
    onClick: () => void;
    className?: string;
    showConnectionLine?: boolean;
}

export function ParentMOContinuationCard({
    parentMO,
    onClick,
    className,
    showConnectionLine = true
}: ParentMOContinuationCardProps) {
    return (
        <div className={cn("relative flex justify-center", className)}>
            {/* Connection line from previous gate */}
            {showConnectionLine && (
                <div className="absolute left-1/2 -top-8 w-0.5 h-8 bg-border -translate-x-1/2" />
            )}

            <Card
                variant="compact"
                className={cn(
                    "relative cursor-pointer transition-all duration-200",
                    "border-dashed border-2 bg-muted/10 hover:bg-muted/20",
                    "hover:shadow-md hover:scale-[1.02]"
                )}
                onClick={onClick}
            >
                <div className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <ArrowRightCircle className="h-5 w-5 text-primary" />
                        </div>
                    </div>

                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                            Continue to Parent MO
                        </p>
                        <div className="font-medium mt-0.5">
                            {parentMO.order_number}
                            {parentMO.item && (
                                <span className="text-muted-foreground ml-2">
                                    • {parentMO.item.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
