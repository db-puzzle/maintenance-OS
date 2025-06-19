import CreateAreaSheet from '@/components/CreateAreaSheet';
import CreateAssetTypeSheet from '@/components/CreateAssetTypeSheet';
import CreateManufacturerSheet from '@/components/CreateManufacturerSheet';
import CreatePlantSheet from '@/components/CreatePlantSheet';
import CreateSectorSheet from '@/components/CreateSectorSheet';
import DeleteAsset from '@/components/delete-asset';
import InputError from '@/components/input-error';
import ItemSelect from '@/components/ItemSelect';
import PhotoUploader from '@/components/PhotoUploader';
import TextInput from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type Area, type Asset, type AssetForm, type AssetType, type Plant, type Sector } from '@/types/asset-hierarchy';
import { router, useForm } from '@inertiajs/react';
import { Camera, Pencil } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Manufacturer {
    id: number;
    name: string;
}

interface AssetFormComponentProps {
    plants: Plant[];
    assetTypes: AssetType[];
    manufacturers: Manufacturer[];
    asset?: Asset & {
        asset_type: AssetType;
        manufacturer?: Manufacturer;
        plant: Plant;
        area?: Area & { plant: Plant };
        sector?: Sector;
    };
    initialMode?: 'view' | 'edit';
    onCancel?: () => void;
    onSuccess?: () => void;
}

interface AssetFormFieldsProps {
    data: AssetForm;
    setData: (key: string, value: string | number | boolean | File | null | undefined) => void;
    errors: Partial<Record<string, string>>;
    clearErrors: (...fields: string[]) => void;
    plants: Plant[];
    assetTypes: AssetType[];
    manufacturers: Manufacturer[];
    availableAreas: Area[];
    availableSectors: Sector[];
    isEditing: boolean;
    isViewMode: boolean;
    // Refs
    tagInputRef?: React.RefObject<HTMLInputElement | null>;
    assetTypeSelectRef: React.RefObject<HTMLButtonElement | null>;
    plantSelectRef: React.RefObject<HTMLButtonElement | null>;
    areaSelectRef: React.RefObject<HTMLButtonElement | null>;
    sectorSelectRef: React.RefObject<HTMLButtonElement | null>;
    manufacturerSelectRef: React.RefObject<HTMLButtonElement | null>;
    // Handlers
    handleCreateAssetTypeClick: () => void;
    handleCreatePlantClick: () => void;
    handleCreateAreaClick: () => void;
    handleCreateSectorClick: () => void;
    handleCreateManufacturerClick: () => void;
}

function AssetFormFields({
    data,
    setData,
    errors,
    clearErrors,
    plants,
    assetTypes,
    manufacturers,
    availableAreas,
    availableSectors,
    isEditing,
    isViewMode,
    tagInputRef,
    assetTypeSelectRef,
    plantSelectRef,
    areaSelectRef,
    sectorSelectRef,
    manufacturerSelectRef,
    handleCreateAssetTypeClick,
    handleCreatePlantClick,
    handleCreateAreaClick,
    handleCreateSectorClick,
    handleCreateManufacturerClick,
}: AssetFormFieldsProps) {
    return (
        <>
            {/* Foto e Campos Principais */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Coluna 1: Foto - Spans 2 rows */}
                <div className="flex lg:row-span-2">
                    {isViewMode ? (
                        <div className="flex h-full w-full flex-col">
                            <Label className="mb-2">Foto do Ativo</Label>
                            <div className="flex flex-1 flex-col gap-2">
                                <div
                                    className={`bg-muted relative min-h-[200px] flex-1 overflow-hidden rounded-lg border ${!data.photo_path ? 'bg-muted' : ''}`}
                                >
                                    {data.photo_path ? (
                                        <img
                                            src={`/storage/${data.photo_path}`}
                                            alt={`Foto do ativo ${data.tag}`}
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
                                            <Camera className="h-12 w-12" />
                                            <span className="text-sm">Sem foto</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full">
                            <PhotoUploader
                                label="Foto do Ativo"
                                value={data.photo}
                                onChange={(file) => setData('photo', file)}
                                error={errors.photo}
                                initialPreview={isEditing && data.photo_path ? `/storage/${data.photo_path}` : null}
                                minHeight="min-h-[200px]"
                                maxHeight="max-h-auto"
                            />
                        </div>
                    )}
                </div>

                {/* Coluna 2: Informações Básicas */}
                <div className="space-y-6">
                    {/* TAG */}
                    <TextInput
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors,
                        }}
                        name="tag"
                        label="TAG"
                        placeholder="Digite a TAG do ativo"
                        required={!isViewMode}
                        view={isViewMode}
                        ref={tagInputRef}
                    />

                    {/* Part Number */}
                    <TextInput
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors,
                        }}
                        name="part_number"
                        label="Part Number"
                        placeholder={isViewMode ? 'Part number não informado' : 'Informe o part number do ativo'}
                        view={isViewMode}
                    />

                    {/* Fabricante */}
                    <div className="grid gap-2">
                        <ItemSelect
                            ref={manufacturerSelectRef}
                            label="Fabricante"
                            items={manufacturers}
                            value={data.manufacturer_id?.toString() || ''}
                            onValueChange={(value) => {
                                setData('manufacturer_id', value);
                                clearErrors('manufacturer_id');
                            }}
                            onCreateClick={handleCreateManufacturerClick}
                            placeholder={isViewMode && !data.manufacturer_id ? 'Fabricante não selecionado' : 'Selecione um fabricante (opcional)'}
                            error={errors.manufacturer_id}
                            canClear={!isViewMode}
                            view={isViewMode}
                        />
                    </div>
                </div>

                {/* Coluna 3: Informações Adicionais */}
                <div className="space-y-6">
                    {/* Tipo de Ativo */}
                    <div className="grid gap-2">
                        <ItemSelect
                            ref={assetTypeSelectRef}
                            label="Tipo de Ativo"
                            items={assetTypes}
                            value={data.asset_type_id?.toString() || ''}
                            onValueChange={(value) => {
                                setData('asset_type_id', value);
                                clearErrors('asset_type_id');
                            }}
                            onCreateClick={handleCreateAssetTypeClick}
                            placeholder={
                                isViewMode && !data.asset_type_id ? 'Tipo de ativo não selecionado' : 'Selecione um tipo de ativo (opcional)'
                            }
                            error={errors.asset_type_id}
                            canClear={!isViewMode}
                            view={isViewMode}
                        />
                    </div>

                    {/* Número Serial */}
                    <TextInput
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors,
                        }}
                        name="serial_number"
                        label="Número Serial"
                        placeholder={isViewMode ? 'Número serial não informado' : 'Informe o número serial do ativo'}
                        view={isViewMode}
                    />

                    {/* Ano de Fabricação */}
                    <TextInput
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors,
                        }}
                        name="manufacturing_year"
                        label="Ano de Fabricação"
                        placeholder={isViewMode ? 'Ano de fabricação não informado' : 'Informe o ano de fabricação do ativo'}
                        view={isViewMode}
                    />
                </div>

                {/* Descrição - Ocupa colunas 2 e 3 */}
                <div className="lg:col-span-2 lg:col-start-2">
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
                                placeholder="Descrição da máquina"
                                className="min-h-[60px]"
                                view={isViewMode}
                            />
                        )}
                        <InputError message={errors.description} />
                    </div>
                </div>
            </div>

            {/* Localização - Grid com 3 colunas em toda largura */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Planta */}
                <div className="grid gap-2">
                    <ItemSelect
                        ref={plantSelectRef}
                        label="Planta"
                        items={plants}
                        value={data.plant_id?.toString() || ''}
                        onValueChange={(value) => {
                            setData('plant_id', value);
                            if (!value) {
                                // Se limpar a planta, limpar também área e setor
                                setData('area_id', '');
                                setData('sector_id', '');
                            } else {
                                // Se mudar a planta, limpar área e setor
                                setData('area_id', '');
                                setData('sector_id', '');
                            }
                            clearErrors('plant_id');
                        }}
                        onCreateClick={handleCreatePlantClick}
                        placeholder={isViewMode && !data.plant_id ? 'Planta não selecionada' : 'Selecione uma planta (opcional)'}
                        error={errors.plant_id}
                        canClear={!isViewMode}
                        view={isViewMode}
                    />
                </div>

                {/* Área */}
                <div className="grid gap-2">
                    <ItemSelect
                        ref={areaSelectRef}
                        label="Área"
                        items={availableAreas}
                        value={data.area_id?.toString() || ''}
                        onValueChange={(value) => {
                            setData('area_id', value);
                            if (!value) {
                                // Se limpar a área, limpar também o setor
                                setData('sector_id', '');
                            } else {
                                // Se mudar a área, limpar o setor
                                setData('sector_id', '');
                            }
                            clearErrors('area_id');
                        }}
                        onCreateClick={handleCreateAreaClick}
                        placeholder={
                            isViewMode && !data.area_id
                                ? 'Área não selecionada'
                                : data.plant_id
                                  ? 'Selecione uma área (opcional)'
                                  : 'Selecione uma planta primeiro'
                        }
                        error={errors.area_id}
                        disabled={!data.plant_id}
                        view={isViewMode}
                        canClear={!isViewMode}
                    />
                </div>

                {/* Setor */}
                <div className="grid gap-2">
                    <ItemSelect
                        ref={sectorSelectRef}
                        label="Setor"
                        items={availableSectors}
                        value={data.sector_id?.toString() || ''}
                        onValueChange={(value) => {
                            setData('sector_id', value);
                            clearErrors('sector_id');
                        }}
                        onCreateClick={handleCreateSectorClick}
                        placeholder={
                            isViewMode && !data.sector_id
                                ? 'Setor não selecionado'
                                : data.area_id
                                  ? 'Selecione um setor (opcional)'
                                  : 'Selecione uma área primeiro'
                        }
                        error={errors.sector_id}
                        disabled={!data.area_id}
                        view={isViewMode}
                        canClear={!isViewMode}
                    />
                </div>
            </div>
        </>
    );
}

export default function AssetFormComponent({
    assetTypes,
    plants,
    manufacturers,
    asset,
    initialMode = 'view',
    onCancel,
    onSuccess,
}: AssetFormComponentProps) {
    const isEditing = !!asset;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;

    // Ensure mode updates when initialMode changes (e.g., after asset creation)
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm<AssetForm>({
        tag: asset?.tag || '',
        serial_number: asset?.serial_number || '',
        part_number: asset?.part_number || '',
        asset_type_id: asset?.asset_type_id?.toString() || '',
        description: asset?.description || '',
        manufacturer: typeof asset?.manufacturer === 'string' ? asset.manufacturer : '',
        manufacturer_id: asset?.manufacturer_id?.toString() || (typeof asset?.manufacturer === 'object' && asset?.manufacturer?.id?.toString()) || '',
        manufacturing_year: asset?.manufacturing_year?.toString() || '',
        plant_id: asset?.plant?.id?.toString() || '',
        area_id: asset?.area_id?.toString() || '',
        sector_id: asset?.sector_id?.toString() || '',
        photo: null as File | null,
        photo_path: asset?.photo_path || undefined,
    });

    const availableAreas = useMemo(() => {
        if (!data.plant_id) return [];
        const selectedPlant = plants.find((p) => p.id.toString() === data.plant_id);
        return selectedPlant?.areas || [];
    }, [data.plant_id, plants]);

    const availableSectors = useMemo(() => {
        if (!data.area_id) return [];
        const selectedArea = availableAreas.find((a: Area) => a.id.toString() === data.area_id);
        return selectedArea?.sectors || [];
    }, [data.area_id, availableAreas]);

    const handleSave = () => {
        if (isEditing) {
            // Lógica para edição
            const formData = new FormData();
            Object.keys(data).forEach((key) => {
                if (key === 'photo') {
                    if (data[key]) {
                        formData.append(key, data[key] as File);
                    }
                } else {
                    formData.append(key, data[key] as string);
                }
            });

            put(route('asset-hierarchy.assets.update', { asset: asset.id }), {
                onSuccess: () => {
                    toast.success(`O ativo ${data.tag} foi atualizado com sucesso!`);
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                },
                onError: () => {
                    toast.error('Erro ao atualizar ativo', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                },
            });
        } else {
            // Lógica para criação
            post(route('asset-hierarchy.assets.store'), {
                onSuccess: () => {
                    toast.success('Ativo criado com sucesso!');
                    // The backend will handle the redirect to the asset show page
                    // No need to call onSuccess as the page will be redirected
                },
                onError: () => {
                    toast.error('Erro ao criar ativo', {
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

    // Handler functions for creating new entities
    const handlePlantCreated = () => {
        setPlantSheetOpen(false);
        router.reload({
            only: ['plants'],
            onSuccess: (page) => {
                const updatedPlants = page.props.plants as Plant[];
                if (updatedPlants && updatedPlants.length > 0) {
                    const newestPlant = updatedPlants[updatedPlants.length - 1];
                    setData('plant_id', newestPlant.id.toString());
                    setData('area_id', '');
                    setData('sector_id', '');
                    setTimeout(() => {
                        plantSelectRef.current?.focus();
                    }, 100);
                }
            },
        });
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
                        setData('sector_id', '');
                        setTimeout(() => {
                            areaSelectRef.current?.focus();
                        }, 100);
                    }
                }
            },
        });
    };

    const handleSectorCreated = () => {
        setSectorSheetOpen(false);
        router.reload({
            only: ['plants'],
            onSuccess: (page) => {
                const updatedPlants = page.props.plants as Plant[];
                if (updatedPlants && data.plant_id && data.area_id) {
                    const currentPlant = updatedPlants.find((p) => p.id.toString() === data.plant_id);
                    const currentArea = currentPlant?.areas?.find((a: Area) => a.id.toString() === data.area_id);
                    if (currentArea?.sectors && currentArea.sectors.length > 0) {
                        const newestSector = currentArea.sectors[currentArea.sectors.length - 1];
                        setData('sector_id', newestSector.id.toString());
                        setTimeout(() => {
                            sectorSelectRef.current?.focus();
                        }, 100);
                    }
                }
            },
        });
    };

    const handleAssetTypeCreated = () => {
        setAssetTypeSheetOpen(false);
        router.reload({
            only: ['assetTypes'],
            onSuccess: (page) => {
                const updatedAssetTypes = page.props.assetTypes as AssetType[];
                if (updatedAssetTypes && updatedAssetTypes.length > 0) {
                    const newestAssetType = updatedAssetTypes[updatedAssetTypes.length - 1];
                    setData('asset_type_id', newestAssetType.id.toString());
                    setTimeout(() => {
                        assetTypeSelectRef.current?.focus();
                    }, 100);
                }
            },
        });
    };

    // Refs
    const plantSelectRef = useRef<HTMLButtonElement>(null);
    const assetTypeSelectRef = useRef<HTMLButtonElement>(null);
    const areaSelectRef = useRef<HTMLButtonElement>(null);
    const sectorSelectRef = useRef<HTMLButtonElement>(null);
    const manufacturerSelectRef = useRef<HTMLButtonElement>(null);
    const tagInputRef = useRef<HTMLInputElement>(null);

    // State for sheet visibility
    const [plantSheetOpen, setPlantSheetOpen] = useState(false);
    const [areaSheetOpen, setAreaSheetOpen] = useState(false);
    const [sectorSheetOpen, setSectorSheetOpen] = useState(false);
    const [assetTypeSheetOpen, setAssetTypeSheetOpen] = useState(false);
    const [manufacturerSheetOpen, setManufacturerSheetOpen] = useState(false);

    // Focus TAG input when creating a new asset
    useEffect(() => {
        if (!isEditing && tagInputRef.current) {
            tagInputRef.current.focus();
        }
    }, [isEditing]);

    const handleCreatePlantClick = () => {
        // Blur the current active element to release focus
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setPlantSheetOpen(true);
    };

    const handleCreateAreaClick = () => {
        setAreaSheetOpen(true);
    };

    const handleCreateSectorClick = () => {
        setSectorSheetOpen(true);
    };

    const handleCreateAssetTypeClick = () => {
        setAssetTypeSheetOpen(true);
    };

    const handleCreateManufacturerClick = () => {
        setManufacturerSheetOpen(true);
    };

    const handleManufacturerCreated = () => {
        setManufacturerSheetOpen(false);
        router.reload({
            only: ['manufacturers'],
            onSuccess: (page) => {
                const updatedManufacturers = page.props.manufacturers as Manufacturer[];
                if (updatedManufacturers && updatedManufacturers.length > 0) {
                    const newestManufacturer = updatedManufacturers[updatedManufacturers.length - 1];
                    setData('manufacturer_id', newestManufacturer.id.toString());

                    // Focus and highlight the manufacturer select field
                    setTimeout(() => {
                        const selectButton = manufacturerSelectRef.current;
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
        <>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                }}
                className="space-y-6"
            >
                <AssetFormFields
                    data={data}
                    setData={setData as (key: string, value: string | number | boolean | File | null | undefined) => void}
                    errors={errors as Partial<Record<string, string>>}
                    clearErrors={clearErrors as (...fields: string[]) => void}
                    plants={plants}
                    assetTypes={assetTypes}
                    manufacturers={manufacturers}
                    availableAreas={availableAreas}
                    availableSectors={availableSectors}
                    isEditing={isEditing}
                    isViewMode={isViewMode}
                    tagInputRef={tagInputRef}
                    assetTypeSelectRef={assetTypeSelectRef}
                    plantSelectRef={plantSelectRef}
                    areaSelectRef={areaSelectRef}
                    sectorSelectRef={sectorSelectRef}
                    manufacturerSelectRef={manufacturerSelectRef}
                    handleCreateAssetTypeClick={handleCreateAssetTypeClick}
                    handleCreatePlantClick={handleCreatePlantClick}
                    handleCreateAreaClick={handleCreateAreaClick}
                    handleCreateSectorClick={handleCreateSectorClick}
                    handleCreateManufacturerClick={handleCreateManufacturerClick}
                />

                {/* Action buttons */}
                {isEditing && (
                    <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Delete button on the left when in edit mode */}
                        {!isViewMode && (
                            <div className="w-full sm:w-auto">
                                <DeleteAsset assetId={asset.id} assetTag={asset.tag} />
                            </div>
                        )}

                        {/* Edit/Save/Cancel buttons on the right */}
                        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
                            {isViewMode ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleEdit();
                                    }}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                            ) : (
                                <>
                                    <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleCancel}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={processing}>
                                        {processing ? 'Salvando...' : 'Salvar'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Action buttons for create mode */}
                {!isEditing && (
                    <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-start">
                        <Button type="submit" className="w-full sm:w-auto" disabled={processing}>
                            {processing ? 'Criando...' : 'Criar Ativo'}
                        </Button>
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancel}>
                            Cancelar
                        </Button>
                    </div>
                )}
            </form>

            {/* Hidden Sheets for creating new entities */}
            <CreatePlantSheet open={plantSheetOpen} onOpenChange={setPlantSheetOpen} onSuccess={handlePlantCreated} />

            <CreateAreaSheet
                open={areaSheetOpen}
                onOpenChange={setAreaSheetOpen}
                plants={plants}
                selectedPlantId={data.plant_id?.toString()}
                disableParentFields={true}
                onSuccess={handleAreaCreated}
            />

            <CreateSectorSheet
                open={sectorSheetOpen}
                onOpenChange={setSectorSheetOpen}
                mode="create"
                plants={plants}
                selectedPlantId={data.plant_id?.toString()}
                selectedAreaId={data.area_id?.toString()}
                disableParentFields={true}
                onSuccess={handleSectorCreated}
            />

            <CreateAssetTypeSheet open={assetTypeSheetOpen} onOpenChange={setAssetTypeSheetOpen} mode="create" onSuccess={handleAssetTypeCreated} />

            <CreateManufacturerSheet
                open={manufacturerSheetOpen}
                onOpenChange={setManufacturerSheetOpen}
                mode="create"
                onSuccess={handleManufacturerCreated}
            />
        </>
    );
}
