import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: 'mo-switch' | 'navigation' | 'discard';
    changeDetails?: {
        routeChanges?: number;
        priorityChanges?: number;
    };
    onSaveAndContinue?: () => void;
    onDiscardChanges?: () => void;
    onCancel?: () => void;
}

export function UnsavedChangesDialog({
    open,
    onOpenChange,
    type,
    changeDetails,
    onSaveAndContinue,
    onDiscardChanges,
    onCancel,
}: UnsavedChangesDialogProps) {
    const getContent = () => {
        switch (type) {
            case 'mo-switch':
                return {
                    title: 'Unsaved Route Changes',
                    description: 'You have unsaved changes to the current manufacturing order\'s route. What would you like to do?',
                    actions: (
                        <>
                            <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                variant="outline"
                                onClick={onDiscardChanges}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Discard Changes
                            </AlertDialogAction>
                            <AlertDialogAction onClick={onSaveAndContinue}>
                                Save & Continue
                            </AlertDialogAction>
                        </>
                    ),
                };

            case 'navigation': {
                const changes = [];
                if (changeDetails?.routeChanges) {
                    changes.push(`${changeDetails.routeChanges} route change${changeDetails.routeChanges > 1 ? 's' : ''}`);
                }
                if (changeDetails?.priorityChanges) {
                    changes.push(`${changeDetails.priorityChanges} priority change${changeDetails.priorityChanges > 1 ? 's' : ''}`);
                }

                return {
                    title: 'Unsaved Changes',
                    description: (
                        <div className="space-y-2">
                            <p>You have unsaved changes that will be lost if you leave this page.</p>
                            {changes.length > 0 && (
                                <ul className="list-disc list-inside text-sm text-muted-foreground">
                                    {changes.map((change, index) => (
                                        <li key={index}>{change}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ),
                    actions: (
                        <>
                            <AlertDialogCancel onClick={onCancel}>Stay on Page</AlertDialogCancel>
                            <AlertDialogAction
                                variant="outline"
                                onClick={onDiscardChanges}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Discard & Leave
                            </AlertDialogAction>
                            <AlertDialogAction onClick={onSaveAndContinue}>
                                Save All & Leave
                            </AlertDialogAction>
                        </>
                    ),
                };
            }

            case 'discard':
                return {
                    title: 'Discard Changes?',
                    description: 'Are you sure you want to discard all unsaved changes? This action cannot be undone.',
                    actions: (
                        <>
                            <AlertDialogCancel onClick={onCancel}>Keep Editing</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={onDiscardChanges}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Discard Changes
                            </AlertDialogAction>
                        </>
                    ),
                };
        }
    };

    const content = getContent();

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <AlertDialogTitle>{content.title}</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
                        {typeof content.description === 'string' ? (
                            <span>{content.description}</span>
                        ) : (
                            content.description
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {content.actions}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
