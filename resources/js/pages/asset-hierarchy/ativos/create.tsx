import { type BreadcrumbItem } from '@/types';
import { type Asset, type AssetType, type Area, type AssetForm, type Sector, type Plant } from '@/types/asset-hierarchy';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useMemo, useRef } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import SmartInput from "@/components/smart-input";
import { SmartPopover } from "@/components/ui/smart-popover";
import ItemSelect from '@/components/ItemSelect';
import TextInput from "@/components/TextInput";
import PhotoUploader from '@/components/PhotoUploader';
import CreatePlantSheet from '@/components/CreatePlantSheet';
import CreateAreaSheet from '@/components/CreateAreaSheet';
import CreateSectorSheet from '@/components/CreateSectorSheet';
import CreateAssetTypeSheet from '@/components/CreateAssetTypeSheet';
import DeleteAsset from '@/components/delete-asset';

import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import EditLayout from '@/layouts/asset-hierarchy/edit-layout';

interface Props {
    plants: Plant[];
    assetTypes: AssetType[];
    asset?: Asset & {
        asset_type: AssetType;
        plant: Plant;
        area?: Area & { plant: Plant };
        sector?: Sector;
    };
}

// Componente de formulário reutilizável
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
    assetTypeSelectRef,
    plantSelectRef,
    areaSelectRef,
    sectorSelectRef,
    handleCreateAssetTypeClick,
    handleCreatePlantClick,
    handleCreateAreaClick,
    handleCreateSectorClick
}: AssetFormFieldsProps) {
    return (
        <>
            {/* Foto e Campos Principais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna 1: Foto */}
                <PhotoUploader 
                    label="Foto do Ativo"
                    value={data.photo}
                    onChange={(file) => setData('photo', file)}
                    error={errors.photo}
                    initialPreview={isEditing && data.photo_path ? `/storage/${data.photo_path}` : null}
                />

                {/* Coluna 2: Informações Básicas */}
                <div className="space-y-6">
                    {/* TAG */}
                    <TextInput<AssetForm>
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors
                        }}
                        name="tag"
                        label="TAG"
                        placeholder="Digite a TAG do ativo"
                        required
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
                            canClear={true}
                        />
                    </div>

                    {/* Número Serial */}
                    <TextInput<AssetForm>
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors
                        }}
                        name="serial_number"
                        label="Número Serial"
                        placeholder="Número serial do ativo"
                    />

                    {/* Ano de Fabricação */}
                    <TextInput<AssetForm>
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors
                        }}
                        name="manufacturing_year"
                        label="Ano de Fabricação"
                        placeholder="Ano de fabricação"
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
                            canClear={true}
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
                            placeholder={data.plant_id ? "Selecione uma área (opcional)" : "Selecione uma planta primeiro"}
                            error={errors.area_id}
                            disabled={!data.plant_id}
                            canClear={true}
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
                            placeholder={data.area_id ? "Selecione um setor (opcional)" : "Selecione uma área primeiro"}
                            error={errors.sector_id}
                            disabled={!data.area_id}
                            canClear={true}
                        />
                    </div>

                    {/* Fabricante */}
                    <TextInput<AssetForm>
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors
                        }}
                        name="manufacturer"
                        label="Fabricante"
                        placeholder="Fabricante do ativo"
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
                />
                <InputError message={errors.description} />
            </div>
        </>
    );
}

export default function CreateAsset({ assetTypes, plants, asset }: Props) {
    const isEditing = !!asset;
    
    // Breadcrumbs dinâmicos baseados no modo (criar/editar)
    const breadcrumbs: BreadcrumbItem[] = isEditing ? [
        {
            title: 'Ativos',
            href: '/asset-hierarchy/ativos',
        },
        {
            title: 'Editar Ativo',
            href: `/asset-hierarchy/ativos/${asset.id}/edit`,
        },
    ] : [
        {
            title: 'Ativos',
            href: '/asset-hierarchy/ativos',
        },
        {
            title: 'Novo Ativo',
            href: '/asset-hierarchy/ativos/create',
        },
    ];

    const { data, setData, post, put, processing, errors, clearErrors } = useForm<AssetForm>({
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
        const selectedPlant = plants.find(p => p.id.toString() === data.plant_id);
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
            Object.keys(data).forEach(key => {
                if (key === 'photo') {
                    if (data[key]) {
                        formData.append(key, data[key] as File);
                    }
                } else {
                    formData.append(key, data[key] as string);
                }
            });

            put(route('asset-hierarchy.ativos.update', { asset: asset.id }), {
                onSuccess: () => {
                    toast.success(`O ativo ${data.tag} foi atualizado com sucesso!`);
                    router.visit(route('asset-hierarchy.ativos.show', asset.id));
                },
                onError: (errors) => {
                    toast.error("Erro ao atualizar ativo", {
                        description: "Verifique os campos e tente novamente."
                    });
                }
            });
        } else {
            // Lógica para criação
            post(route('asset-hierarchy.ativos.store'), {
                onError: (errors) => {
                    toast.error("Erro ao criar ativo", {
                        description: "Verifique os campos e tente novamente."
                    });
                }
            });
        }
    };

    const handlePlantCreated = () => {
        // Recarregar apenas os dados das plantas
        router.reload({ 
            only: ['plants'],
            onSuccess: (page) => {
                // Selecionar automaticamente a planta mais recente (última da lista)
                const updatedPlants = page.props.plants as Plant[];
                if (updatedPlants && updatedPlants.length > 0) {
                    const newestPlant = updatedPlants[updatedPlants.length - 1];
                    setData('plant_id', newestPlant.id.toString());
                    // Limpar área e setor já que mudou a planta
                    setData('area_id', '');
                    setData('sector_id', '');
                    
                    // Focar no campo da planta após um pequeno delay para garantir que a UI foi atualizada
                    setTimeout(() => {
                        plantSelectRef.current?.focus();
                    }, 100);
                }
            }
        });
    };

    const handleAreaCreated = () => {
        // Recarregar apenas os dados das plantas
        router.reload({ 
            only: ['plants'],
            onSuccess: (page) => {
                // Selecionar automaticamente a área mais recente da planta atual
                const updatedPlants = page.props.plants as Plant[];
                if (updatedPlants && data.plant_id) {
                    const currentPlant = updatedPlants.find(p => p.id.toString() === data.plant_id);
                    if (currentPlant?.areas && currentPlant.areas.length > 0) {
                        const newestArea = currentPlant.areas[currentPlant.areas.length - 1];
                        setData('area_id', newestArea.id.toString());
                        // Limpar setor já que mudou a área
                        setData('sector_id', '');
                        
                        // Focar no campo da área após um pequeno delay para garantir que a UI foi atualizada
                        setTimeout(() => {
                            areaSelectRef.current?.focus();
                        }, 100);
                    }
                }
            }
        });
    };

    const handleSectorCreated = () => {
        // Recarregar apenas os dados das plantas
        router.reload({ 
            only: ['plants'],
            onSuccess: (page) => {
                // Selecionar automaticamente o setor mais recente da área atual
                const updatedPlants = page.props.plants as Plant[];
                if (updatedPlants && data.plant_id && data.area_id) {
                    const currentPlant = updatedPlants.find(p => p.id.toString() === data.plant_id);
                    const currentArea = currentPlant?.areas?.find((a: Area) => a.id.toString() === data.area_id);
                    if (currentArea?.sectors && currentArea.sectors.length > 0) {
                        const newestSector = currentArea.sectors[currentArea.sectors.length - 1];
                        setData('sector_id', newestSector.id.toString());
                        
                        // Focar no campo do setor após um pequeno delay para garantir que a UI foi atualizada
                        setTimeout(() => {
                            sectorSelectRef.current?.focus();
                        }, 100);
                    }
                }
            }
        });
    };

    const handleAssetTypeCreated = () => {
        // Recarregar apenas os dados dos tipos de ativo
        router.reload({ 
            only: ['assetTypes'],
            onSuccess: (page) => {
                // Selecionar automaticamente o tipo de ativo mais recente
                const updatedAssetTypes = page.props.assetTypes as AssetType[];
                if (updatedAssetTypes && updatedAssetTypes.length > 0) {
                    const newestAssetType = updatedAssetTypes[updatedAssetTypes.length - 1];
                    setData('asset_type_id', newestAssetType.id.toString());
                    
                    // Focar no campo do tipo de ativo após um pequeno delay para garantir que a UI foi atualizada
                    setTimeout(() => {
                        assetTypeSelectRef.current?.focus();
                    }, 100);
                }
            }
        });
    };

    // Referências para os botões trigger
    const plantSheetTriggerRef = useRef<HTMLButtonElement>(null);
    const areaSheetTriggerRef = useRef<HTMLButtonElement>(null);
    const sectorSheetTriggerRef = useRef<HTMLButtonElement>(null);
    const assetTypeSheetTriggerRef = useRef<HTMLButtonElement>(null);

    // Referências para os campos
    const plantSelectRef = useRef<HTMLButtonElement>(null);
    const assetTypeSelectRef = useRef<HTMLButtonElement>(null);
    const areaSelectRef = useRef<HTMLButtonElement>(null);
    const sectorSelectRef = useRef<HTMLButtonElement>(null);

    // Funções para abrir os sheets programaticamente
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

    // Layout component baseado no modo
    const LayoutComponent = isEditing ? EditLayout : CreateLayout;
    const layoutProps = isEditing ? {
        title: `${asset.tag}`,
        subtitle: "Modifique as informações do ativo"
    } : {
        title: "Novo Ativo",
        subtitle: "Cadastre um novo ativo"
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEditing ? `${asset.tag}` : "Novo Ativo"} />

            <LayoutComponent
                {...layoutProps}
                breadcrumbs={breadcrumbs}
                backRoute={route('asset-hierarchy.ativos')}
                onSave={handleSave}
                isSaving={processing}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
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
                        assetTypeSelectRef={assetTypeSelectRef}
                        plantSelectRef={plantSelectRef}
                        areaSelectRef={areaSelectRef}
                        sectorSelectRef={sectorSelectRef}
                        handleCreateAssetTypeClick={handleCreateAssetTypeClick}
                        handleCreatePlantClick={handleCreatePlantClick}
                        handleCreateAreaClick={handleCreateAreaClick}
                        handleCreateSectorClick={handleCreateSectorClick}
                    />
                </form>

                {/* DeleteAsset Component apenas para modo de edição */}
                {isEditing && (
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            <DeleteAsset assetId={asset.id} assetTag={asset.tag} />
                        </div>
                    </div>
                )}
            </LayoutComponent>

            {/* CreatePlantSheet com SheetTrigger interno */}
            <div style={{ display: 'none' }}>
                <CreatePlantSheet
                    showTrigger={true}
                    triggerText="Trigger Oculto"
                    triggerVariant="outline"
                    triggerRef={plantSheetTriggerRef}
                    onSuccess={handlePlantCreated}
                />
            </div>

            {/* CreateAreaSheet com SheetTrigger interno */}
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

            {/* CreateSectorSheet com SheetTrigger interno */}
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

            {/* CreateAssetTypeSheet com SheetTrigger interno */}
            <div style={{ display: 'none' }}>
                <CreateAssetTypeSheet
                    showTrigger={true}
                    triggerText="Trigger Oculto"
                    triggerVariant="outline"
                    triggerRef={assetTypeSheetTriggerRef}
                    onSuccess={handleAssetTypeCreated}
                />
            </div>
        </AppLayout>
    );
} 