import React from 'react';
import { AlertTriangle, Loader2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SaveActionBarProps {
    changeCount: number;
    changeType: 'route' | 'mo' | 'combined';
    onCancel: () => void;
    onSave: () => void;
    isSaving: boolean;
    position?: 'top' | 'bottom';
    className?: string;
    // Additional props for combined mode
    routeChangeCount?: number;
    moChangeCount?: number;
}

export function SaveActionBar({
    changeCount,
    changeType,
    onCancel,
    onSave,
    isSaving,
    position = 'top',
    className,
    routeChangeCount = 0,
    moChangeCount = 0
}: SaveActionBarProps) {
    if (changeCount === 0) return null;

    const getMessage = () => {
        if (changeType === 'combined') {
            const parts = [];
            if (routeChangeCount > 0) {
                parts.push(`${routeChangeCount} MO${routeChangeCount > 1 ? 's' : ''} with route changes`);
            }
            if (moChangeCount > 0) {
                parts.push(`${moChangeCount} MO${moChangeCount > 1 ? 's' : ''} with priority changes`);
            }
            return parts.join(' and ');
        }
        if (changeType === 'route') {
            return `${changeCount} unsaved route change${changeCount > 1 ? 's' : ''}`;
        }
        return `${changeCount} MO priority change${changeCount > 1 ? 's' : ''}`;
    };

    const getSaveButtonText = () => {
        if (isSaving) return 'Saving...';
        if (changeType === 'combined') return 'Save All';
        return changeType === 'route' ? 'Save Route' : 'Save MOs';
    };

    return (
        <div
            className={cn(
                "fixed z-50 left-1/2 -translate-x-1/2",
                "bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700",
                "px-6 py-3 flex items-center gap-4",
                "animate-in slide-in-from-top-2 fade-in duration-300",
                position === 'top' ? "top-4" : "bottom-4",
                className
            )}
        >
            {/* Warning Icon and Message */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {getMessage()}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        Changes will be lost if you navigate away
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="default"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <X className="h-4 w-4" />
                    Cancel
                </Button>
                <Button
                    variant="default"
                    size="default"
                    onClick={onSave}
                    disabled={isSaving}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    {getSaveButtonText()}
                </Button>
            </div>
        </div>
    );
}
