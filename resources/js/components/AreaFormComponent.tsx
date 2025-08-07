import CreatePlantSheet from '@/components/CreatePlantSheet';
import { ItemSelect } from '@/components/ItemSelect';
import { TextInput } from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { type Area, type Plant } from '@/types/asset-hierarchy';
import { router, useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
// Define a local form type with index signature
interface AreaFormData {
    name: string;
    plant_id: string;
    [key: string]: string | number | boolean | null | undefined;
}
interface AreaFormComponentProps {
    area?: Area & {
        plant: Plant;
    };
    plants?: Plant[];
    initialMode?: 'view' | 'edit';
    onCancel?: () => void;
    onSuccess?: () => void;
}
export default function AreaFormComponent({ area, plants = [], initialMode = 'view', onCancel, onSuccess }: AreaFormComponentProps) {
    const isEditing = !!area;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;
    const [plantSheetOpen, setPlantSheetOpen] = useState(false);
    const plantSelectRef = useRef<HTMLButtonElement | null>(null);
    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);
    const { data, setData, put, processing, errors, clearErrors, reset } = useForm<AreaFormData>({
        name: area?.name || '',
        plant_id: area?.plant?.id?.toString() || '',
    });
    // Create a wrapper for setData to match the expected signature
    const handleSetData = (name: string, value: string | number | boolean | File | null | undefined) => {
        setData(name as keyof AreaFormData, value as AreaFormData[keyof AreaFormData]);
    };
    const handleSave = () => {
        if (isEditing) {
            put(route('asset-hierarchy.areas.update', { area: area.id }), {
                onSuccess: () => {
                    toast.success(`A área ${data.name} foi atualizada com sucesso!`);
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                },
                onError: () => {
                    toast.error('Erro ao atualizar área', {
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
    const handleCreatePlantClick = () => {
        setPlantSheetOpen(true);
    };
    const handlePlantCreated = () => {
        setPlantSheetOpen(false);
        router.reload({
            only: ['plants'],
            onSuccess: (page) => {
                const updatedPlants = page.props.plants as Plant[];
                if (updatedPlants && updatedPlants.length > 0) {
                    // Find the newest plant (usually the last one)
                    const newestPlant = updatedPlants[updatedPlants.length - 1];
                    setData('plant_id', newestPlant.id.toString());
                    // Focus and highlight the plant select field
                    setTimeout(() => {
                        const selectButton = plantSelectRef.current;
                        if (selectButton) {
                            selectButton.focus();
                            // Add a temporary highlight effect with smooth transition
                            selectButton.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
                            setTimeout(() => {
                                selectButton.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                                // Remove transition classes after animation completes
                                setTimeout(() => {
                                    selectButton.classList.remove('transition-all', 'duration-300');
                                }, 300);
                            }, 2000);
                        }
                    }, 100);
                }
            },
        });
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
                    placeholder={isViewMode ? 'Nome não informado' : 'Digite o nome da área'}
                    required={!isViewMode}
                    view={isViewMode}
                />
                {/* Planta */}
                <div className="grid gap-2">
                    <ItemSelect
                        ref={plantSelectRef}
                        label="Planta"
                        items={plants}
                        value={data.plant_id}
                        onValueChange={(value) => {
                            setData('plant_id', value);
                            clearErrors('plant_id');
                        }}
                        onCreateClick={handleCreatePlantClick}
                        placeholder={isViewMode && !data.plant_id ? 'Planta não selecionada' : 'Selecione uma planta'}
                        error={errors.plant_id}
                        disabled={isViewMode}
                        view={isViewMode}
                        required={!isViewMode}
                    />
                </div>
            </div>
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
            {/* CreatePlantSheet for creating new plants */}
            <CreatePlantSheet open={plantSheetOpen} onOpenChange={setPlantSheetOpen} onSuccess={handlePlantCreated} />
        </div>
    );
}
