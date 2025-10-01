import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ImportFile } from '../types';

interface Props {
    supportedFormats: string[];
    onNext: (files: ImportFile[]) => void;
}

export function FileSelectionStep({ supportedFormats, onNext }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [fileType, setFileType] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = useCallback(async (file: File) => {
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!extension || !supportedFormats.includes(extension)) {
            toast.error(`Unsupported format. Please use: ${supportedFormats.join(', ')}`);
            return;
        }

        setSelectedFile(file);
        setFileType(extension);
    }, [supportedFormats]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, [handleFileSelect]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleNext = async () => {
        if (!selectedFile || !fileType) return;

        setIsProcessing(true);
        try {
            const importFile: ImportFile = { file: selectedFile };

            // For CSV files, read and parse headers
            if (fileType === 'csv' || fileType === 'txt') {
                const text = await selectedFile.text();
                const lines = text.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    toast.error('Empty or invalid CSV file');
                    setIsProcessing(false);
                    return;
                }

                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                const data: Record<string, unknown>[] = [];

                for (let i = 1; i < Math.min(lines.length, 11); i++) { // Preview first 10 rows
                    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                    const row: Record<string, unknown> = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });
                    data.push(row);
                }

                importFile.headers = headers;
                importFile.data = data;
                importFile.totalRows = lines.length - 1; // Exclude header row
            }

            onNext([importFile]);
        } catch (error) {
            console.error('Error processing file:', error);
            toast.error('Error processing file. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Select Import File</CardTitle>
                    <CardDescription>
                        Upload a CSV or JSON file containing your item data
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Drop Zone */}
                    <div
                        className={cn(
                            'relative rounded-lg border-2 border-dashed p-12 text-center transition-colors',
                            dragActive
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-300 hover:border-gray-400',
                            selectedFile && 'bg-gray-50'
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept={supportedFormats.map(f => `.${f}`).join(',')}
                            onChange={handleInputChange}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            disabled={isProcessing}
                        />

                        {!selectedFile ? (
                            <>
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm font-medium text-gray-900">
                                    Drop your file here, or click to browse
                                </p>
                                <p className="mt-1 text-xs text-gray-600">
                                    Supported formats: {supportedFormats.join(', ').toUpperCase()}
                                </p>
                            </>
                        ) : (
                            <>
                                <FileText className="mx-auto h-12 w-12 text-primary" />
                                <p className="mt-2 text-sm font-medium text-gray-900">
                                    {selectedFile.name}
                                </p>
                                <p className="mt-1 text-xs text-gray-600">
                                    {(selectedFile.size / 1024).toFixed(2)} KB
                                </p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="mt-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFile(null);
                                        setFileType('');
                                    }}
                                    disabled={isProcessing}
                                >
                                    Choose different file
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Format Information */}
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>CSV Format:</strong> First row should contain column headers. Required fields: Item Number, Name, Unit of Measure.
                            <br />
                            <strong>JSON Format:</strong> Use the system export format for best compatibility.
                        </AlertDescription>
                    </Alert>

                    {/* Template Download */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <p className="text-sm font-medium">Need a template?</p>
                            <p className="text-xs text-muted-foreground">
                                Download a sample CSV file to get started
                            </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <a href="/templates/item-import-template.csv" download>
                                <Download className="mr-2 h-4 w-4" />
                                Download Template
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end">
                <Button
                    onClick={handleNext}
                    disabled={!selectedFile || isProcessing}
                    className="min-w-[120px]"
                >
                    {isProcessing ? 'Processing...' : 'Next'}
                </Button>
            </div>
        </div>
    );
}
