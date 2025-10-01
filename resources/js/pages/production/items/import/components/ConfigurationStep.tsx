import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ImportFile, FieldMapping, ImportOptions, csvFields, findBestMatch } from '../types';

interface Props {
    files: ImportFile[];
    onNext: (mapping: FieldMapping, options: ImportOptions) => void;
    onBack: () => void;
}

export function ConfigurationStep({ files, onNext, onBack }: Props) {
    const file = files[0]; // Single file import
    const fileType = file.file.name.split('.').pop()?.toLowerCase();
    const isCsv = fileType === 'csv' || fileType === 'txt';

    const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
    const [updateExisting, setUpdateExisting] = useState(true);
    const [mappingValidated, setMappingValidated] = useState(false);

    // Auto-map CSV fields on mount
    useEffect(() => {
        if (isCsv && file.headers) {
            const mapping: FieldMapping = {};
            file.headers.forEach((header) => {
                const match = findBestMatch(header);
                if (match) {
                    mapping[header] = match;
                }
            });
            setFieldMapping(mapping);
        }
    }, [isCsv, file.headers]);

    // Validate mapping whenever it changes
    useEffect(() => {
        if (isCsv) {
            const requiredFields = csvFields.filter(f => f.required).map(f => f.value);
            const mappedValues = Object.values(fieldMapping).filter(v => v);
            const isValid = requiredFields.every(field => mappedValues.includes(field));
            setMappingValidated(isValid);
        } else {
            // JSON files don't need mapping
            setMappingValidated(true);
        }
    }, [fieldMapping, isCsv]);

    const handleMappingChange = (header: string, value: string) => {
        const newMapping = { ...fieldMapping };
        if (value === '_ignore') {
            delete newMapping[header];
        } else {
            newMapping[header] = value;
        }
        setFieldMapping(newMapping);
    };

    const handleNext = () => {
        const options: ImportOptions = {
            updateExisting,
            skipDuplicates: !updateExisting
        };
        onNext(fieldMapping, options);
    };

    const getMissingRequiredFields = () => {
        const requiredFields = csvFields.filter(f => f.required);
        const mappedValues = Object.values(fieldMapping);
        return requiredFields.filter(field => !mappedValues.includes(field.value));
    };

    return (
        <div className="space-y-6">
            {/* File Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Selected File
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">File name:</span>
                            <span className="font-medium">{file.file.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Format:</span>
                            <span className="font-medium uppercase">{fileType}</span>
                        </div>
                        {isCsv && file.totalRows && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total rows:</span>
                                <span className="font-medium">{file.totalRows.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* CSV Field Mapping */}
            {isCsv && file.headers && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5" />
                            Field Mapping
                        </CardTitle>
                        <CardDescription>
                            Map CSV columns to system fields. Required fields are marked with *
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {file.headers.map((header) => (
                                <div key={header} className="space-y-2">
                                    <Label className="text-sm font-medium">{header}</Label>
                                    <Select
                                        value={fieldMapping[header] || '_ignore'}
                                        onValueChange={(value) => handleMappingChange(header, value)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_ignore">
                                                <span className="text-muted-foreground">Ignore this column</span>
                                            </SelectItem>
                                            {csvFields.map((field) => (
                                                <SelectItem key={field.value} value={field.value}>
                                                    {field.label} {field.required && '*'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>

                        {/* Mapping Validation */}
                        {!mappingValidated && (
                            <Alert className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Missing required fields:</strong>{' '}
                                    {getMissingRequiredFields().map(f => f.label).join(', ')}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* JSON Format Info */}
            {!isCsv && (
                <Card>
                    <CardHeader>
                        <CardTitle>JSON Import</CardTitle>
                        <CardDescription>
                            System will automatically process the JSON file using the standard format
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                The JSON file should follow the system export format. Categories will be created
                                automatically if they don't exist.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}

            {/* Duplicate Handling */}
            <Card>
                <CardHeader>
                    <CardTitle>Import Options</CardTitle>
                    <CardDescription>
                        Configure how to handle existing items
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="update-existing"
                            checked={updateExisting}
                            onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                        />
                        <div className="space-y-1">
                            <Label htmlFor="update-existing" className="font-medium cursor-pointer">
                                Update existing items
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                If an item with the same item number already exists, it will be updated with the new data.
                                All fields will be overwritten.
                            </p>
                        </div>
                    </div>

                    {!updateExisting && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Skip mode:</strong> Items with existing item numbers will be skipped and not imported.
                                You'll see a summary of skipped items after import.
                            </AlertDescription>
                        </Alert>
                    )}

                    {updateExisting && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Warning:</strong> Existing items will be completely overwritten with the imported data.
                                This action cannot be undone. Make sure you have a backup if needed.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>
                    Back
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={!mappingValidated}
                    className="min-w-[120px]"
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
