import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Printer, Download, FileText } from 'lucide-react';
import { ManufacturingOrder } from '@/types/production';

interface MOStepLabelPrintDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    order?: ManufacturingOrder;
}

type LabelSize = 'standard' | 'large' | 'small';

export function MOStepLabelPrintDialog({ isOpen, onOpenChange, order }: MOStepLabelPrintDialogProps) {
    const [labelSize, setLabelSize] = useState<LabelSize>('standard');
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Generate the label PDF URL
    const generateLabelUrl = (download = false) => {
        if (!order) return '';
        const params = new URLSearchParams({
            size: labelSize,
            download: download ? 'true' : 'false'
        });
        // Use the PDF-specific route that bypasses Inertia
        return `/pdf/manufacturing-orders/${order.id}/label?${params.toString()}`;
    };

    const handlePreview = async () => {
        if (!order) return;
        
        setIsGenerating(true);
        try {
            const url = generateLabelUrl(false);
            // Force a timestamp to bypass any caching
            const timestampedUrl = url + '&_t=' + Date.now();
            setPreviewUrl(timestampedUrl);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!order) return;
        
        // Open in new tab/window to trigger download
        window.open(generateLabelUrl(true), '_blank');
    };

    const handlePrint = () => {
        if (!previewUrl) {
            handlePreview();
            // Wait a bit for preview to load then print
            setTimeout(() => {
                window.print();
            }, 1000);
        } else {
            window.print();
        }
    };

    const handleClose = () => {
        setPreviewUrl(null);
        setLabelSize('standard');
        onOpenChange(false);
    };

    if (!order) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl" aria-describedby="label-dialog-description">
                <DialogHeader>
                    <DialogTitle>Print Label - MO {order.order_number}</DialogTitle>
                </DialogHeader>
                <div id="label-dialog-description" className="sr-only">
                    Select label size and preview or print manufacturing order label
                </div>
                
                <div className="space-y-4">
                    {/* Label Size Selection */}
                    <div className="space-y-3">
                        <Label>Label Size</Label>
                        <RadioGroup value={labelSize} onValueChange={(value) => setLabelSize(value as LabelSize)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="standard" id="standard" />
                                <Label htmlFor="standard" className="cursor-pointer">
                                    Standard (3" × 4")
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="large" id="large" />
                                <Label htmlFor="large" className="cursor-pointer">
                                    Large (4" × 6")
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="small" id="small" />
                                <Label htmlFor="small" className="cursor-pointer">
                                    Small (2" × 2") - QR Code Only
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Preview */}
                    {previewUrl && (
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="text-sm font-medium mb-2">Preview</h4>
                            <div className="bg-white border rounded" style={{ height: '400px' }}>
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full"
                                    title="Label Preview"
                                    onLoad={(e) => {
                                        // Check if the iframe loaded properly
                                        const iframe = e.target as HTMLIFrameElement;
                                        try {
                                            const contentType = iframe.contentDocument?.contentType || '';
                                            if (!contentType.includes('pdf')) {
                                                console.error('Label preview did not load PDF, got:', contentType);
                                            }
                                        } catch (err) {
                                            // Cross-origin, can't check - that's ok
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    
                    {!previewUrl ? (
                        <Button onClick={handlePreview} disabled={isGenerating}>
                            <FileText className="mr-2 h-4 w-4" />
                            Preview
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleDownload}>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                            </Button>
                            <Button onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}