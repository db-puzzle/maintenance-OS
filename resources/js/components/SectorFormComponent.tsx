import CreateAreaSheet from '@/components/CreateAreaSheet';
import CreatePlantSheet from '@/components/CreatePlantSheet';
import { ItemSelect } from '@/components/ItemSelect';
import { TextInput } from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type Area, type Plant, type Sector } from '@/types/asset-hierarchy';
import { router, useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// Define a local form type with index signature
interface SectorFormData {
    name: string;
    description: string;
    plant_id: string;
    area_id: string;
    [key: string]: string | number | boolean | null | undefined;
}

interface SectorFormComponentProps {
    sector?: Sector & {
        area: Area & {
            plant: Plant;
        };
    };
    plants?: Plant[];
    initialMode?: 'view' | 'edit';
    onCancel?: () => void;
    onSuccess?: () => void;
}

export default function SectorFormComponent({ sector, plants = [], initialMode = 'view', onCancel, onSuccess }: SectorFormComponentProps) {
    const isEditing = !!sector;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;

    // State for sheets
    const [plantSheetOpen, setPlantSheetOpen] = useState(false);
    const [areaSheetOpen, setAreaSheetOpen] = useState(false);

    // Refs
    const plantSelectRef = useRef<HTMLButtonElement | null>(null);
    const areaSelectRef = useRef<HTMLButtonElement | null>(null);

    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    const { data, setData, put, processing, errors, clearErrors, reset } = useForm<SectorFormData>({
        name: sector?.name || '',
        description: '',
        plant_id: sector?.area?.plant?.id?.toString() || '',
        area_id: sector?.area_id?.toString() || '',
    });

    // Get available areas based on selected plant
    const availableAreas = useMemo(() => {
        if (!data.plant_id) return [];
        const selectedPlant = plants.find((p) => p.id.toString() === data.plant_id);
        return selectedPlant?.areas || [];
    }, [data.plant_id, plants]);

    const handleSave = () => {
        if (isEditing) {
            put(route('asset-hierarchy.sectors.update', { setor: sector.id }), {
                onSuccess: () => {
                    toast.success(`O setor ${data.name} foi atualizado com sucesso!`);
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                },
                onError: () => {
                    toast.error('Erro ao atualizar setor', {
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
                    setData('area_id', ''); // Clear area when plant changes

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

    const handleCreateAreaClick = () => {
        setAreaSheetOpen(true);
    };

    const handleAreaCreated = () => {
        setAreaSheetOpen(false);
        router.reload({
            only: ['plants'],
            onSuccess: (page) => {
                const updatedPlants = page.props.plants as Plant[];
                if (updatedPlants && data.plant_id) {
                    const currentPlant = updatedPlants.find((p) => p.id.toString() === data.plant_id);
                    if (currentPlant?.areas && currentPlant.areas.length > 0) {
                        const newestArea = currentPlant.areas[currentPlant.areas.length - 1];
                        setData('area_id', newestArea.id.toString());

                        // Focus and highlight the area select field
                        setTimeout(() => {
                            const selectButton = areaSelectRef.current;
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
                        setData,
                        errors,
                        clearErrors,
                    }}
                    name="name"
                    label="Nome"
                    placeholder={isViewMode ? 'Nome não informado' : 'Digite o nome do setor'}
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
                            if (!value) {
                                // Se limpar a planta, limpar também a área
                                setData('area_id', '');
                            } else {
                                // Se mudar a planta, limpar a área
                                setData('area_id', '');
                            }
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

                {/* Área */}
                <div className="grid gap-2">
                    <ItemSelect
                        ref={areaSelectRef}
                        label="Área"
                        items={availableAreas}
                        value={data.area_id}
                        onValueChange={(value) => {
                            setData('area_id', value);
                            clearErrors('area_id');
                        }}
                        onCreateClick={handleCreateAreaClick}
                        placeholder={
                            isViewMode && !data.area_id
                                ? 'Área não selecionada'
                                : data.plant_id
                                    ? 'Selecione uma área'
                                    : 'Selecione uma planta primeiro'
                        }
                        error={errors.area_id}
                        disabled={!data.plant_id || isViewMode}
                        view={isViewMode}
                        required={!isViewMode}
                    />
                </div>

                {/* Descrição - Ocupa toda a largura */}
                <div className="md:col-span-2">
                    <div className="grid gap-2">
                        <Label htmlFor="description">Descrição</Label>
                        {isViewMode && !data.description ? (
                            <div className="border-input bg-muted/20 text-muted-foreground flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm">
                                Sem descrição
                            </div>
                        ) : (
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Descrição do setor"
                                className="min-h-[60px]"
                                view={isViewMode}
                            />
                        )}
                    </div>
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

            {/* CreateAreaSheet for creating new areas */}
            <CreateAreaSheet
                open={areaSheetOpen}
                onOpenChange={setAreaSheetOpen}
                plants={plants}
                selectedPlantId={data.plant_id}
                disableParentFields={true}
                onSuccess={handleAreaCreated}
            />
        </div>
    );
}
