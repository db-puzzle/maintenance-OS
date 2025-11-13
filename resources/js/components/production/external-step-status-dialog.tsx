import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextInput } from '@/components/TextInput';
import { ManufacturingStep } from '@/types/production';
import { Upload, X } from 'lucide-react';
import { createFormAdapter } from '@/utils/form-adapters';

interface ExternalStepStatusDialogProps {
    step: ManufacturingStep;
    action: 'ship' | 'in-process' | 'record-receipt';
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Dialog for updating external step status.
 *
 * IMPORTANT NOTE: The "record-receipt" action is typically handled by the
 * Logistics Module when marking a shipment as received. This dialog is for
 * direct updates when not using formal shipment tracking.
 */
export function ExternalStepStatusDialog({
    step,
    action,
    isOpen,
    onClose,
}: ExternalStepStatusDialogProps) {
    const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        quantity: action === 'ship'
            ? step.remaining_quantity_to_ship || 0
            : action === 'record-receipt'
                ? step.remaining_quantity_to_receive || 0
                : 0,
        notes: '',
        photos: [] as File[],
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const routeName = {
            ship: 'production.external-steps.mark-as-shipped',
            'in-process': 'production.external-steps.mark-as-in-process',
            'record-receipt': 'production.external-steps.record-quantity-received',
        }[action];

        post(route(routeName, step.id), {
            onSuccess: () => {
                onClose();
                setSelectedPhotos([]);
            },
        });
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newPhotos = [...selectedPhotos, ...files].slice(0, 5);
        setSelectedPhotos(newPhotos);
        setData('photos', newPhotos);
    };

    const removePhoto = (index: number) => {
        const newPhotos = selectedPhotos.filter((_, i) => i !== index);
        setSelectedPhotos(newPhotos);
        setData('photos', newPhotos);
    };

    const getTitle = () => {
        switch (action) {
            case 'ship':
                return 'Marcar como Enviado';
            case 'in-process':
                return 'Marcar como Em Processamento';
            case 'record-receipt':
                return 'Registrar Recebimento';
        }
    };

    const showQuantity = action === 'ship' || action === 'record-receipt';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Quantity Input (for ship/receive) */}
                    {showQuantity && (
                        <div className="space-y-2">
                            <TextInput
                                form={formAdapter}
                                name="quantity"
                                label="Quantidade"
                                placeholder="0"
                                type="number"
                                min={0.01}
                                max={
                                    action === 'ship'
                                        ? step.remaining_quantity_to_ship
                                        : step.remaining_quantity_to_receive
                                }
                                helperText={
                                    action === 'ship'
                                        ? `Restante para enviar: ${step.remaining_quantity_to_ship}`
                                        : `Restante para receber: ${step.remaining_quantity_to_receive}`
                                }
                                required
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <TextInput
                            form={formAdapter}
                            name="notes"
                            label="Notas (opcional)"
                            placeholder="Adicione informações relevantes..."
                        />
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-2">
                        <Label>Fotos (opcional, máx. 5)</Label>
                        <div className="border-2 border-dashed rounded-lg p-4">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoSelect}
                                className="hidden"
                                id="photo-upload"
                                disabled={selectedPhotos.length >= 5}
                            />
                            <label
                                htmlFor="photo-upload"
                                className="flex flex-col items-center gap-2 cursor-pointer"
                            >
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Clique para selecionar fotos
                                </span>
                            </label>
                        </div>

                        {/* Photo Preview */}
                        {selectedPhotos.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {selectedPhotos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={URL.createObjectURL(photo)}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-20 object-cover rounded"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Salvando...' : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

