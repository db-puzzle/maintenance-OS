import React from 'react';
import { useForm } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextInput } from '@/components/TextInput';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createFormAdapter } from '@/utils/form-adapters';
import { ManufacturingOrder } from '@/types/production';
import { Info, Play, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '@/utils/number';
import { toast } from 'sonner';

interface DirectExecutionProps {
    order: ManufacturingOrder;
}

export const DirectExecution: React.FC<DirectExecutionProps> = ({ order }) => {
    const canReport = order.status === 'released' || order.status === 'in_progress';
    const remainingQuantity = order.quantity - order.quantity_completed - order.quantity_scrapped;

    const form = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        notes: '',
        mark_complete: false
    });

    const formAdapter = createFormAdapter(form);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (form.data.quantity_completed > remainingQuantity) {
            toast.error('Cannot complete more than remaining quantity');
            return;
        }

        form.post(route('production.orders.report-production', order.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Production reported successfully');
                form.reset();
            },
            onError: () => {
                toast.error('Failed to report production');
            }
        });
    };

    const handleMarkComplete = () => {
        form.setData('mark_complete', true as any);
        form.setData('quantity_completed', remainingQuantity);
        handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    };

    if (!canReport) {
        return (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    This order must be released before production can be reported.
                    Current status: <strong>{order.status}</strong>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Direct Production Execution</CardTitle>
                <CardDescription>
                    This order has no route steps. Report production quantities directly.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <Label className="text-muted-foreground">Ordered</Label>
                            <p className="text-2xl font-semibold">
                                {formatNumber(order.quantity)} {order.unit_of_measure}
                            </p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Completed</Label>
                            <p className="text-2xl font-semibold text-green-600">
                                {formatNumber(order.quantity_completed)} {order.unit_of_measure}
                            </p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Remaining</Label>
                            <p className="text-2xl font-semibold text-blue-600">
                                {formatNumber(remainingQuantity)} {order.unit_of_measure}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="quantity_completed">Quantity Completed</Label>
                            <TextInput
                                form={formAdapter}
                                name="quantity_completed"
                                label=""
                                type="number"
                                min="0"
                                max={remainingQuantity}
                                placeholder="0"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity_scrapped">Quantity Scrapped (Optional)</Label>
                            <TextInput
                                form={formAdapter}
                                name="quantity_scrapped"
                                label=""
                                type="number"
                                min="0"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder="Any notes about this production report"
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <div className="text-sm text-muted-foreground">
                            {order.status === 'released' && (
                                <span className="flex items-center gap-1">
                                    <Info className="h-4 w-4" />
                                    Order will automatically start when you report production
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={form.processing}
                                variant="default"
                            >
                                <Play className="h-4 w-4 mr-2" />
                                Report Production
                            </Button>
                            {remainingQuantity > 0 && (
                                <Button
                                    type="button"
                                    onClick={handleMarkComplete}
                                    disabled={form.processing}
                                    variant="outline"
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Complete Order
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
