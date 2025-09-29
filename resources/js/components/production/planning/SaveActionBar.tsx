import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

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
    // Modal mode props
    modalMode?: boolean;
    modalType?: 'mo-switch' | 'navigation' | 'discard';
    onModalDiscardChanges?: () => void;
    onModalCancel?: () => void;
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
    moChangeCount = 0,
    modalMode = false,
    modalType = 'navigation',
    onModalDiscardChanges,
    onModalCancel
}: SaveActionBarProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [showBackdrop, setShowBackdrop] = useState(false);

    useEffect(() => {
        if (modalMode) {
            // Small delay to ensure smooth animation
            const timer = setTimeout(() => {
                setIsAnimating(true);
                setShowBackdrop(true);
            }, 10);
            return () => clearTimeout(timer);
        } else {
            setIsAnimating(false);
            setShowBackdrop(false);
        }
    }, [modalMode]);

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

    const getModalTitle = () => {
        switch (modalType) {
            case 'mo-switch':
                return 'Unsaved Route Changes';
            case 'navigation':
                return 'Unsaved Changes';
            case 'discard':
                return 'Discard Changes?';
        }
    };

    const getModalDescription = () => {
        switch (modalType) {
            case 'mo-switch':
                return 'You have unsaved changes to the current manufacturing order\'s route. What would you like to do?';
            case 'navigation':
                return (
                    <div className="space-y-2">
                        <p>You have unsaved changes that will be lost if you leave this page.</p>
                        {(routeChangeCount > 0 || moChangeCount > 0) && (
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {routeChangeCount > 0 && (
                                    <li>{routeChangeCount} route change{routeChangeCount > 1 ? 's' : ''}</li>
                                )}
                                {moChangeCount > 0 && (
                                    <li>{moChangeCount} priority change{moChangeCount > 1 ? 's' : ''}</li>
                                )}
                            </ul>
                        )}
                    </div>
                );
            case 'discard':
                return 'Are you sure you want to discard all unsaved changes? This action cannot be undone.';
        }
    };

    const getSaveButtonText = () => {
        if (isSaving) return 'Saving...';
        if (modalMode) {
            return modalType === 'mo-switch' ? 'Save & Continue' : 'Save All & Leave';
        }
        if (changeType === 'combined') return 'Save All';
        return changeType === 'route' ? 'Save Route' : 'Save MOs';
    };

    const getCancelButtonText = () => {
        if (modalMode) {
            switch (modalType) {
                case 'mo-switch':
                    return 'Cancel';
                case 'navigation':
                    return 'Stay on Page';
                case 'discard':
                    return 'Keep Editing';
            }
        }
        return 'Cancel';
    };

    const getDiscardButtonText = () => {
        switch (modalType) {
            case 'mo-switch':
                return 'Discard Changes';
            case 'navigation':
                return 'Discard & Leave';
            case 'discard':
                return 'Discard Changes';
        }
    };

    const content = (
        <>
            {/* Backdrop */}
            {showBackdrop && (
                <div
                    className={cn(
                        "fixed inset-0 bg-black/50 z-40",
                        isAnimating
                            ? "animate-in fade-in duration-300"
                            : "animate-out fade-out duration-200"
                    )}
                    onClick={() => modalMode && onModalCancel?.()}
                />
            )}

            {/* Main Content */}
            <div
                className={cn(
                    "fixed z-50",
                    "bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700",
                    "transition-all duration-300 ease-in-out",
                    modalMode && isAnimating ? [
                        "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                        "w-[90vw] max-w-2xl",
                        "p-6",
                        "scale-100"
                    ] : [
                        "left-1/2 -translate-x-1/2",
                        "px-6 py-3",
                        position === 'top' ? "top-4" : "bottom-4",
                        "scale-100"
                    ],
                    !modalMode && "animate-in slide-in-from-top-2 fade-in duration-300",
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {modalMode && isAnimating ? (
                    // Modal Layout
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    {getModalTitle()}
                                </h2>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 pl-14">
                                {getModalDescription()}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="outline"
                                size="default"
                                onClick={onModalCancel}
                                disabled={isSaving}
                                className="min-w-[120px]"
                            >
                                {getCancelButtonText()}
                            </Button>
                            {modalType !== 'discard' && (
                                <Button
                                    variant="outline"
                                    size="default"
                                    onClick={onModalDiscardChanges}
                                    disabled={isSaving}
                                    className="min-w-[120px] border-destructive text-destructive hover:bg-destructive hover:text-white"
                                >
                                    {getDiscardButtonText()}
                                </Button>
                            )}
                            {modalType === 'discard' ? (
                                <Button
                                    variant="destructive"
                                    size="default"
                                    onClick={onModalDiscardChanges}
                                    disabled={isSaving}
                                    className="min-w-[120px]"
                                >
                                    {getDiscardButtonText()}
                                </Button>
                            ) : (
                                <Button
                                    variant="default"
                                    size="default"
                                    onClick={onSave}
                                    disabled={isSaving}
                                    className="min-w-[120px] gap-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    {getSaveButtonText()}
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    // Bar Layout
                    <div className="flex items-center gap-4">
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
                )}
            </div>
        </>
    );

    // Use portal to ensure proper z-index handling
    return createPortal(content, document.body);
}