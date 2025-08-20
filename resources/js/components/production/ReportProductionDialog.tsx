import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ManufacturingOrder } from '@/types/production';

interface Props {
    order: ManufacturingOrder;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReportProductionDialog({ order, open, onOpenChange }: Props) {
    const remaining = order.quantity - order.quantity_completed;

    const form = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        notes: '',
        mark_complete: false as boolean
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        form.post(route('production.orders.report-production', order.id), {
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            }
        });
    };

    // Update mark_complete when quantity changes
    const handleQuantityChange = (value: number) => {
        form.setData('quantity_completed', value);
        if (value >= remaining) {
            form.setData('mark_complete', true);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Report Production - {order.order_number}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Context */}
                        <div className="text-sm text-muted-foreground">
                            <div>Item: {order.item?.name}</div>
                            <div>Order Quantity: {order.quantity}</div>
                            <div>Completed: {order.quantity_completed} | Scrapped: {order.quantity_scrapped}</div>
                        </div>

                        {/* Quantity Completed */}
                        <div className="grid gap-2">
                            <Label htmlFor="quantity_completed">Quantity Completed</Label>
                            <Input
                                id="quantity_completed"
                                type="number"
                                min={0}
                                max={remaining}
                                value={form.data.quantity_completed}
                                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                                className={form.errors.quantity_completed ? 'border-destructive' : ''}
                            />
                            <p className="text-sm text-muted-foreground">Remaining: {remaining} units</p>
                            {form.errors.quantity_completed && (
                                <p className="text-sm text-destructive">{form.errors.quantity_completed}</p>
                            )}
                        </div>

                        {/* Quantity Scrapped */}
                        <div className="grid gap-2">
                            <Label htmlFor="quantity_scrapped">Quantity Scrapped (Optional)</Label>
                            <Input
                                id="quantity_scrapped"
                                type="number"
                                min={0}
                                value={form.data.quantity_scrapped}
                                onChange={(e) => form.setData('quantity_scrapped', parseInt(e.target.value) || 0)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Optional production notes..."
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                maxLength={500}
                            />
                        </div>

                        {/* Mark Complete */}
                        {form.data.quantity_completed >= remaining && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="mark_complete"
                                    checked={form.data.mark_complete}
                                    onCheckedChange={(checked) => {
                                        if (typeof checked === 'boolean') {
                                            form.setData('mark_complete', checked);
                                        }
                                    }}
                                />
                                <Label htmlFor="mark_complete">Mark order as completed</Label>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Report Production
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
