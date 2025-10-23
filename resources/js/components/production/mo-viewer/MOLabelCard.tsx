import React from 'react';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';

export interface MOLabelCardProps {
    orderNumber: string;
    level: number;
    isParent?: boolean;
    hasChildren?: boolean;
    className?: string;
}

/**
 * MOLabelCard - Displays MO number in a card with hierarchical indentation
 * Matches the size of step cards for visual consistency
 */
export function MOLabelCard({
    orderNumber,
    level,
    isParent = false,
    hasChildren = false,
    className
}: MOLabelCardProps) {
    return (
        <div
            className={cn(
                // Match step card size: w-40 h-16
                "w-40 h-16 px-3 py-2",
                "rounded-md border",
                "bg-background shadow-sm",
                "flex flex-col justify-center",
                isParent ? "border-primary/50" : "border-border",
                className
            )}
        >
            <div className="flex items-center gap-2">
                <Package className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isParent ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                    <div className={cn(
                        "text-sm truncate",
                        hasChildren && "font-medium"
                    )} title={orderNumber}>
                        {orderNumber}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Manufacturing Order
                    </div>
                </div>
            </div>
        </div>
    );
}
