import React from 'react';
import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ManufacturingOrder } from '@/types/production';
import { createFormAdapter } from '@/utils/form-adapters';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoldProductionDialogProps {
    order: ManufacturingOrder;
    onClose: () => void;
}

export function HoldProductionDialog({ order, onClose }: HoldProductionDialogProps) {
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        hold_reason: 'other',
        expected_resolution: null as Date | null,
        notes: ''
    });

    const _formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Create form data with formatted date
        const formData = {
            ...data,
            expected_resolution: data.expected_resolution
                ? format(data.expected_resolution, 'yyyy-MM-dd HH:mm:ss')
                : null
        };

        // Submit with formatted data by updating the form data first
        Object.keys(formData).forEach(key => {
            setData(key as keyof typeof data, formData[key as keyof typeof formData]);
        });

        post(route('production.reporting.hold', order.id), {
            onSuccess: () => {
                onClose();
            }
        });
    };

    const holdReasons = [
        { value: 'machine_breakdown', label: 'Machine Breakdown' },
        { value: 'material_shortage', label: 'Material Shortage' },
        { value: 'quality_issue', label: 'Quality Issue' },
        { value: 'other', label: 'Other' }
    ];

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Put Order on Hold - {order.order_number}</DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                        {/* Order Info */}
                        <div className="p-3 bg-accent rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Item:</span>
                                <span className="font-medium">{order.item?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-muted-foreground">Current Status:</span>
                                <span className="font-medium capitalize">{order.status.replace('_', ' ')}</span>
                            </div>
                        </div>

                        {/* Hold Reason */}
                        <div className="space-y-2">
                            <Label>Hold Reason *</Label>
                            <RadioGroup
                                value={data.hold_reason}
                                onValueChange={(value) => setData('hold_reason', value)}
                            >
                                {holdReasons.map(reason => (
                                    <div key={reason.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={reason.value} id={reason.value} />
                                        <Label
                                            htmlFor={reason.value}
                                            className="font-normal cursor-pointer"
                                        >
                                            {reason.label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            {errors.hold_reason && (
                                <p className="text-sm text-destructive">{errors.hold_reason}</p>
                            )}
                        </div>

                        {/* Expected Resolution Date */}
                        <div className="space-y-2">
                            <Label htmlFor="expected_resolution">Expected Resolution Date (Optional)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="expected_resolution"
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !data.expected_resolution && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {data.expected_resolution
                                            ? format(data.expected_resolution, 'PPP')
                                            : "Select date"
                                        }
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={data.expected_resolution || undefined}
                                        onSelect={(date) => setData('expected_resolution', date || null)}
                                        disabled={(date) => date < new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {errors.expected_resolution && (
                                <p className="text-sm text-destructive">{errors.expected_resolution}</p>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Provide additional details about the hold..."
                                rows={4}
                            />
                            {errors.notes && (
                                <p className="text-sm text-destructive">{errors.notes}</p>
                            )}
                        </div>

                        {/* Warning */}
                        <div className="rounded-lg border border-warning bg-warning/10 p-3">
                            <p className="text-sm text-warning-foreground">
                                <strong>Note:</strong> Putting this order on hold will pause all active production steps.
                                {order.has_route && ' Any in-progress steps will be marked as on hold.'}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={processing}
                        >
                            Put on Hold
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
