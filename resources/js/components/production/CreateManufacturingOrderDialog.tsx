import React, { useState, useMemo } from 'react';
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
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
        <div className="flex items-center justify-between px-2 -mt-3">
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
        order_type: selectedBomId ? 'bom' : 'item',
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
    });

    const steps = [
        { number: 1, title: 'Item', icon: <Package className="h-4 w-4" /> },
        { number: 2, title: 'BOM', icon: <Factory className="h-4 w-4" /> },
        { number: 3, title: 'Details', icon: <Calendar className="h-4 w-4" /> },
        { number: 4, title: 'Config', icon: <Settings className="h-4 w-4" /> },
    ];

    const selectedItem = useMemo(() => {
        if (data.item_id) {
            return items.find(i => i.id === parseInt(data.item_id));
        }
        return null;
    }, [data.item_id, items]);

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

    // Filter BOMs that output the selected item
    const itemBOMs = useMemo(() => {
        if (!selectedItem) return [];
        return billsOfMaterial.filter(bom =>
            bom.output_item_id === selectedItem.id && bom.is_active
        );
    }, [selectedItem, billsOfMaterial]);

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

    // Define columns for items table (focused on manufacturing info)
    const itemColumns: ColumnConfig<Item>[] = useMemo(() => [
        {
            key: 'selection',
            label: '',
            width: 'w-[40px]',
            render: (_value: unknown, item: Item) => (
                data.item_id === item.id.toString() ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : null
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
            key: 'primary_bom',
            label: 'Has BOM',
            width: 'w-[100px]',
            render: (value: unknown, item: Item) => (
                item.primary_bom ? (
                    <Badge variant="outline" className="text-xs">
                        {item.primary_bom.bom_number}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )
            )
        }
    ], [data.item_id]);

    // Define columns for BOMs table
    const bomColumns: ColumnConfig<BillOfMaterial>[] = useMemo(() => [
        {
            key: 'selection',
            label: '',
            width: 'w-[40px]',
            render: (_value: unknown, bom: BillOfMaterial) => (
                data.bill_of_material_id === bom.id.toString() ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
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
            key: 'current_version',
            label: 'Components',
            width: 'w-[100px]',
            render: (value: unknown) => {
                const version = value as BomVersion | undefined;
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
                // Skip BOM step if no BOMs available, or BOM selection is valid
                return itemBOMs.length === 0 || (data.order_type === 'bom' && !!data.bill_of_material_id);
            case 3:
                return data.quantity > 0 && !!data.unit_of_measure;
            case 4:
                return true; // Configuration is optional
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
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Create Manufacturing Order</DialogTitle>
                    <DialogDescription>
                        Create a new manufacturing order for production
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-2 border-b">
                    <StepIndicator steps={steps} currentStep={currentStep} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden px-6">
                    <div className="flex-1 flex flex-col py-2">
                        {/* Step 1: Item Selection */}
                        {currentStep === 1 && (
                            <div className="flex flex-col h-full relative">
                                <Label className="text-base font-medium mb-4 block">
                                    Select Item to Manufacture
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
                                        emptyMessage="No manufacturable items found."
                                        maxHeight="350px"
                                        onRowClick={(item) => {
                                            setData({
                                                ...data,
                                                item_id: (item as Item).id.toString(),
                                                unit_of_measure: (item as Item).unit_of_measure || 'EA',
                                                bill_of_material_id: '', // Reset BOM selection
                                            });
                                        }}
                                    />
                                </div>

                                {errors.item_id && (
                                    <InputError message={errors.item_id} className="mt-2" />
                                )}

                                {/* Fixed Pagination at bottom */}
                                <div className="pt-2 border-t">
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
                                        Select Manufacturing Method
                                    </Label>
                                    <RadioGroup
                                        value={data.order_type}
                                        onValueChange={(value: 'item' | 'bom') => {
                                            setData('order_type', value);
                                            setData('bill_of_material_id', '');
                                        }}
                                        className="space-y-4"
                                    >
                                        <div className="flex items-start space-x-3">
                                            <RadioGroupItem value="item" id="item" className="mt-1" />
                                            <div>
                                                <Label htmlFor="item" className="font-normal cursor-pointer">
                                                    <div className="font-medium">Direct Item Manufacturing</div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Create an order for {selectedItem?.name} without using a BOM
                                                    </p>
                                                </Label>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <RadioGroupItem value="bom" id="bom" className="mt-1" />
                                            <div>
                                                <Label htmlFor="bom" className="font-normal cursor-pointer">
                                                    <div className="font-medium">BOM-Based Manufacturing</div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Use a Bill of Materials to manufacture {selectedItem?.name}
                                                    </p>
                                                </Label>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {data.order_type === 'bom' && (
                                    <div className="flex flex-col h-full relative">
                                        <Label className="mb-4">Select Bill of Materials</Label>

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
                                                maxHeight="35vh"
                                                onRowClick={(bom) => {
                                                    setData('bill_of_material_id', (bom as BillOfMaterial).id.toString());
                                                }}
                                            />
                                        </div>

                                        {/* Fixed Pagination at bottom */}
                                        {filteredBOMs.length > bomsPerPage && (
                                            <div className="pt-2 border-t">
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
                                                    This will create {bomItems.length} child orders
                                                    for the components in this BOM
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
                                            <Label htmlFor="quantity">Quantity</Label>
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
                                            <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                                            <Input
                                                id="unit_of_measure"
                                                value={data.unit_of_measure}
                                                onChange={(e) => setData('unit_of_measure', e.target.value)}
                                                required
                                            />
                                            <InputError message={errors.unit_of_measure} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="priority">Priority (0-100)</Label>
                                            <div className="flex items-center gap-4 mt-2">
                                                <Input
                                                    id="priority"
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    value={data.priority}
                                                    onChange={(e) => setData('priority', parseInt(e.target.value))}
                                                    className="flex-1"
                                                />
                                                <span className="w-12 text-center font-medium">
                                                    {data.priority}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Higher values indicate higher priority
                                            </p>
                                        </div>

                                        <div>
                                            <Label htmlFor="requested_date">Requested Date</Label>
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
                                            label="Source Type"
                                            items={Object.entries(sourceTypes).map(([value, label]) => ({
                                                id: value,
                                                name: label,
                                            }))}
                                            value={data.source_type}
                                            onValueChange={(value) => setData('source_type', value)}

                                        />

                                        <div>
                                            <Label htmlFor="source_reference">Source Reference</Label>
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
                                        <h3 className="font-medium mb-4">Manufacturing Route</h3>
                                        <RadioGroup
                                            value={data.route_creation_mode}
                                            onValueChange={(value) =>
                                                setData('route_creation_mode', value as 'manual' | 'template' | 'auto')
                                            }
                                            className="space-y-4"
                                        >
                                            <div className="flex items-start space-x-3">
                                                <RadioGroupItem value="manual" id="manual" className="mt-1" />
                                                <div>
                                                    <Label htmlFor="manual" className="font-normal cursor-pointer">
                                                        <div className="font-medium">Manual Route Creation</div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Create routes manually after order release
                                                        </p>
                                                    </Label>
                                                </div>
                                            </div>

                                            <div className="flex items-start space-x-3">
                                                <RadioGroupItem value="template" id="template" className="mt-1" />
                                                <div className="flex-1">
                                                    <Label htmlFor="template" className="font-normal cursor-pointer">
                                                        <div className="font-medium">Use Route Template</div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Apply a predefined route template
                                                        </p>
                                                    </Label>

                                                    {data.route_creation_mode === 'template' && (
                                                        <div className="mt-3">
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
                                                                <div className="mt-3 p-3 bg-muted/20 rounded-lg">
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

                                            <div className="flex items-start space-x-3">
                                                <RadioGroupItem value="auto" id="auto" className="mt-1" />
                                                <div>
                                                    <Label htmlFor="auto" className="font-normal cursor-pointer">
                                                        <div className="font-medium">Auto-create from Defaults</div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Automatically create routes based on item category
                                                        </p>
                                                    </Label>
                                                </div>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {/* Parent-Child Configuration */}
                                    {data.order_type === 'bom' && (
                                        <div>
                                            <h3 className="font-medium mb-4">Parent-Child Auto-Complete</h3>
                                            <StateButton
                                                icon={CheckCircle2}
                                                title="Auto-complete parent order"
                                                description={
                                                    data.auto_complete_on_children
                                                        ? "The parent order will automatically transition to completed status when all child orders are finished"
                                                        : "The parent order will NOT automatically transition to completed status when all child orders are finished"
                                                }
                                                selected={data.auto_complete_on_children}
                                                onClick={() => setData('auto_complete_on_children', !data.auto_complete_on_children)}
                                            />
                                        </div>
                                    )}

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