import React from 'react';
import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ManufacturingOrder } from '@/types/production';
import { createFormAdapter } from '@/utils/form-adapters';
import { TextInput } from '@/components/TextInput';

import { AlertCircle } from 'lucide-react';

interface ReportProductionDialogProps {
    order: ManufacturingOrder;
    onClose: () => void;
}

export function ReportProductionDialog({ order, onClose }: ReportProductionDialogProps) {
    const maxQuantity = order.quantity - order.quantity_completed - order.quantity_scrapped;

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        quantity_completed: '',
        quantity_scrapped: '',
        scrap_reason: '',
        time_spent: '',
        notes: '',
        mark_complete: false
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('production.reporting.report', order.id), {
            onSuccess: () => {
                onClose();
            }
        });
    };

    const remainingAfterReport = maxQuantity -
        (parseFloat(data.quantity_completed || '0') + parseFloat(data.quantity_scrapped || '0'));

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Report Production - {order.order_number}</DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                        {/* Order Info */}
                        <div className="p-3 bg-accent rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Item:</span>
                                <span className="font-medium">{order.item?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-muted-foreground">Remaining Quantity:</span>
                                <span className="font-medium">{maxQuantity} {order.unit_of_measure}</span>
                            </div>
                        </div>

                        {/* Quantity Completed */}
                        <TextInput
                            form={formAdapter}
                            name="quantity_completed"
                            label="Quantity Completed"
                            placeholder="0"
                        />

                        {/* Quantity Scrapped */}
                        <TextInput
                            form={formAdapter}
                            name="quantity_scrapped"
                            label="Quantity Scrapped (Optional)"
                            placeholder="0"
                        />

                        {/* Scrap Reason */}
                        {parseFloat(data.quantity_scrapped || '0') > 0 && (
                            <TextInput
                                form={formAdapter}
                                name="scrap_reason"
                                label="Scrap Reason"
                                placeholder="Enter reason for scrap"
                            />
                        )}

                        {/* Time Spent */}
                        <TextInput
                            form={formAdapter}
                            name="time_spent"
                            label="Time Spent (Minutes)"
                            placeholder="Optional"
                        />

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Add any production notes..."
                                rows={3}
                            />
                            {errors.notes && (
                                <p className="text-sm text-destructive">{errors.notes}</p>
                            )}
                        </div>

                        {/* Mark Complete */}
                        {remainingAfterReport <= 0 && (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="mark_complete"
                                    checked={data.mark_complete}
                                    onCheckedChange={(checked) => {
                                        if (typeof checked === 'boolean') {
                                            setData('mark_complete', checked);
                                        }
                                    }}
                                />
                                <Label
                                    htmlFor="mark_complete"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Mark order as complete
                                </Label>
                            </div>
                        )}

                        {/* Warning if quantities exceed available */}
                        {remainingAfterReport < 0 && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Total quantity exceeds available quantity by {Math.abs(remainingAfterReport)} {order.unit_of_measure}
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
                            disabled={processing || remainingAfterReport < 0}
                        >
                            Report Production
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
