import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Factory,
    Package,
    Calendar,
    Settings,
    Check,
    ChevronLeft,
    ChevronRight,
    Info,
    Search,
    Layers,
    Wrench,
    FileText,
    Zap,
    Ban,
    PlayCircle,
    TrendingUp,
    Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ItemSelect } from '@/components/ItemSelect';
import InputError from '@/components/input-error';
import StateButton from '@/components/StateButton';
import { Item, BillOfMaterial, RouteTemplate, BomVersion } from '@/types/production';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { ColumnConfig } from '@/types/shared';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items?: Item[];
    billsOfMaterial?: BillOfMaterial[];
    routeTemplates: RouteTemplate[];
    sourceTypes: Record<string, string>;
    selectedBomId?: number;
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
        <div className="flex items-center justify-between mx-6 px-2 -mt-3">
            {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs",
                                currentStep >= step.number
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {currentStep > step.number ? (
                                <Check className="h-3 w-3" />
                            ) : (
                                step.icon
                            )}
                        </div>
                        <span className={cn(
                            "text-xs hidden sm:inline",
                            currentStep >= step.number
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                        )}>
                            {step.title}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={cn(
                            "flex-1 h-0.5 mx-2",
                            currentStep > step.number
                                ? "bg-primary"
                                : "bg-muted"
                        )} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function CreateManufacturingOrderDialog({
    open,
    onOpenChange,
    items = [],
    billsOfMaterial = [],
    routeTemplates,
    sourceTypes,
    selectedBomId
}: Props) {
    const [currentStep, setCurrentStep] = useState(1);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [bomSearchQuery, setBomSearchQuery] = useState('');
    const [itemsPage, setItemsPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [bomsPage, setBomsPage] = useState(1);
    const [bomsPerPage, setBomsPerPage] = useState(10);

    const { data, setData, post, processing, errors, reset } = useForm({
        order_type: 'bom',
        item_id: '',
        bill_of_material_id: selectedBomId ? selectedBomId.toString() : '',
        quantity: 1,
        unit_of_measure: 'EA',
        priority: 50,
        requested_date: '',
        source_type: 'manual',
        source_reference: '',
        auto_complete_on_children: true as boolean,
        route_creation_mode: 'manual',
        route_template_id: '',
        // Progressive flow fields
        dependency_type: 'none' as 'none' | 'all_children_released' | 'children_quantity' | 'children_percentage',
        dependency_minimum_quantity: 0,
        dependency_minimum_percentage: 0,
        can_release_before_children: true as boolean,
    });

    const selectedItem = useMemo(() => {
        if (data.item_id) {
            return items.find(i => i.id === parseInt(data.item_id));
        }
        return null;
    }, [data.item_id, items]);

    // Filter BOMs that output the selected item
    const itemBOMs = useMemo(() => {
        if (!selectedItem) return [];
        return billsOfMaterial.filter(bom =>
            bom.output_item_id === selectedItem.id && bom.is_active
        );
    }, [selectedItem, billsOfMaterial]);

    const steps = useMemo(() => {
        const baseSteps = [
            { number: 1, title: 'Item', icon: <Package className="h-4 w-4" /> },
            { number: 2, title: 'BOM', icon: <Factory className="h-4 w-4" /> },
            { number: 3, title: 'Detalhes', icon: <Calendar className="h-4 w-4" /> },
            { number: 4, title: 'Rotas', icon: <Settings className="h-4 w-4" /> },
        ];

        // Only add the Dependencies steps if using BOM
        if (data.order_type === 'bom' && itemBOMs.length > 0) {
            baseSteps.push({ number: 5, title: 'Liberação', icon: <PlayCircle className="h-4 w-4" /> });
            baseSteps.push({ number: 6, title: 'Produção', icon: <TrendingUp className="h-4 w-4" /> });
        }

        return baseSteps;
    }, [data.order_type, itemBOMs.length]);

    // Handle when selectedBomId is provided (e.g., from BOM show page)
    useEffect(() => {
        if (selectedBomId && billsOfMaterial.length > 0) {
            const bom = billsOfMaterial.find(b => b.id === selectedBomId);
            if (bom && bom.output_item) {
                setData(prev => ({
                    ...prev,
                    item_id: bom.output_item!.id.toString(),
                    unit_of_measure: bom.output_item!.unit_of_measure || 'EA',
                    bill_of_material_id: selectedBomId.toString()
                }));
                setSelectedItemId(new Set([bom.output_item!.id]));
            }
        }
    }, [selectedBomId, billsOfMaterial, setData]);



    const selectedBOM = useMemo(() => {
        if (data.order_type === 'bom' && data.bill_of_material_id) {
            return billsOfMaterial.find(b => b.id === parseInt(data.bill_of_material_id));
        }
        return null;
    }, [data.bill_of_material_id, data.order_type, billsOfMaterial]);

    const bomItems = useMemo(() => {
        if (!selectedBOM?.current_version?.items) return [];
        return selectedBOM.current_version.items;
    }, [selectedBOM]);

    const filteredRouteTemplates = useMemo(() => {
        if (!selectedItem?.category) return routeTemplates;
        return routeTemplates.filter(t =>
            !t.item_category || t.item_category === selectedItem.category?.name
        );
    }, [selectedItem, routeTemplates]);

    // Filter items based on search query
    const filteredItems = useMemo(() => {
        const manufacturableItems = items.filter(i => i.can_be_manufactured);
        if (!itemSearchQuery.trim()) return manufacturableItems;

        const query = itemSearchQuery.toLowerCase();
        return manufacturableItems.filter(item =>
            item.item_number.toLowerCase().includes(query) ||
            item.name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.category?.name?.toLowerCase().includes(query)
        );
    }, [items, itemSearchQuery]);

    // Paginated items
    const paginatedItems = useMemo(() => {
        const start = (itemsPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return filteredItems.slice(start, end);
    }, [filteredItems, itemsPage, itemsPerPage]);

    const itemsPagination = useMemo(() => ({
        current_page: itemsPage,
        last_page: Math.ceil(filteredItems.length / itemsPerPage),
        per_page: itemsPerPage,
        total: filteredItems.length,
        from: filteredItems.length > 0 ? (itemsPage - 1) * itemsPerPage + 1 : null,
        to: filteredItems.length > 0 ? Math.min(itemsPage * itemsPerPage, filteredItems.length) : null,
    }), [filteredItems, itemsPage, itemsPerPage]);

    // Filter BOMs based on search query
    const filteredBOMs = useMemo(() => {
        if (!bomSearchQuery.trim()) return itemBOMs;

        const query = bomSearchQuery.toLowerCase();
        return itemBOMs.filter(bom =>
            bom.bom_number.toLowerCase().includes(query) ||
            bom.name.toLowerCase().includes(query) ||
            bom.description?.toLowerCase().includes(query)
        );
    }, [itemBOMs, bomSearchQuery]);

    // Paginated BOMs
    const paginatedBOMs = useMemo(() => {
        const start = (bomsPage - 1) * bomsPerPage;
        const end = start + bomsPerPage;
        return filteredBOMs.slice(start, end);
    }, [filteredBOMs, bomsPage, bomsPerPage]);

    const bomsPagination = useMemo(() => ({
        current_page: bomsPage,
        last_page: Math.ceil(filteredBOMs.length / bomsPerPage),
        per_page: bomsPerPage,
        total: filteredBOMs.length,
        from: filteredBOMs.length > 0 ? (bomsPage - 1) * bomsPerPage + 1 : null,
        to: filteredBOMs.length > 0 ? Math.min(bomsPage * bomsPerPage, filteredBOMs.length) : null,
    }), [filteredBOMs, bomsPage, bomsPerPage]);

    // Track selected item
    const [selectedItemId, setSelectedItemId] = useState<Set<string | number>>(
        data.item_id ? new Set([parseInt(data.item_id)]) : new Set()
    );

    // Handle item selection
    const handleItemSelection = (selectedIds: Set<string | number>) => {
        setSelectedItemId(selectedIds);
        // Get the first selected item
        const selectedId = Array.from(selectedIds)[0];
        if (selectedId) {
            const item = filteredItems.find(i => i.id === selectedId);
            if (item) {
                setData({
                    ...data,
                    item_id: item.id.toString(),
                    unit_of_measure: item.unit_of_measure || 'EA',
                    bill_of_material_id: '', // Reset BOM selection
                });
            }
        } else {
            // Clear selection
            setData({
                ...data,
                item_id: '',
                unit_of_measure: 'EA',
                bill_of_material_id: '',
            });
        }
    };

    // Define columns for items table (focused on manufacturing info)
    const itemColumns: ColumnConfig<Item>[] = useMemo(() => [
        {
            key: 'selection',
            label: '',
            width: 'w-[40px]',
            render: (_value: unknown, item: Item) => (
                data.item_id === item.id.toString() ? <Check className="h-4 w-4 text-primary" /> : null
            )
        },
        {
            key: 'item_number',
            label: 'Item Number',
            width: 'w-[120px]',
            render: (value: unknown) => <span className="font-medium">{String(value || '-')}</span>
        },
        {
            key: 'name',
            label: 'Name',
            width: 'w-[250px]',
            render: (value: unknown, item: Item) => (
                <div>
                    <div>{value as React.ReactNode}</div>
                    {item.category && (
                        <div className="text-xs text-muted-foreground">{item.category.name}</div>
                    )}
                </div>
            )
        },
        {
            key: 'manufacturing_lead_time_days',
            label: 'Lead Time',
            width: 'w-[100px]',
            render: (value: unknown) => (
                <Badge variant="secondary">{String(value || 0)} days</Badge>
            )
        },
        {
            key: 'unit_of_measure',
            label: 'UOM',
            width: 'w-[80px]',
            render: (value: unknown) => <span>{String(value || 'EA')}</span>
        },
        {
            key: 'has_bom',
            label: 'Has BOM',
            width: 'w-[100px]',
            render: (_value: unknown, item: Item) => {
                // Check if item has a primary BOM
                const primaryBom = item.primary_bom || (item as Item & { primaryBom?: BillOfMaterial }).primaryBom;

                // Also check if there are any BOMs that output this item
                const hasBoms = billsOfMaterial.some(bom =>
                    bom.output_item_id === item.id && bom.is_active
                );

                if (primaryBom) {
                    return (
                        <Badge variant="outline" className="text-xs">
                            {primaryBom.bom_number}
                        </Badge>
                    );
                } else if (hasBoms) {
                    // If no primary BOM but has active BOMs
                    const bomCount = billsOfMaterial.filter(bom =>
                        bom.output_item_id === item.id && bom.is_active
                    ).length;
                    return (
                        <Badge variant="secondary" className="text-xs">
                            {bomCount} BOM{bomCount > 1 ? 's' : ''}
                        </Badge>
                    );
                }

                return <span className="text-muted-foreground">-</span>;
            }
        }
    ], [data.item_id, billsOfMaterial]);

    // Define columns for BOMs table
    const bomColumns: ColumnConfig<BillOfMaterial>[] = useMemo(() => [
        {
            key: 'selection',
            label: '',
            width: 'w-[40px]',
            render: (_value: unknown, bom: BillOfMaterial) => (
                data.bill_of_material_id === bom.id.toString() ? (
                    <Check className="h-4 w-4 text-primary" />
                ) : null
            )
        },
        {
            key: 'bom_number',
            label: 'BOM Number',
            width: 'w-[120px]',
            render: (value: unknown) => <span className="font-medium">{String(value || '-')}</span>
        },
        {
            key: 'name',
            label: 'Name',
            width: 'w-[250px]',
            render: (value: unknown, bom: BillOfMaterial) => (
                <div>
                    <div>{value as React.ReactNode}</div>
                    {bom.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{bom.description}</div>
                    )}
                </div>
            )
        },
        {
            key: 'current_version',
            label: 'Version',
            width: 'w-[80px]',
            render: (value: unknown) => {
                const version = value as BomVersion | undefined;
                return (
                    <Badge variant="secondary" className="text-xs">
                        v{version?.version_number || 1}
                    </Badge>
                );
            }
        },
        {
            key: 'component_count',
            label: 'Components',
            width: 'w-[100px]',
            render: (_value: unknown, bom: BillOfMaterial) => {
                const version = bom.current_version as BomVersion | undefined;
                return <span>{version?.items?.length || 0} items</span>;
            }
        }
    ], [data.bill_of_material_id]);

    const handleNext = () => {
        if (currentStep < steps.length) {
            // Skip step 2 if no BOMs available for the selected item
            if (currentStep === 1 && itemBOMs.length === 0) {
                setCurrentStep(3);
                // Set order type to 'item' if no BOMs
                setData('order_type', 'item');
            } else {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            // Skip step 2 when going back if no BOMs available
            if (currentStep === 3 && itemBOMs.length === 0) {
                setCurrentStep(1);
            } else {
                setCurrentStep(currentStep - 1);
            }
        }
    };

    const handleSubmit = () => {
        const submitData = {
            ...data,
            item_id: data.item_id ? parseInt(data.item_id) : null,
            bill_of_material_id: data.bill_of_material_id ? parseInt(data.bill_of_material_id) : null,
            route_template_id: data.route_template_id ? parseInt(data.route_template_id) : null,
            // For BOM orders, use the user's choice
            // For non-BOM orders, always set to false (no children to auto-complete on)
            auto_complete_on_children: data.order_type === 'bom' ? data.auto_complete_on_children : false,
            // Only include progressive flow fields for BOM orders
            ...(data.order_type === 'bom' ? {
                dependency_type: data.dependency_type,
                dependency_minimum_quantity: data.dependency_minimum_quantity,
                dependency_minimum_percentage: data.dependency_minimum_percentage,
                can_release_before_children: data.can_release_before_children,
            } : {})
        };

        post(route('production.orders.store', submitData), {
            onSuccess: () => {
                reset();
                setCurrentStep(1);
                onOpenChange(false);
            },
            onError: (errors) => {
                console.error('Form submission errors:', errors);
            },
        });
    };

    const isStepValid = (step: number) => {
        switch (step) {
            case 1:
                return !!data.item_id; // Item selection is required
            case 2:
                // Step is valid if:
                // - No BOMs available (will be skipped), OR
                // - Order type is 'item' (no BOM needed), OR
                // - Order type is 'bom' AND a BOM is selected
                return itemBOMs.length === 0 || data.order_type === 'item' || (data.order_type === 'bom' && !!data.bill_of_material_id);
            case 3:
                return data.quantity > 0 && !!data.unit_of_measure;
            case 4:
                // For BOM orders, auto_complete_on_children must be selected
                return data.order_type !== 'bom' || data.auto_complete_on_children !== undefined;
            case 5:
                return true; // Release dependencies are optional
            case 6:
                return true; // Production dependencies are optional
            default:
                return false;
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
            setCurrentStep(1);
            setItemSearchQuery('');
            setBomSearchQuery('');
            setItemsPage(1);
            setBomsPage(1);
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="!max-w-[60vw] w-[60vw] h-[80vh]  flex flex-col p-0">
                <DialogHeader className="mt-4 px-6 py-4 border-b">
                    <DialogTitle>Criar Ordem de Manufatura</DialogTitle>
                    <DialogDescription>
                        Crie uma nova ordem de manufatura paraprodução
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-2 border-b">
                    <StepIndicator steps={steps} currentStep={currentStep} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden px-6">
                    <div className="flex-1 overflow-y-auto py-2">
                        {/* Step 1: Item Selection */}
                        {currentStep === 1 && (
                            <div className="flex flex-col h-full relative">
                                <Label className="text-base font-medium mb-4 block">
                                    Selecione o Item a ser Manufaturado
                                </Label>

                                {/* Search Box */}
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search by item number, name, or category..."
                                        value={itemSearchQuery}
                                        onChange={(e) => {
                                            setItemSearchQuery(e.target.value);
                                            setItemsPage(1); // Reset to first page on search
                                        }}
                                        className="pl-10"
                                    />
                                </div>

                                {/* Items Table */}
                                <div className="mb-4">
                                    <EntityDataTable
                                        data={paginatedItems}
                                        columns={itemColumns}
                                        loading={false}
                                        emptyMessage="Nenhum item manufaturável encontrado."
                                        maxHeight="350px"
                                        selectable={true}
                                        selectedRows={selectedItemId}
                                        onSelectionChange={handleItemSelection}
                                        getRowId={(item) => (item as Item).id}
                                        onRowClick={(item) => {
                                            // Handle row click - toggle selection
                                            const itemId = (item as Item).id;
                                            const newSelection = new Set(selectedItemId);
                                            if (newSelection.has(itemId)) {
                                                newSelection.delete(itemId);
                                            } else {
                                                newSelection.clear(); // Clear previous selection
                                                newSelection.add(itemId);
                                            }
                                            handleItemSelection(newSelection);
                                        }}
                                    />
                                </div>

                                {errors.item_id && (
                                    <InputError message={errors.item_id} className="mt-2" />
                                )}

                                {/* Fixed Pagination at bottom */}
                                <div className="pt-2">
                                    <EntityPagination
                                        pagination={itemsPagination}
                                        onPageChange={setItemsPage}
                                        onPerPageChange={(perPage) => {
                                            setItemsPerPage(perPage);
                                            setItemsPage(1);
                                        }}
                                    />
                                </div>

                            </div>
                        )}

                        {/* Step 2: BOM Selection */}
                        {currentStep === 2 && itemBOMs.length > 0 && (
                            <div className="space-y-6">

                                <div>
                                    <Label className="text-base font-medium mb-4 block">
                                        Selecione o tipo de ordem
                                    </Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <StateButton
                                            icon={Layers}
                                            title="Com BOM"
                                            description={`Usar uma BOM para fabricar o item.`}
                                            selected={data.order_type === 'bom'}
                                            onClick={() => {
                                                setData(prev => ({
                                                    ...prev,
                                                    order_type: 'bom',
                                                    bill_of_material_id: '',
                                                    // Reset route_creation_mode if it was 'template' (not available with BOM)
                                                    route_creation_mode: prev.route_creation_mode === 'template' ? 'manual' : prev.route_creation_mode
                                                }));
                                            }}
                                        />
                                        <StateButton
                                            icon={Package}
                                            title="Sem BOM"
                                            description={`Criar ordem diretamente para o item.`}
                                            selected={data.order_type === 'item'}
                                            onClick={() => {
                                                setData(prev => ({
                                                    ...prev,
                                                    order_type: 'item',
                                                    bill_of_material_id: '',
                                                    // Reset route_creation_mode if it was 'auto' (not available without BOM)
                                                    route_creation_mode: prev.route_creation_mode === 'auto' ? 'manual' : prev.route_creation_mode
                                                }));
                                            }}
                                        />
                                    </div>
                                </div>

                                {data.order_type === 'bom' && (
                                    <div className="flex flex-col h-full relative">
                                        <Label className="mb-4">Selecione a Bill of Materials</Label>

                                        {/* Search Box */}
                                        <div className="relative mb-4">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                placeholder="Search BOMs by number or name..."
                                                value={bomSearchQuery}
                                                onChange={(e) => {
                                                    setBomSearchQuery(e.target.value);
                                                    setBomsPage(1); // Reset to first page on search
                                                }}
                                                className="pl-10"
                                            />
                                        </div>

                                        {/* BOMs Table */}
                                        <div className="mb-4">
                                            <EntityDataTable
                                                data={paginatedBOMs}
                                                columns={bomColumns}
                                                loading={false}
                                                emptyMessage={`No BOMs found for ${selectedItem?.name}.`}
                                                maxHeight="195px"
                                                selectable={true}
                                                selectedRows={new Set(data.bill_of_material_id ? [Number(data.bill_of_material_id)] : [])}
                                                onSelectionChange={(selection: Set<string | number>) => {
                                                    const selectedId = Array.from(selection)[0];
                                                    setData('bill_of_material_id', selectedId ? selectedId.toString() : '');
                                                }}
                                                getRowId={(bom) => (bom as BillOfMaterial).id}
                                                onRowClick={(bom) => {
                                                    // Handle row click - toggle selection
                                                    const bomId = (bom as BillOfMaterial).id;
                                                    const newBomId = data.bill_of_material_id === bomId.toString() ? '' : bomId.toString();
                                                    setData('bill_of_material_id', newBomId);
                                                }}
                                            />
                                        </div>

                                        {/* Fixed Pagination at bottom */}
                                        {filteredBOMs.length > bomsPerPage && (
                                            <div className="pt-2">
                                                <EntityPagination
                                                    pagination={bomsPagination}
                                                    onPageChange={setBomsPage}
                                                    onPerPageChange={(perPage) => {
                                                        setBomsPerPage(perPage);
                                                        setBomsPage(1);
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {selectedBOM && (
                                            <Alert className="mt-4">
                                                <Info className="h-4 w-4" />
                                                <AlertDescription>
                                                    Essa ação também criará {bomItems.length} ordens de manufatura para os componentes desta BOM
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {errors.bill_of_material_id && (
                                            <InputError message={errors.bill_of_material_id} className="mt-2" />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Order Details */}
                        {currentStep === 3 && (
                            <ScrollArea className="h-full">

                                <div className="space-y-6 pr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="quantity">Quantidade</Label>
                                            <Input
                                                id="quantity"
                                                type="number"
                                                value={data.quantity}
                                                onChange={(e) => setData('quantity', parseFloat(e.target.value) || 0)}
                                                min={0.01}
                                                step={0.01}
                                                required
                                            />
                                            <InputError message={errors.quantity} />
                                        </div>

                                        <div>
                                            <Label htmlFor="unit_of_measure">Unidade de Medida</Label>
                                            <Input
                                                id="unit_of_measure"
                                                value={selectedItem?.unit_of_measure || ''}
                                                disabled
                                                className="bg-muted"
                                            />
                                            <InputError message={errors.unit_of_measure} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="priority">Prioridade (0-100)</Label>
                                            <div className="flex items-center gap-3 mt-2">
                                                <Progress
                                                    value={data.priority}
                                                    className="h-2 flex-1"
                                                />
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        id="priority"
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={data.priority}
                                                        onChange={(e) => {
                                                            const value = parseInt(e.target.value) || 0;
                                                            setData('priority', Math.min(100, Math.max(0, value)));
                                                        }}
                                                        className="w-16 h-8 text-center"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Maiores valores indicam maior prioridade
                                            </p>
                                        </div>

                                        <div>
                                            <Label htmlFor="requested_date">Data Requerida</Label>
                                            <Input
                                                id="requested_date"
                                                type="date"
                                                value={data.requested_date}
                                                onChange={(e) => setData('requested_date', e.target.value)}
                                            />
                                            <InputError message={errors.requested_date} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <ItemSelect
                                            label="Razão da Ordem"
                                            items={Object.entries(sourceTypes).map(([value, label]) => ({
                                                id: value,
                                                name: label,
                                            }))}
                                            value={data.source_type}
                                            onValueChange={(value) => setData('source_type', value)}

                                        />

                                        <div>
                                            <Label htmlFor="source_reference">Referência da Ordem</Label>
                                            <Input
                                                id="source_reference"
                                                value={data.source_reference}
                                                onChange={(e) => setData('source_reference', e.target.value)}
                                                placeholder="e.g., SO-12345"
                                            />
                                            <InputError message={errors.source_reference} />
                                        </div>
                                    </div>

                                </div>
                            </ScrollArea>
                        )}

                        {/* Step 4: Configuration */}
                        {currentStep === 4 && (
                            <ScrollArea className="h-full">
                                <div className="space-y-6 pr-4">

                                    {/* Route Configuration */}
                                    <div>
                                        <h3 className="font-medium mb-4">Rota de Manufatura</h3>
                                        <div className="space-y-4">
                                            <div className={`grid ${data.order_type === 'bom' ? 'grid-cols-2' : 'grid-cols-2'} gap-4`}>
                                                <StateButton
                                                    icon={Wrench}
                                                    title="Criar Manualmente"
                                                    description="Criar rotas manualmente após a criação da ordem"
                                                    selected={data.route_creation_mode === 'manual'}
                                                    onClick={() => setData('route_creation_mode', 'manual')}
                                                />

                                                {/* Show "Usar Template de Rota" only when NO BOM is selected */}
                                                {data.order_type !== 'bom' && (
                                                    <StateButton
                                                        icon={FileText}
                                                        title="Usar Template de Rota"
                                                        description="Aplicar agora um template predefinido"
                                                        selected={data.route_creation_mode === 'template'}
                                                        onClick={() => setData('route_creation_mode', 'template')}
                                                    />
                                                )}

                                                {/* Show "Criar Automaticamente" only when BOM is selected */}
                                                {data.order_type === 'bom' && (
                                                    <StateButton
                                                        icon={Zap}
                                                        title="Criar Automaticamente"
                                                        description="Criar rotas automaticamente com base na categoria do item"
                                                        selected={data.route_creation_mode === 'auto'}
                                                        onClick={() => setData('route_creation_mode', 'auto')}
                                                    />
                                                )}
                                            </div>

                                            {data.route_creation_mode === 'template' && data.order_type !== 'bom' && (
                                                <div className="space-y-3">
                                                    <ItemSelect
                                                        label=""
                                                        items={filteredRouteTemplates}
                                                        value={data.route_template_id}
                                                        onValueChange={(value) =>
                                                            setData('route_template_id', value)
                                                        }
                                                        placeholder="Select a route template..."
                                                    />

                                                    {data.route_template_id && (
                                                        <div className="p-3 bg-muted/20 rounded-lg">
                                                            <p className="text-sm">
                                                                {filteredRouteTemplates.find(
                                                                    t => t.id === parseInt(data.route_template_id)
                                                                )?.description}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Auto-Complete Configuration - Only for BOM orders (orders with children) */}
                                    {data.order_type === 'bom' && (
                                        <div>
                                            <h3 className="font-medium mb-4">Conclusão da Ordem Pai</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <StateButton
                                                    icon={Check}
                                                    title="Concluir Automaticamente"
                                                    description="A ordem pai será automaticamente concluída quando todas as ordens filhas forem concluídas"
                                                    selected={data.auto_complete_on_children === true}
                                                    onClick={() => setData('auto_complete_on_children', true)}
                                                />
                                                <StateButton
                                                    icon={Ban}
                                                    title="Concluir Manualmente"
                                                    description="A ordem pai precisará ser concluída manualmente, mesmo após todas as ordens filhas serem concluídas"
                                                    selected={data.auto_complete_on_children === false}
                                                    onClick={() => setData('auto_complete_on_children', false)}
                                                />
                                            </div>
                                            <Alert className="mt-4">
                                                <Info className="h-4 w-4" />
                                                <AlertDescription>
                                                    Nota: Se etapas de roteamento forem adicionadas posteriormente, a ordem sempre será concluída manualmente.
                                                </AlertDescription>
                                            </Alert>
                                        </div>
                                    )}

                                    {/* For non-BOM orders, no auto-complete option */}
                                    {data.order_type !== 'bom' && (
                                        <Alert className="mt-4">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                Ordens sem BOM devem ser concluídas manualmente ou através de etapas de roteamento.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                </div>
                            </ScrollArea>
                        )}

                        {/* Step 5: Release Dependencies */}
                        {currentStep === 5 && data.order_type === 'bom' && (
                            <ScrollArea className="h-full">
                                <div className="space-y-6 pr-4">
                                    <div>
                                        <h3 className="font-medium mb-2">Liberação da Ordem-Pai</h3>
                                        <p className="text-sm text-muted-foreground mb-6">
                                            Configure quando a ordem pai pode ser liberada para produção.
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <StateButton
                                                icon={PlayCircle}
                                                title="A Qualquer Momento"
                                                description="A ordem pai pode ser liberada mesmo se as ordens filhas não estiverem prontas"
                                                selected={data.can_release_before_children === true}
                                                onClick={() => setData('can_release_before_children', true)}
                                            />

                                            <StateButton
                                                icon={Ban}
                                                title="Após Ordens Filhas"
                                                description="A ordem pai deve esperar pelas ordens filhas serem liberadas antes de ser liberada"
                                                selected={data.can_release_before_children === false}
                                                onClick={() => setData('can_release_before_children', false)}
                                            />
                                        </div>
                                    </div>

                                    {/* Add inheritance info alert */}
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            A configuração de liberação selecionada será replicada automaticamente
                                            para todas as ordens filhas. Você poderá ajustar individualmente
                                            durante o planejamento, antes da liberação das ordens.
                                        </AlertDescription>
                                    </Alert>

                                </div>
                            </ScrollArea>
                        )}

                        {/* Step 6: Production Dependencies */}
                        {currentStep === 6 && data.order_type === 'bom' && (
                            <ScrollArea className="h-full">
                                <div className="space-y-6 pr-4">
                                    <div>
                                        <h3 className="font-medium mb-2">Dependências para Início da Produção</h3>
                                        <p className="text-sm text-muted-foreground mb-6">
                                            Configure quando a ordem pai pode começar a ser produzida com base no progresso das ordens filhas.
                                        </p>

                                        {/* Dependency Type Selection - 2x2 Grid */}
                                        <div className="grid grid-cols-2 gap-4">

                                            <StateButton
                                                icon={PlayCircle}
                                                title="Todas as Ordens Filhas Completas"
                                                description="A ordem pai só pode iniciar após todas as ordens filhas serem concluídas"
                                                selected={data.dependency_type === 'all_children_released'}
                                                onClick={() => {
                                                    setData('dependency_type', 'all_children_released');
                                                    setData('dependency_minimum_quantity', 0);
                                                    setData('dependency_minimum_percentage', 0);
                                                }}
                                            />

                                            <StateButton
                                                icon={Ban}
                                                title="Sem Dependências"
                                                description="A ordem pai pode começar a qualquer momento, independentemente das ordens filhas"
                                                selected={data.dependency_type === 'none'}
                                                onClick={() => {
                                                    setData('dependency_type', 'none');
                                                    setData('dependency_minimum_quantity', 0);
                                                    setData('dependency_minimum_percentage', 0);
                                                }}
                                            />

                                            <StateButton
                                                icon={TrendingUp}
                                                title="Baseado em Quantidade"
                                                description="A ordem pai só pode iniciar após as ordens filhas concluírem uma quantidade específica"
                                                selected={data.dependency_type === 'children_quantity'}
                                                onClick={() => {
                                                    setData('dependency_type', 'children_quantity');
                                                    setData('dependency_minimum_percentage', 0);
                                                }}
                                            />

                                            <StateButton
                                                icon={Percent}
                                                title="Baseado em Porcentagem"
                                                description="A ordem pai só pode iniciar após as ordens filhas concluírem uma porcentagem específica de sua quantidade total"
                                                selected={data.dependency_type === 'children_percentage'}
                                                onClick={() => {
                                                    setData('dependency_type', 'children_percentage');
                                                    setData('dependency_minimum_quantity', 0);
                                                }}
                                            />
                                        </div>

                                        {/* Quantity-Based Configuration */}
                                        {data.dependency_type === 'children_quantity' && (
                                            <div className="mt-6 p-4 rounded-lg border bg-muted/50">
                                                <Label htmlFor="min-quantity">Quantidade Mínima Requerida</Label>
                                                <Input
                                                    id="min-quantity"
                                                    type="number"
                                                    value={data.dependency_minimum_quantity}
                                                    onChange={(e) => setData('dependency_minimum_quantity', parseFloat(e.target.value) || 0)}
                                                    min={0}
                                                    step={1}
                                                    className="mt-2"
                                                />
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Total de unidades que devem ser concluídas em todas as ordens filhas
                                                </p>
                                            </div>
                                        )}

                                        {/* Percentage-Based Configuration */}
                                        {data.dependency_type === 'children_percentage' && (
                                            <div className="mt-6 p-4 rounded-lg border bg-muted/50">
                                                <Label htmlFor="min-percentage">Porcentagem Mínima Requerida</Label>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <Progress
                                                        value={data.dependency_minimum_percentage}
                                                        className="h-2 flex-1"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            id="min-percentage"
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={data.dependency_minimum_percentage}
                                                            onChange={(e) => {
                                                                const value = parseInt(e.target.value) || 0;
                                                                setData('dependency_minimum_percentage', Math.min(100, Math.max(0, value)));
                                                            }}
                                                            className="w-16 h-8 text-center"
                                                        />
                                                        <span className="text-sm text-muted-foreground">%</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Porcentagem de quantidade produzida por cada uma das ordens filhas
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Add inheritance info alert */}
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            As dependências de produção selecionadas serão aplicadas a todas as
                                            ordens filhas. Para dependências baseadas em quantidade, os valores
                                            serão ajustados proporcionalmente. Ajustes individuais podem ser
                                            feitos durante o planejamento.
                                        </AlertDescription>
                                    </Alert>


                                </div>
                            </ScrollArea>
                        )}
                    </div>

                    <DialogFooter className="px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentStep === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Previous
                        </Button>

                        {currentStep < steps.length ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={!isStepValid(currentStep)}
                                title={currentStep === 2 && data.order_type === 'bom' && !data.bill_of_material_id ? 'Selecione uma BOM para continuar' : ''}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={processing || !isStepValid(currentStep)}
                            >
                                {processing ? 'Creating...' : 'Create Order'}
                            </Button>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
} 