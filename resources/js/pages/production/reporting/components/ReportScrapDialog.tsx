import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ManufacturingOrder } from '@/types/production';
import { createFormAdapter } from '@/utils/form-adapters';
import { TextInput } from '@/components/TextInput';
import { AlertCircle, Upload, X } from 'lucide-react';

interface ReportScrapDialogProps {
    order: ManufacturingOrder;
    onClose: () => void;
}

export function ReportScrapDialog({ order, onClose }: ReportScrapDialogProps) {
    const maxScrap = order.quantity - order.quantity_completed - order.quantity_scrapped;
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const { data, setData, post, processing, errors, clearErrors } = useForm<{
        quantity_scrapped: string;
        scrap_reason: string;
        defect_code: string;
        photo: File | null;
        notes: string;
    }>({
        quantity_scrapped: '',
        scrap_reason: '',
        defect_code: '',
        photo: null,
        notes: ''
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('production.reporting.scrap', order.id), {
            forceFormData: true,
            onSuccess: () => {
                onClose();
            }
        });
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('photo', file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = () => {
        setData('photo', null);
        setPhotoPreview(null);
    };

    const scrapReasons = [
        'Material Defect',
        'Machine Error',
        'Operator Error',
        'Quality Failure',
        'Wrong Setup',
        'Damaged in Process',
        'Out of Spec',
        'Other'
    ];

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Report Scrap - {order.order_number}</DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                        {/* Order Info */}
                        <div className="p-3 bg-accent rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Item:</span>
                                <span className="font-medium">{order.item?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-muted-foreground">Available Quantity:</span>
                                <span className="font-medium">{maxScrap} {order.unit_of_measure}</span>
                            </div>
                        </div>

                        {/* Quantity Scrapped */}
                        <TextInput
                            form={formAdapter}
                            name="quantity_scrapped"
                            label="Quantity Scrapped *"
                            placeholder="0"
                            required
                        />

                        {/* Scrap Reason */}
                        <div className="space-y-2">
                            <Label htmlFor="scrap_reason">Scrap Reason *</Label>
                            <select
                                id="scrap_reason"
                                value={data.scrap_reason}
                                onChange={(e) => setData('scrap_reason', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                required
                            >
                                <option value="">Select a reason...</option>
                                {scrapReasons.map(reason => (
                                    <option key={reason} value={reason}>{reason}</option>
                                ))}
                            </select>
                            {errors.scrap_reason && (
                                <p className="text-sm text-destructive">{errors.scrap_reason}</p>
                            )}
                        </div>

                        {/* Defect Code */}
                        <TextInput
                            form={formAdapter}
                            name="defect_code"
                            label="Defect Code (Optional)"
                            placeholder="e.g., QC-001"
                        />

                        {/* Photo Upload */}
                        <div className="space-y-2">
                            <Label htmlFor="photo">Photo Evidence (Optional)</Label>
                            {!photoPreview ? (
                                <div className="flex items-center justify-center w-full">
                                    <label
                                        htmlFor="photo"
                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-accent hover:bg-accent/80"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                            <p className="mb-2 text-sm text-muted-foreground">
                                                <span className="font-semibold">Click to upload</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                PNG, JPG up to 5MB
                                            </p>
                                        </div>
                                        <input
                                            id="photo"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handlePhotoChange}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={photoPreview}
                                        alt="Scrap photo"
                                        className="w-full h-32 object-cover rounded-lg"
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="absolute top-2 right-2 h-6 w-6"
                                        onClick={removePhoto}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            {errors.photo && (
                                <p className="text-sm text-destructive">{errors.photo}</p>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Additional Notes</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Describe the issue in detail..."
                                rows={3}
                            />
                            {errors.notes && (
                                <p className="text-sm text-destructive">{errors.notes}</p>
                            )}
                        </div>

                        {/* Warning */}
                        {parseFloat(data.quantity_scrapped || '0') > maxScrap && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Scrap quantity exceeds available quantity
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={processing || parseFloat(data.quantity_scrapped || '0') > maxScrap}
                        >
                            Report Scrap
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
