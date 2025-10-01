import React from 'react';
import { CheckCircle, XCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportSession } from '../types';
import { router } from '@inertiajs/react';

interface Props {
    session: ImportSession;
    onNewImport: () => void;
}

export function ResultsStep({ session, onNewImport }: Props) {
    const isSuccess = session.status === 'completed' && session.successfulItems > 0;
    const hasErrors = session.failedItems > 0 || (session.errors && session.errors.length > 0);
    const skippedItems = session.processedItems - session.successfulItems - session.failedItems;

    const handleViewItems = () => {
        router.visit(route('production.items.index'));
    };

    return (
        <div className="space-y-6">
            {/* Overall Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {isSuccess ? (
                            <>
                                <CheckCircle className="h-6 w-6 text-green-600" />
                                Import Completed Successfully
                            </>
                        ) : (
                            <>
                                <XCircle className="h-6 w-6 text-destructive" />
                                Import Failed
                            </>
                        )}
                    </CardTitle>
                    <CardDescription>
                        {isSuccess
                            ? 'Your items have been imported successfully.'
                            : 'The import process encountered errors.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Summary Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Total Items</p>
                                <p className="text-2xl font-bold">{session.totalItems.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Successful</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {session.successfulItems.toLocaleString()}
                                </p>
                            </div>
                            {skippedItems > 0 && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Skipped</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {skippedItems.toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {session.failedItems > 0 && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Failed</p>
                                    <p className="text-2xl font-bold text-destructive">
                                        {session.failedItems.toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Success Rate */}
                        {session.processedItems > 0 && (
                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Success Rate</span>
                                    <span className="text-sm font-medium">
                                        {Math.round((session.successfulItems / session.processedItems) * 100)}%
                                    </span>
                                </div>
                                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-600 transition-all duration-500"
                                        style={{
                                            width: `${(session.successfulItems / session.processedItems) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Results */}
            {isSuccess && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        <strong>Success!</strong> {session.successfulItems} items were imported successfully.
                        {skippedItems > 0 && ` ${skippedItems} items were skipped because they already exist.`}
                    </AlertDescription>
                </Alert>
            )}

            {/* Errors */}
            {hasErrors && session.errors && session.errors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Import Errors
                        </CardTitle>
                        <CardDescription>
                            The following errors occurred during import
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {session.errors.slice(0, 10).map((error, index) => (
                                <div key={index} className="text-sm p-2 bg-destructive/10 rounded">
                                    {error.row && <span className="font-medium">Row {error.row}: </span>}
                                    {error.message}
                                </div>
                            ))}
                            {session.errors.length > 10 && (
                                <p className="text-sm text-muted-foreground pt-2">
                                    ...and {session.errors.length - 10} more errors
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Next Steps */}
            <Card>
                <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                    <CardDescription>
                        What would you like to do next?
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <Button
                            onClick={handleViewItems}
                            className="w-full"
                            variant={isSuccess ? "default" : "outline"}
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            View All Items
                        </Button>
                        <Button
                            onClick={onNewImport}
                            variant="outline"
                            className="w-full"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Start New Import
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tips for Failed Imports */}
            {hasErrors && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Tips for resolving import errors:</strong>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Check that all required fields are filled</li>
                            <li>Ensure item numbers are unique</li>
                            <li>Verify that numeric fields contain valid numbers</li>
                            <li>Make sure date fields are properly formatted</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
