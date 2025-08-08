import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { Package, MapPin, Truck, Camera, Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextInput } from '@/components/TextInput';
import { ItemSelect } from '@/components/ItemSelect';
import AppLayout from '@/layouts/app-layout';
import { Item } from '@/types/production';
import { cn } from '@/lib/utils';

interface Props {
    items: Item[];
}

interface ShipmentItem {
    item_id: number;
    quantity: number;
    unit_of_measure: string;
}

interface ShipmentFormData {
    items: ShipmentItem[];
    destination_name: string;
    destination_address: string;
    destination_city: string;
    destination_state: string;
    destination_postal_code: string;
    destination_country: string;
    tracking_number: string;
    carrier: string;
    carrier_contact?: string;
    estimated_delivery_date: string;
    notes: string;
    require_signature: boolean;
    photo_paths?: string[];
}

// Form data for useForm which requires string serialization of arrays
interface ShipmentFormDataForInertia {
    items: string;
    destination_name: string;
    destination_address: string;
    destination_city: string;
    destination_state: string;
    destination_postal_code: string;
    destination_country: string;
    tracking_number: string;
    carrier: string;
    carrier_contact?: string;
    estimated_delivery_date: string;
    notes: string;
    require_signature: boolean;
    [key: string]: string | number | boolean | File | null | undefined;
}

interface StepIndicatorProps {
    steps: Array<{
        number: number;
        title: string;
        icon: React.ReactNode;
    }>;
    currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-between">
            {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                    <div className="flex flex-col items-center">
                        <div
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-medium",
                                currentStep >= step.number
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {currentStep > step.number ? (
                                <Check className="h-5 w-5" />
                            ) : (
                                step.icon
                            )}
                        </div>
                        <span className={cn(
                            "text-sm mt-2",
                            currentStep >= step.number
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                        )}>
                            {step.title}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div
                            className={cn(
                                "flex-1 h-0.5 mx-4 mt-5",
                                currentStep > step.number
                                    ? "bg-primary"
                                    : "bg-muted"
                            )}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function ShipmentCreate({ items }: Props) {
    const [step, setStep] = useState(1);
    const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
    const [photos, setPhotos] = useState<File[]>([]);

    const { data, setData, errors, processing, clearErrors } = useForm<ShipmentFormDataForInertia>({
        items: '[]',
        destination_name: '',
        destination_address: '',
        destination_city: '',
        destination_state: '',
        destination_postal_code: '',
        destination_country: 'Brasil',
        tracking_number: '',
        carrier: '',
        carrier_contact: '',
        estimated_delivery_date: '',
        notes: '',
        require_signature: false
    });

    const steps = [
        { number: 1, title: 'Itens', icon: <Package className="h-4 w-4" /> },
        { number: 2, title: 'Destino', icon: <MapPin className="h-4 w-4" /> },
        { number: 3, title: 'Transporte', icon: <Truck className="h-4 w-4" /> },
        { number: 4, title: 'Fotos', icon: <Camera className="h-4 w-4" /> },
        { number: 5, title: 'Confirmação', icon: <Check className="h-4 w-4" /> }
    ];

    const handleCreateShipment = () => {
        const formData = new FormData();

        // Add regular data
        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'photos' && key !== 'items') {
                formData.append(key, value as string);
            }
        });

        // Add items as JSON
        formData.append('items', JSON.stringify(shipmentItems));

        // Add photos
        photos.forEach((photo, index) => {
            formData.append(`photos[${index}]`, photo);
        });

        router.post(route('production.shipments.store'), formData);
    };

    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'Remessas', href: route('production.shipments.index') },
        { title: 'Nova Remessa', href: '' }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="max-w-4xl mx-auto py-6 px-4">
                {/* Progress Steps */}
                <div className="mb-8">
                    <StepIndicator steps={steps} currentStep={step} />
                </div>

                {/* Step Content */}
                <Card>
                    <CardContent className="p-6">
                        {step === 1 && (
                            <ShipmentItemsStep
                                items={items}
                                shipmentItems={shipmentItems}
                                onItemsChange={setShipmentItems}
                            />
                        )}
                        {step === 2 && (
                            <DestinationStep
                                data={data}
                                setData={setData}
                                errors={errors}
                                clearErrors={clearErrors}
                            />
                        )}
                        {step === 3 && (
                            <CarrierStep
                                data={data}
                                setData={setData}
                                errors={errors}
                                clearErrors={clearErrors}
                            />
                        )}
                        {step === 4 && (
                            <PhotosStep
                                photos={photos}
                                onPhotosChange={setPhotos}
                            />
                        )}
                        {step === 5 && (
                            <ConfirmationStep
                                data={data as unknown as ShipmentFormData}
                                shipmentItems={shipmentItems}
                                items={items}
                                photos={photos}
                            />
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setStep(step - 1)}
                            disabled={step === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                        <Button
                            onClick={() =>
                                step === steps.length ?
                                    handleCreateShipment() :
                                    setStep(step + 1)
                            }
                            disabled={processing}
                        >
                            {step === steps.length ? (
                                processing ? 'Criando...' : 'Criar Remessa'
                            ) : (
                                <>
                                    Próximo
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </AppLayout>
    );
}

// Step 1: Items Selection
function ShipmentItemsStep({
    items,
    shipmentItems,
    onItemsChange
}: {
    items: Item[];
    shipmentItems: ShipmentItem[];
    onItemsChange: (items: ShipmentItem[]) => void;
}) {
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantity, setQuantity] = useState('1');

    const addItem = () => {
        if (!selectedItemId || !quantity) return;

        const item = items.find(i => i.id.toString() === selectedItemId);
        if (!item) return;

        const newItem: ShipmentItem = {
            item_id: item.id,
            quantity: parseInt(quantity),
            unit_of_measure: item.unit_of_measure
        };

        onItemsChange([...shipmentItems, newItem]);
        setSelectedItemId('');
        setQuantity('1');
    };

    const removeItem = (index: number) => {
        onItemsChange(shipmentItems.filter((_, i) => i !== index));
    };

    const getItemDetails = (itemId: number) => {
        return items.find(i => i.id === itemId);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Selecionar Itens</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Adicione os itens que serão enviados nesta remessa
                </p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <ItemSelect
                            label="Item"
                            items={items.map(i => ({
                                id: i.id,
                                name: `${i.item_number} - ${i.name}`
                            }))}
                            value={selectedItemId}
                            onValueChange={setSelectedItemId}
                            placeholder="Selecione um item"
                            canCreate={false}
                        />
                    </div>
                    <div>
                        <Label>Quantidade</Label>
                        <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>
                </div>
                <Button
                    onClick={addItem}
                    disabled={!selectedItemId || !quantity}
                    className="w-full md:w-auto"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                </Button>
            </div>

            {shipmentItems.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-medium">Itens Selecionados</h4>
                    <div className="space-y-2">
                        {shipmentItems.map((shipmentItem, index) => {
                            const item = getItemDetails(shipmentItem.item_id);
                            return (
                                <Card key={index}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">
                                                    {item?.item_number} - {item?.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Quantidade: {shipmentItem.quantity} {shipmentItem.unit_of_measure}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItem(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

interface StepProps {
    data: ShipmentFormData;
    setData: <K extends keyof ShipmentFormData>(key: K, value: ShipmentFormData[K]) => void;
    errors: Partial<Record<keyof ShipmentFormData, string>>;
    clearErrors: (...fields: (keyof ShipmentFormData)[]) => void;
}

// Step 2: Destination
function DestinationStep({ data, setData, errors, clearErrors }: StepProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Informações de Destino</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Preencha os dados do destinatário
                </p>
            </div>

            <div className="space-y-4">
                <TextInput
                    form={{ data, setData, errors, clearErrors }}
                    name="destination_name"
                    label="Nome do Destinatário"
                    placeholder="Nome da empresa ou pessoa"
                    required
                />

                <TextInput
                    form={{ data, setData, errors, clearErrors }}
                    name="destination_address"
                    label="Endereço"
                    placeholder="Rua, número, complemento"
                    required
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <TextInput
                            form={{ data, setData, errors, clearErrors }}
                            name="destination_city"
                            label="Cidade"
                            placeholder="Cidade"
                            required
                        />
                    </div>
                    <TextInput
                        form={{ data, setData, errors, clearErrors }}
                        name="destination_state"
                        label="Estado"
                        placeholder="UF"
                        required
                    />
                </div>

                <TextInput
                    form={{ data, setData, errors, clearErrors }}
                    name="destination_zip"
                    label="CEP"
                    placeholder="00000-000"
                />
            </div>
        </div>
    );
}

// Step 3: Carrier
function CarrierStep({ data, setData, errors, clearErrors }: StepProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Informações de Transporte</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Preencha os dados da transportadora
                </p>
            </div>

            <div className="space-y-4">
                <TextInput
                    form={{ data, setData, errors, clearErrors }}
                    name="carrier"
                    label="Transportadora"
                    placeholder="Nome da transportadora"
                />

                <TextInput
                    form={{ data, setData, errors, clearErrors }}
                    name="carrier_contact"
                    label="Contato"
                    placeholder="Telefone ou email de contato"
                />

                <div>
                    <Label>Observações</Label>
                    <textarea
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        rows={4}
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        placeholder="Observações adicionais sobre a remessa..."
                    />
                </div>
            </div>
        </div>
    );
}

// Step 4: Photos
function PhotosStep({
    photos,
    onPhotosChange
}: {
    photos: File[];
    onPhotosChange: (photos: File[]) => void;
}) {
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        onPhotosChange([...photos, ...files]);
    };

    const removePhoto = (index: number) => {
        onPhotosChange(photos.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Fotos da Remessa</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Adicione fotos dos itens embalados para documentação
                </p>
            </div>

            <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                        <span className="text-primary hover:underline">
                            Clique para selecionar fotos
                        </span>
                    </Label>
                    <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                        ou arraste e solte as imagens aqui
                    </p>
                </div>

                {photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {photos.map((photo, index) => (
                            <div key={index} className="relative group">
                                <img
                                    src={URL.createObjectURL(photo)}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg"
                                />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removePhoto(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <p className="text-xs text-center mt-1 truncate">
                                    {photo.name}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Step 5: Confirmation
function ConfirmationStep({
    data,
    shipmentItems,
    items,
    photos
}: {
    data: ShipmentFormData;
    shipmentItems: ShipmentItem[];
    items: Item[];
    photos: File[];
}) {
    const getItemDetails = (itemId: number) => {
        return items.find(i => i.id === itemId);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Confirmar Remessa</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Revise as informações antes de criar a remessa
                </p>
            </div>

            <div className="space-y-4">
                {/* Items Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Itens</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {shipmentItems.map((shipmentItem, index) => {
                                const item = getItemDetails(shipmentItem.item_id);
                                return (
                                    <div key={index} className="flex justify-between">
                                        <span>{item?.item_number} - {item?.name}</span>
                                        <span className="font-medium">
                                            {shipmentItem.quantity} {shipmentItem.unit_of_measure}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Destination Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Destino</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 text-sm">
                            <p className="font-medium">{data.destination_name}</p>
                            <p>{data.destination_address}</p>
                            <p>{data.destination_city}, {data.destination_state} {data.destination_postal_code}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Carrier Summary */}
                {(data.carrier || data.carrier_contact) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Transporte</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1 text-sm">
                                {data.carrier && <p>Transportadora: {data.carrier}</p>}
                                {data.carrier_contact && <p>Contato: {data.carrier_contact}</p>}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Photos Summary */}
                {photos.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Fotos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">
                                {photos.length} foto{photos.length !== 1 ? 's' : ''} anexada{photos.length !== 1 ? 's' : ''}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Notes */}
                {data.notes && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Observações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{data.notes}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
} 