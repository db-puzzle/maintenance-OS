import React, { useState, useCallback } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeftRight, Upload, FileText, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'sonner';
import { type BreadcrumbItem } from '@/types';
import { ItemCategory } from '@/types/production';
interface Props {
    categories: ItemCategory[];
    supportedFormats: string[];
    csvHeaders: Record<string, string>;
}
// CSV field mappings
const csvFields = [
    { value: 'item_number', label: 'Item Number', required: true },
    { value: 'name', label: 'Name', required: true },
    { value: 'description', label: 'Description', required: false },
    { value: 'category_name', label: 'Category', required: false },
    { value: 'unit_of_measure', label: 'Unit of Measure', required: true },
    { value: 'can_be_sold', label: 'Can Be Sold', required: false },
    { value: 'can_be_purchased', label: 'Can Be Purchased', required: false },
    { value: 'can_be_manufactured', label: 'Can Be Manufactured', required: false },
    { value: 'is_phantom', label: 'Is Phantom', required: false },
    { value: 'is_active', label: 'Is Active', required: false },
    { value: 'weight', label: 'Weight', required: false },
    { value: 'list_price', label: 'List Price', required: false },
    { value: 'manufacturing_cost', label: 'Manufacturing Cost', required: false },
    { value: 'manufacturing_lead_time_days', label: 'Manufacturing Lead Time (Days)', required: false },
    { value: 'purchase_price', label: 'Purchase Price', required: false },
    { value: 'purchase_lead_time_days', label: 'Purchase Lead Time (Days)', required: false },
    { value: 'track_inventory', label: 'Track Inventory', required: false },
    { value: 'min_stock_level', label: 'Min Stock Level', required: false },
    { value: 'max_stock_level', label: 'Max Stock Level', required: false },
    { value: 'reorder_point', label: 'Reorder Point', required: false },
    { value: 'preferred_vendor', label: 'Preferred Vendor', required: false },
    { value: 'vendor_item_number', label: 'Vendor Item Number', required: false },
    { value: 'tags', label: 'Tags', required: false },
];
const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/\s+/g, '').trim();
};
const findBestMatch = (header: string, fields: typeof csvFields): string => {
    const normalizedHeader = normalizeString(header);
    for (const field of fields) {
        const normalizedFieldLabel = normalizeString(field.label);
        if (normalizedHeader === normalizedFieldLabel) {
            return field.value;
        }
    }
    // Additional matches for common variations
    if (normalizedHeader.includes('number') || normalizedHeader.includes('code')) return 'item_number';
    if (normalizedHeader.includes('name') || normalizedHeader.includes('title')) return 'name';
    if (normalizedHeader.includes('description') || normalizedHeader.includes('desc')) return 'description';
    if (normalizedHeader.includes('category') || normalizedHeader.includes('cat')) return 'category_name';
    if (normalizedHeader.includes('unit') || normalizedHeader.includes('measure')) return 'unit_of_measure';
    if (normalizedHeader.includes('weight')) return 'weight';
    if (normalizedHeader.includes('price') && normalizedHeader.includes('list')) return 'list_price';
    if (normalizedHeader.includes('price') && normalizedHeader.includes('purchase')) return 'purchase_price';
    if (normalizedHeader.includes('cost')) return 'manufacturing_cost';
    if (normalizedHeader.includes('vendor') && !normalizedHeader.includes('number')) return 'preferred_vendor';
    if (normalizedHeader.includes('vendor') && normalizedHeader.includes('number')) return 'vendor_item_number';
    if (normalizedHeader.includes('tags')) return 'tags';
    return '';
};
export default function ItemImport({ supportedFormats }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<string>('');
    const [csvData, setCsvData] = useState<{
        headers: string[];
        data: Record<string, unknown>[];
        totalRows: number;
    } | null>(null);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [showPreview, setShowPreview] = useState(false);
    const { setData, post, processing, errors } = useForm({
        file: null as File | null,
        mapping: {},
    });
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/home' },
        { title: 'Items', href: route('production.items.index') },
        { title: 'Import Items', href: route('production.items.import.wizard') },
    ];
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!supportedFormats.includes(extension || '')) {
            toast.error(`Unsupported format. Use: ${supportedFormats.join(', ')}`);
            return;
        }
        setSelectedFile(file);
        setFileType(extension || '');
        setData('file', file);
        if (extension === 'csv' || extension === 'txt') {
            await processCsvFile(file);
        }
    };
    const processCsvFile = async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                toast.error('Empty or invalid CSV file');
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const data: Record<string, unknown>[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const row: Record<string, unknown> = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
            setCsvData({ headers, data, totalRows: data.length });
            // Auto-map fields
            const mapping: Record<string, string> = {};
            headers.forEach((header) => {
                const match = findBestMatch(header, csvFields);
                if (match) {
                    mapping[header] = match;
                }
            });
            setFieldMapping(mapping);
            setData('mapping', mapping);
            setShowPreview(true);
        };
        reader.readAsText(file);
    };
    const isMappingValid = useCallback(() => {
        // Must have a file
        if (!selectedFile) return false;
        // For JSON files, that's all we need
        if (fileType === 'json') {
            return true;
        }
        // For CSV files, we need proper field mapping
        if (fileType === 'csv' || fileType === 'txt') {
            if (!csvData || !fieldMapping) return false;
            const requiredFields = csvFields.filter(f => f.required).map(f => f.value);
            const mappedValues = Object.values(fieldMapping).filter(v => v);
            return requiredFields.every(field => mappedValues.includes(field));
        }
        return false;
    }, [selectedFile, fileType, csvData, fieldMapping]);
    const handleImport = () => {
        if (!selectedFile || !isMappingValid()) {
            console.log('Validation failed:', {
                selectedFile: !!selectedFile,
                fileType,
                isMappingValid: isMappingValid()
            });
            return;
        }
        // Update the form data before submitting
        setData(prevData => ({
            ...prevData,
            file: selectedFile,
            mapping: fieldMapping,
        }));
        post(route('production.items.import'), {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Items imported successfully!');
            },
            onError: (errors) => {
                console.error('Import errors:', errors);
                const errorMessage = Object.values(errors).flat().join(', ') || 'Error importing items';
                toast.error(errorMessage);
            }
        });
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Import Items" />
            <div className="flex-1 overflow-y-auto">
                <div className="container max-w-6xl mx-auto py-8 space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold">Import Items</h1>
                        <p className="text-muted-foreground mt-2">
                            Import items from CSV or JSON files
                        </p>
                    </div>
                    <Tabs defaultValue="upload" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="upload">File Upload</TabsTrigger>
                            <TabsTrigger value="instructions">Instructions</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload" className="space-y-6">
                            {/* File Upload */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Select File</CardTitle>
                                    <CardDescription>
                                        Supported formats: {supportedFormats.join(', ')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="file"
                                            accept={supportedFormats.map(f => `.${f}`).join(',')}
                                            onChange={handleFileSelect}
                                            disabled={processing}
                                        />
                                        {selectedFile && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <FileText className="h-4 w-4" />
                                                {selectedFile.name}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            {/* CSV Field Mapping */}
                            {csvData && showPreview && fileType === 'csv' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <ArrowLeftRight className="h-5 w-5" />
                                            Field Mapping
                                        </CardTitle>
                                        <CardDescription>
                                            Map CSV columns to system fields
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {csvData.headers.map((header) => (
                                                <div key={header} className="space-y-2">
                                                    <Label>{header}</Label>
                                                    <Select
                                                        value={fieldMapping[header] || '_ignore'}
                                                        onValueChange={(value) => {
                                                            const newMapping = { ...fieldMapping };
                                                            if (value === '_ignore') {
                                                                delete newMapping[header];
                                                            } else {
                                                                newMapping[header] = value;
                                                            }
                                                            setFieldMapping(newMapping);
                                                            setData('mapping', newMapping);
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select field" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="_ignore">Ignore</SelectItem>
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
                                    </CardContent>
                                </Card>
                            )}
                            {/* Data Preview */}
                            {csvData && showPreview && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Data Preview</CardTitle>
                                        <CardDescription>
                                            Showing first 10 rows of {csvData.totalRows} total
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        {csvData.headers.map((header) => (
                                                            <TableHead key={header}>
                                                                {header}
                                                                {fieldMapping[header] && (
                                                                    <div className="text-xs text-muted-foreground mt-1">
                                                                        → {csvFields.find(f => f.value === fieldMapping[header])?.label}
                                                                    </div>
                                                                )}
                                                            </TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {csvData.data.slice(0, 10).map((row, index) => (
                                                        <TableRow key={index}>
                                                            {csvData.headers.map((header) => (
                                                                <TableCell key={header}>
                                                                    {row[header] as React.ReactNode}
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
                            {/* Import Progress */}
                            {processing && (
                                <Card>
                                    <CardContent className="py-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Importing...</span>
                                            </div>
                                            <Progress value={50} className="animate-pulse" />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            {/* Import Errors */}
                            {(errors.file || errors.mapping) && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {errors.file && <div>{errors.file}</div>}
                                        {errors.mapping && <div>{errors.mapping}</div>}
                                    </AlertDescription>
                                </Alert>
                            )}
                            {/* Validation Message */}
                            {selectedFile && !isMappingValid() && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {fileType === 'csv' && !csvData && 'Processing CSV file...'}
                                        {fileType === 'csv' && csvData && (
                                            <>
                                                Required fields not mapped:
                                                {csvFields
                                                    .filter(f => f.required)
                                                    .filter(f => !Object.values(fieldMapping).includes(f.value))
                                                    .map(f => f.label)
                                                    .join(', ')}
                                            </>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}
                            {/* Action Buttons */}
                            <div className="flex justify-end gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => router.visit(route('production.items.index'))}
                                    disabled={processing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={!isMappingValid() || processing}
                                    title={!isMappingValid() ? 'Please fill all required fields' : ''}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {processing ? 'Importing...' : 'Import Items'}
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="instructions" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>CSV Format</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        The CSV file should contain the following columns:
                                    </p>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Field</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Required</TableHead>
                                                <TableHead>Example</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {csvFields.map((field) => (
                                                <TableRow key={field.value}>
                                                    <TableCell className="font-medium">{field.label}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {field.value === 'item_number' && 'Unique item identifier'}
                                                        {field.value === 'name' && 'Item name or title'}
                                                        {field.value === 'description' && 'Detailed description'}
                                                        {field.value === 'category_name' && 'Category name (will be created if not exists)'}
                                                        {field.value === 'unit_of_measure' && 'Unit of measure (EA, KG, M, etc)'}
                                                        {field.value === 'can_be_sold' && 'Whether item can be sold (Yes/No)'}
                                                        {field.value === 'can_be_purchased' && 'Whether item can be purchased (Yes/No)'}
                                                        {field.value === 'can_be_manufactured' && 'Whether item can be manufactured (Yes/No)'}
                                                        {field.value === 'weight' && 'Item weight in kilograms'}
                                                        {field.value === 'list_price' && 'Selling price'}
                                                        {field.value === 'purchase_price' && 'Purchase cost'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {field.required ? (
                                                            <span className="text-destructive">Yes</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">No</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-mono">
                                                        {field.value === 'item_number' && 'ITEM-001'}
                                                        {field.value === 'name' && 'M8x20 Bolt'}
                                                        {field.value === 'description' && 'Stainless steel bolt'}
                                                        {field.value === 'category_name' && 'Hardware'}
                                                        {field.value === 'unit_of_measure' && 'EA'}
                                                        {field.value === 'can_be_sold' && 'Yes'}
                                                        {field.value === 'weight' && '0.05'}
                                                        {field.value === 'list_price' && '2.50'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Tip:</strong> You can download a CSV template to make filling easier.
                                        </AlertDescription>
                                    </Alert>
                                    <Button variant="outline" asChild>
                                        <a href="/templates/item-import-template.csv" download>
                                            <Download className="h-4 w-4 mr-2" />
                                            Download CSV Template
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>JSON Format</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        The system accepts JSON format from system exports:
                                    </p>
                                    <div>
                                        <h4 className="font-medium mb-2">Native Format (System Export)</h4>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            This is the format generated when you export items from the system. Can be reimported directly.
                                        </p>
                                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                                            {`{
  "exported_at": "2024-01-15T10:30:00Z",
  "exported_by": "User Name",
  "total_items": 2,
  "items": [
    {
      "item_number": "ITEM-001",
      "name": "Widget XL",
      "description": "Large widget for industrial use",
      "category_name": "Electronics",
      "unit_of_measure": "EA",
      "can_be_sold": true,
      "can_be_purchased": true,
      "can_be_manufactured": false,
      "is_active": true,
      "weight": 2.5,
      "list_price": 99.99,
      "purchase_price": 65.00
    }
  ]
}`}
                                        </pre>
                                    </div>
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Important:</strong> Categories will be created automatically if they don't exist.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}