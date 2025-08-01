import MapComponent from '@/components/map';
import { TextInput } from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { type Plant } from '@/types/entities/plant';
import { router, useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Define a local form type with index signature
interface PlantFormData {
    name: string;
    street: string;
    number: string;
    city: string;
    state: string;
    zip_code: string;
    gps_coordinates: string;
    [key: string]: string | number | boolean | null | undefined;
}

interface PlantFormComponentProps {
    plant?: Plant;
    initialMode?: 'view' | 'edit';
    onCancel?: () => void;
    onSuccess?: () => void;
}

export default function PlantFormComponent({ plant, initialMode = 'view', onCancel, onSuccess }: PlantFormComponentProps) {
    const isEditing = !!plant;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;

    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    const { data, setData, put, processing, errors, clearErrors, reset } = useForm<PlantFormData>({
        name: plant?.name || '',
        street: plant?.street || '',
        number: plant?.number || '',
        city: plant?.city || '',
        state: plant?.state || '',
        zip_code: plant?.zip_code || '',
        gps_coordinates: plant?.gps_coordinates || '',
    });

    // Create a wrapper for setData to match the expected signature
    const handleSetData = (name: string, value: string | number | boolean | File | null | undefined) => {
        setData(name as keyof PlantFormData, value as PlantFormData[keyof PlantFormData]);
    };

    const handleSave = () => {
        if (isEditing) {
            put(route('asset-hierarchy.plants.update', { plant: plant.id }), {
                onSuccess: () => {
                    toast.success(`A planta ${data.name} foi atualizada com sucesso!`);
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                },
                onError: () => {
                    toast.error('Erro ao atualizar planta', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                },
            });
        }
    };

    const handleCancel = () => {
        if (isEditing && mode === 'edit') {
            // Reset form to original data
            reset();
            setMode('view');
        } else if (onCancel) {
            onCancel();
        }
    };

    const handleEdit = () => {
        setMode('edit');
    };

    return (
        <div className="space-y-6">
            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Nome */}
                <TextInput
                    form={{
                        data,
                        setData: handleSetData,
                        errors,
                        clearErrors,
                    }}
                    name="name"
                    label="Nome"
                    placeholder={isViewMode ? 'Nome não informado' : 'Digite o nome da planta'}
                    required={!isViewMode}
                    view={isViewMode}
                />

                {/* CEP */}
                <TextInput
                    form={{
                        data,
                        setData: handleSetData,
                        errors,
                        clearErrors,
                    }}
                    name="zip_code"
                    label="CEP"
                    placeholder={isViewMode ? 'CEP não informado' : 'Digite o CEP'}
                    view={isViewMode}
                />

                {/* Rua */}
                <TextInput
                    form={{
                        data,
                        setData: handleSetData,
                        errors,
                        clearErrors,
                    }}
                    name="street"
                    label="Rua"
                    placeholder={isViewMode ? 'Rua não informada' : 'Digite o nome da rua'}
                    view={isViewMode}
                />

                {/* Número */}
                <TextInput
                    form={{
                        data,
                        setData: handleSetData,
                        errors,
                        clearErrors,
                    }}
                    name="number"
                    label="Número"
                    placeholder={isViewMode ? 'Número não informado' : 'Digite o número'}
                    view={isViewMode}
                />

                {/* Cidade */}
                <TextInput
                    form={{
                        data,
                        setData: handleSetData,
                        errors,
                        clearErrors,
                    }}
                    name="city"
                    label="Cidade"
                    placeholder={isViewMode ? 'Cidade não informada' : 'Digite a cidade'}
                    view={isViewMode}
                />

                {/* Estado */}
                <TextInput
                    form={{
                        data,
                        setData: handleSetData,
                        errors,
                        clearErrors,
                    }}
                    name="state"
                    label="Estado"
                    placeholder={isViewMode ? 'Estado não informado' : 'Digite o estado'}
                    view={isViewMode}
                />

                {/* Coordenadas GPS */}
                <div className="md:col-span-2">
                    <TextInput
                        form={{
                            data,
                            setData: handleSetData,
                            errors,
                            clearErrors,
                        }}
                        name="gps_coordinates"
                        label="Coordenadas GPS"
                        placeholder={isViewMode ? 'Coordenadas não informadas' : 'Digite as coordenadas GPS'}
                        view={isViewMode}
                    />
                </div>
            </div>

            {/* Map Preview - Only show if we have coordinates */}
            {data.gps_coordinates && (
                <div className="space-y-2">
                    <Label>Localização no Mapa</Label>
                    <div className="h-64 w-full overflow-hidden rounded-lg border">
                        <MapComponent coordinates={data.gps_coordinates} />
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {isEditing && (
                <div className="flex justify-end gap-2">
                    {isViewMode ? (
                        <Button onClick={handleEdit} variant="default">
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                    ) : (
                        <>
                            <Button onClick={handleCancel} variant="outline" disabled={processing}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={processing}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
