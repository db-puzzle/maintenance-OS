import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { router } from '@inertiajs/react';

interface ValidationError {
    order_id?: number;
    order_number?: string;
    step_id?: number;
    step_name?: string;
    issue: string;
    message: string;
    type?: string;
    family?: string;
    editLinks?: {
        edit_step?: string;
        edit_work_cell?: string;
    };
}

interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

interface ValidationModalProps {
    validation: ValidationResult;
    onClose: () => void;
    onContinue: () => void;
}

export default function ValidationModal({
    validation,
    onClose,
    onContinue
}: ValidationModalProps) {
    const hasErrors = validation.errors.length > 0;
    const hasWarnings = validation.warnings.length > 0;

    const getIssueIcon = (issue: string) => {
        switch (issue) {
            case 'missing_route':
            case 'missing_time_parameters':
            case 'cross_family_dependency':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            default:
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
        }
    };

    const getIssueColor = (issue: string) => {
        switch (issue) {
            case 'missing_route':
            case 'missing_time_parameters':
            case 'cross_family_dependency':
                return 'destructive';
            default:
                return 'warning';
        }
    };

    const handleEditClick = (url: string) => {
        window.open(url, '_blank');
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>
                        {hasErrors ? 'Validation Errors Found' : 'Validation Warnings'}
                    </DialogTitle>
                    <DialogDescription>
                        {hasErrors
                            ? 'The following issues must be resolved before scheduling can proceed.'
                            : 'The following warnings were found. You can proceed with scheduling if desired.'}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-4">
                        {/* Errors */}
                        {validation.errors.map((error, index) => (
                            <Alert key={`error-${index}`} variant="destructive">
                                <div className="flex items-start gap-3">
                                    {getIssueIcon(error.issue)}
                                    <div className="flex-1">
                                        <AlertTitle className="mb-2">
                                            {error.order_number && (
                                                <span className="font-semibold">
                                                    Order {error.order_number}
                                                    {error.step_name && ` - ${error.step_name}`}
                                                </span>
                                            )}
                                            {error.family && (
                                                <span className="font-semibold">
                                                    Family {error.family}
                                                </span>
                                            )}
                                        </AlertTitle>
                                        <AlertDescription className="space-y-2">
                                            <p>{error.message}</p>
                                            {error.editLinks && (
                                                <div className="flex gap-2 mt-2">
                                                    {error.editLinks.edit_step && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEditClick(error.editLinks.edit_step!)}
                                                        >
                                                            <ExternalLink className="w-4 h-4 mr-1" />
                                                            Edit Step
                                                        </Button>
                                                    )}
                                                    {error.editLinks.edit_work_cell && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEditClick(error.editLinks.edit_work_cell!)}
                                                        >
                                                            <ExternalLink className="w-4 h-4 mr-1" />
                                                            Edit Work Cell
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </AlertDescription>
                                    </div>
                                    <Badge variant={getIssueColor(error.issue)}>
                                        {error.issue.replace(/_/g, ' ').toUpperCase()}
                                    </Badge>
                                </div>
                            </Alert>
                        ))}

                        {/* Warnings */}
                        {validation.warnings.map((warning, index) => (
                            <Alert key={`warning-${index}`} className="border-yellow-200 bg-yellow-50">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                    <div className="flex-1">
                                        <AlertDescription>
                                            {warning.message}
                                        </AlertDescription>
                                    </div>
                                </div>
                            </Alert>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <div className="flex items-center justify-between w-full">
                        <div className="text-sm text-muted-foreground">
                            {hasErrors && (
                                <span className="text-red-600">
                                    {validation.errors.length} error{validation.errors.length !== 1 && 's'}
                                </span>
                            )}
                            {hasErrors && hasWarnings && ' • '}
                            {hasWarnings && (
                                <span className="text-yellow-600">
                                    {validation.warnings.length} warning{validation.warnings.length !== 1 && 's'}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose}>
                                {hasErrors ? 'Fix Issues' : 'Cancel'}
                            </Button>
                            {!hasErrors && (
                                <Button onClick={onContinue}>
                                    Continue with Scheduling
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
