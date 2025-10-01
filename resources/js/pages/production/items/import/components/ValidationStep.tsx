import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ImportFile, FieldMapping, ImportOptions, ImportSession, csvFields } from '../types';
import { toast } from 'sonner';

interface Props {
    files: ImportFile[];
    mapping: FieldMapping;
    options: ImportOptions;
    onNext: (session: ImportSession) => void;
    onBack: () => void;
}

export function ValidationStep({ files, mapping, options, onNext, onBack }: Props) {
    const [isValidating, setIsValidating] = useState(true);
    const [validationProgress, setValidationProgress] = useState(0);
    const [validationErrors, setValidationErrors] = useState<Array<{
        row: number;
        field: string;
        message: string;
    }>>([]);
    const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
    const [session, setSession] = useState<ImportSession | null>(null);

    const file = files[0];
    const fileType = file.file.name.split('.').pop()?.toLowerCase();
    const isCsv = fileType === 'csv' || fileType === 'txt';

    useEffect(() => {
        validateData();
    }, []);

    const validateData = async () => {
        setIsValidating(true);
        setValidationProgress(0);

        try {
            // For CSV files, we already have parsed data
            if (isCsv && file.data) {
                // Transform CSV data based on mapping
                const transformedData = file.data.map((row, index) => {
                    const transformed: Record<string, unknown> = {};

                    Object.entries(mapping).forEach(([csvHeader, systemField]) => {
                        if (systemField && systemField !== '_ignore') {
                            transformed[systemField] = row[csvHeader];
                        }
                    });

                    return transformed;
                });

                setPreviewData(transformedData.slice(0, 10)); // Preview first 10 rows

                // Simulate validation progress
                const totalRows = file.totalRows || 0;
                const increment = 100 / totalRows;
                let progress = 0;

                const progressInterval = setInterval(() => {
                    progress += increment * 50; // Validate 50 rows at a time
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(progressInterval);
                    }
                    setValidationProgress(progress);
                }, 100);

                // Create session
                const newSession: ImportSession = {
                    id: `import-${Date.now()}`,
                    status: 'pending',
                    totalItems: totalRows,
                    processedItems: 0,
                    successfulItems: 0,
                    failedItems: 0,
                };
                setSession(newSession);

                // Wait for progress to complete
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                // For JSON files, parse and validate
                const text = await file.file.text();
                const jsonData = JSON.parse(text);

                if (jsonData.items && Array.isArray(jsonData.items)) {
                    setPreviewData(jsonData.items.slice(0, 10));

                    const newSession: ImportSession = {
                        id: `import-${Date.now()}`,
                        status: 'pending',
                        totalItems: jsonData.items.length,
                        processedItems: 0,
                        successfulItems: 0,
                        failedItems: 0,
                    };
                    setSession(newSession);
                } else {
                    throw new Error('Invalid JSON format. Expected { items: [...] }');
                }

                setValidationProgress(100);
            }

            // Basic validation checks (simplified for demo)
            const errors: typeof validationErrors = [];
            previewData.forEach((row, index) => {
                // Check required fields
                const requiredFields = csvFields.filter(f => f.required);
                requiredFields.forEach(field => {
                    if (!row[field.value]) {
                        errors.push({
                            row: index + 1,
                            field: field.label,
                            message: `${field.label} is required`
                        });
                    }
                });
            });

            setValidationErrors(errors);
        } catch (error) {
            console.error('Validation error:', error);
            toast.error('Error validating data. Please check your file format.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleNext = () => {
        if (session) {
            onNext(session);
        }
    };

    const getMappedFieldLabel = (systemField: string): string => {
        return csvFields.find(f => f.value === systemField)?.label || systemField;
    };

    const displayedColumns = isCsv
        ? Object.values(mapping).filter(v => v && v !== '_ignore')
        : ['item_number', 'name', 'category_name', 'unit_of_measure'];

    return (
        <div className="space-y-6">
            {/* Validation Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Data Validation</CardTitle>
                    <CardDescription>
                        Checking your data for errors and compatibility
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isValidating ? (
                        <>
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Validating data...</span>
                            </div>
                            <Progress value={validationProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                                Processing {file.totalRows?.toLocaleString() || 'your'} items
                            </p>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="font-medium">Validation Complete</span>
                            </div>

                            {validationErrors.length > 0 ? (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Found {validationErrors.length} validation {validationErrors.length === 1 ? 'error' : 'errors'}.
                                        Please fix these issues before proceeding.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert className="border-green-200 bg-green-50">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800">
                                        All data validated successfully. Ready to import!
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Validation Errors */}
            {!isValidating && validationErrors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Validation Errors</CardTitle>
                        <CardDescription>
                            Fix these issues in your source file and try again
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-20">Row</TableHead>
                                        <TableHead>Field</TableHead>
                                        <TableHead>Error</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {validationErrors.slice(0, 10).map((error, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-mono">{error.row}</TableCell>
                                            <TableCell>{error.field}</TableCell>
                                            <TableCell className="text-destructive">{error.message}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {validationErrors.length > 10 && (
                            <p className="mt-2 text-sm text-muted-foreground">
                                Showing first 10 errors of {validationErrors.length} total
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Data Preview */}
            {!isValidating && previewData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Data Preview</CardTitle>
                        <CardDescription>
                            Showing first {Math.min(10, previewData.length)} items that will be imported
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {displayedColumns.map((field) => (
                                            <TableHead key={field}>
                                                {getMappedFieldLabel(field)}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.map((row, index) => (
                                        <TableRow key={index}>
                                            {displayedColumns.map((field) => (
                                                <TableCell key={field}>
                                                    {String(row[field] || '')}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Import Summary */}
            {!isValidating && session && (
                <Card>
                    <CardHeader>
                        <CardTitle>Import Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total items to import:</span>
                                <span className="font-medium">{session.totalItems.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Import mode:</span>
                                <span className="font-medium">
                                    {options.updateExisting ? 'Update existing items' : 'Skip existing items'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack} disabled={isValidating}>
                    Back
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={isValidating || validationErrors.length > 0 || !session}
                    className="min-w-[120px]"
                >
                    Start Import
                </Button>
            </div>
        </div>
    );
}
