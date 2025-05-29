import CreateAreaSheet from '@/components/CreateAreaSheet';
import CreateAssetTypeSheet from '@/components/CreateAssetTypeSheet';
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
import { Link, router, useForm } from '@inertiajs/react';
import { Camera, Pencil } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface AssetFormComponentProps {
    plants: Plant[];
    assetTypes: AssetType[];
    asset?: Asset & {
        asset_type: AssetType;
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
    setData: (key: keyof AssetForm, value: any) => void;
    errors: Partial<Record<keyof AssetForm, string>>;
    clearErrors: (...fields: (keyof AssetForm)[]) => void;
    plants: Plant[];
    assetTypes: AssetType[];
    availableAreas: Area[];
    availableSectors: Sector[];
    isEditing: boolean;
    isViewMode: boolean;
    // Refs
    assetTypeSelectRef: React.RefObject<HTMLButtonElement | null>;
    plantSelectRef: React.RefObject<HTMLButtonElement | null>;
    areaSelectRef: React.RefObject<HTMLButtonElement | null>;
    sectorSelectRef: React.RefObject<HTMLButtonElement | null>;
    // Handlers
    handleCreateAssetTypeClick: () => void;
    handleCreatePlantClick: () => void;
    handleCreateAreaClick: () => void;
    handleCreateSectorClick: () => void;
}

function AssetFormFields({
    data,
    setData,
    errors,
    clearErrors,
    plants,
    assetTypes,
    availableAreas,
    availableSectors,
    isEditing,
    isViewMode,
    assetTypeSelectRef,
    plantSelectRef,
    areaSelectRef,
    sectorSelectRef,
    handleCreateAssetTypeClick,
    handleCreatePlantClick,
    handleCreateAreaClick,
    handleCreateSectorClick,
}: AssetFormFieldsProps) {
    return (
        <>
            {/* Foto e Campos Principais */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Coluna 1: Foto */}
                {isViewMode ? (
                    <div className="flex h-full flex-col justify-center">
                        <div
                            className={`relative flex-1 overflow-hidden rounded-lg ${!data.photo_path ? 'bg-muted' : ''} max-h-[238px] min-h-[238px]`}
                        >
                            {data.photo_path ? (
                                <img
                                    src={`/storage/${data.photo_path}`}
                                    alt={`Foto do ativo ${data.tag}`}
                                    className="h-full w-full scale-120 object-contain"
                                />
                            ) : (
                                <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
                                    <Camera className="h-12 w-12" />
                                    <span className="text-sm">Sem foto</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <PhotoUploader
                        label="Foto do Ativo"
                        value={data.photo}
                        onChange={(file) => setData('photo', file)}
                        error={errors.photo}
                        initialPreview={isEditing && data.photo_path ? `/storage/${data.photo_path}` : null}
                    />
                )}

                {/* Coluna 2: Informações Básicas */}
                <div className="space-y-6">
                    {/* TAG */}
                    <TextInput<AssetForm>
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors,
                        }}
                        name="tag"
                        label="TAG"
                        placeholder="Digite a TAG do ativo"
                        required
                        disabled={isViewMode}
                    />

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
                            placeholder="Selecione um tipo de ativo"
                            error={errors.asset_type_id}
                            required
                            canClear={!isViewMode}
                            disabled={isViewMode}
                        />
                    </div>

                    {/* Número Serial */}
                    <TextInput<AssetForm>
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors,
                        }}
                        name="serial_number"
                        label="Número Serial"
                        placeholder="Número serial do ativo"
                        disabled={isViewMode}
                    />

                    {/* Ano de Fabricação */}
                    <TextInput<AssetForm>
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors,
                        }}
                        name="manufacturing_year"
                        label="Ano de Fabricação"
                        placeholder="Ano de fabricação"
                        disabled={isViewMode}
                    />
                </div>

                {/* Coluna 3: Localização e Informações Adicionais */}
                <div className="space-y-6">
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
                            placeholder="Selecione uma planta"
                            error={errors.plant_id}
                            required
                            canClear={!isViewMode}
                            disabled={isViewMode}
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
                            placeholder={data.plant_id ? 'Selecione uma área (opcional)' : 'Selecione uma planta primeiro'}
                            error={errors.area_id}
                            disabled={!data.plant_id || isViewMode}
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
                            placeholder={data.area_id ? 'Selecione um setor (opcional)' : 'Selecione uma área primeiro'}
                            error={errors.sector_id}
                            disabled={!data.area_id || isViewMode}
                            canClear={!isViewMode}
                        />
                    </div>

                    {/* Fabricante */}
                    <TextInput<AssetForm>
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors,
                        }}
                        name="manufacturer"
                        label="Fabricante"
                        placeholder="Fabricante do ativo"
                        disabled={isViewMode}
                    />
                </div>
            </div>

            {/* Descrição (Ocupa toda a largura) */}
            <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Descrição da máquina"
                    className="min-h-[100px]"
                    disabled={isViewMode}
                />
                <InputError message={errors.description} />
            </div>
        </>
    );
}

export default function AssetFormComponent({
    assetTypes,
    plants,
    asset,
    initialMode = 'view',
    onCancel,
    onSuccess
}: AssetFormComponentProps) {
    const isEditing = !!asset;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;

    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm<AssetForm>({
        tag: asset?.tag || '',
        serial_number: asset?.serial_number || '',
        asset_type_id: asset?.asset_type_id?.toString() || '',
        description: asset?.description || '',
        manufacturer: asset?.manufacturer || '',
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
                onError: (errors) => {
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
                    if (onSuccess) {
                        onSuccess();
                    }
                },
                onError: (errors) => {
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
    const plantSheetTriggerRef = useRef<HTMLButtonElement>(null);
    const areaSheetTriggerRef = useRef<HTMLButtonElement>(null);
    const sectorSheetTriggerRef = useRef<HTMLButtonElement>(null);
    const assetTypeSheetTriggerRef = useRef<HTMLButtonElement>(null);

    const plantSelectRef = useRef<HTMLButtonElement>(null);
    const assetTypeSelectRef = useRef<HTMLButtonElement>(null);
    const areaSelectRef = useRef<HTMLButtonElement>(null);
    const sectorSelectRef = useRef<HTMLButtonElement>(null);

    const handleCreatePlantClick = () => {
        plantSheetTriggerRef.current?.click();
    };

    const handleCreateAreaClick = () => {
        areaSheetTriggerRef.current?.click();
    };

    const handleCreateSectorClick = () => {
        sectorSheetTriggerRef.current?.click();
    };

    const handleCreateAssetTypeClick = () => {
        assetTypeSheetTriggerRef.current?.click();
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
                    setData={setData}
                    errors={errors}
                    clearErrors={clearErrors}
                    plants={plants}
                    assetTypes={assetTypes}
                    availableAreas={availableAreas}
                    availableSectors={availableSectors}
                    isEditing={isEditing}
                    isViewMode={isViewMode}
                    assetTypeSelectRef={assetTypeSelectRef}
                    plantSelectRef={plantSelectRef}
                    areaSelectRef={areaSelectRef}
                    sectorSelectRef={sectorSelectRef}
                    handleCreateAssetTypeClick={handleCreateAssetTypeClick}
                    handleCreatePlantClick={handleCreatePlantClick}
                    handleCreateAreaClick={handleCreateAreaClick}
                    handleCreateSectorClick={handleCreateSectorClick}
                />

                {/* Action buttons */}
                {isEditing && (
                    <div className="flex justify-start gap-2 pt-4">
                        {isViewMode ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleEdit}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={processing}
                                >
                                    {processing ? 'Salvando...' : 'Salvar Alterações'}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* Action buttons for create mode */}
                {!isEditing && (
                    <div className="flex justify-start gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                        >
                            {processing ? 'Criando...' : 'Criar Ativo'}
                        </Button>
                    </div>
                )}
            </form>

            {/* DeleteAsset Component apenas para modo de edição */}
            {isEditing && !isViewMode && (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                        <DeleteAsset assetId={asset.id} assetTag={asset.tag} />
                    </div>
                </div>
            )}

            {/* Hidden Sheets for creating new entities */}
            <div style={{ display: 'none' }}>
                <CreatePlantSheet
                    showTrigger={true}
                    triggerText="Trigger Oculto"
                    triggerVariant="outline"
                    triggerRef={plantSheetTriggerRef}
                    onSuccess={handlePlantCreated}
                />
            </div>

            <div style={{ display: 'none' }}>
                <CreateAreaSheet
                    showTrigger={true}
                    triggerText="Trigger Oculto"
                    triggerVariant="outline"
                    triggerRef={areaSheetTriggerRef}
                    plants={plants}
                    selectedPlantId={data.plant_id?.toString()}
                    disableParentFields={true}
                    onSuccess={handleAreaCreated}
                />
            </div>

            <div style={{ display: 'none' }}>
                <CreateSectorSheet
                    showTrigger={true}
                    triggerText="Trigger Oculto"
                    triggerVariant="outline"
                    triggerRef={sectorSheetTriggerRef}
                    plants={plants}
                    selectedPlantId={data.plant_id?.toString()}
                    selectedAreaId={data.area_id?.toString()}
                    disableParentFields={true}
                    onSuccess={handleSectorCreated}
                />
            </div>

            <div style={{ display: 'none' }}>
                <CreateAssetTypeSheet
                    showTrigger={true}
                    triggerText="Trigger Oculto"
                    triggerVariant="outline"
                    triggerRef={assetTypeSheetTriggerRef}
                    onSuccess={handleAssetTypeCreated}
                />
            </div>
        </>
    );
} 