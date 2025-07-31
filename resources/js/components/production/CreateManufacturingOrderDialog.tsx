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
    GitBranch,
    Layers,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import ItemSelect from '@/components/ItemSelect';
import InputError from '@/components/input-error';
import StateButton from '@/components/StateButton';
import { Item, BillOfMaterial, RouteTemplate, ManufacturingOrder } from '@/types/production';
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

interface FormData {
    // Order type
    order_type: 'item' | 'bom';

    // Item/BOM selection
    item_id: number | null;
    bill_of_material_id: number | null;

    // Order details
    quantity: number;
    unit_of_measure: string;
    priority: number;
    requested_date: string;

    // Source
    source_type: string;
    source_reference: string;

    // Parent-child options
    auto_complete_on_children: boolean;

    // Route configuration
    route_creation_mode: 'manual' | 'template' | 'auto';
    route_template_id: number | null;
}

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
        <div className="flex items-center justify-between px-2">
            {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                    <div className="flex flex-col items-center">
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm",
                                currentStep >= step.number
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {currentStep > step.number ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                step.icon
                            )}
                        </div>
                        <span className={cn(
                            "text-xs mt-1",
                            currentStep >= step.number
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                        )}>
                            {step.title}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={cn(
                            "flex-1 h-0.5 mx-2 mt-4",
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

    const { data, setData, post, processing, errors, reset } = useForm<FormData>({
        order_type: selectedBomId ? 'bom' : 'item',
        item_id: null,
        bill_of_material_id: selectedBomId || null,
        quantity: 1,
        unit_of_measure: 'EA',
        priority: 50,
        requested_date: '',
        source_type: 'manual',
        source_reference: '',
        auto_complete_on_children: true,
        route_creation_mode: 'manual',
        route_template_id: null,
    });

    const steps = [
        { number: 1, title: 'Type', icon: <Factory className="h-4 w-4" /> },
        { number: 2, title: 'Item', icon: <Package className="h-4 w-4" /> },
        { number: 3, title: 'Details', icon: <Calendar className="h-4 w-4" /> },
        { number: 4, title: 'Config', icon: <Settings className="h-4 w-4" /> },
    ];

    const selectedItem = useMemo(() => {
        if (data.order_type === 'item' && data.item_id) {
            return items.find(i => i.id === data.item_id);
        }
        return null;
    }, [data.item_id, data.order_type, items]);

    const selectedBOM = useMemo(() => {
        if (data.order_type === 'bom' && data.bill_of_material_id) {
            return billsOfMaterial.find(b => b.id === data.bill_of_material_id);
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
            !t.item_category || t.item_category === selectedItem.category
        );
    }, [selectedItem, routeTemplates]);

    const handleNext = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = () => {
        post(route('production.orders.store'), {
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
                return true; // Order type is always valid
            case 2:
                if (data.order_type === 'item') {
                    return !!data.item_id;
                } else {
                    return !!data.bill_of_material_id;
                }
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
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl h-150 flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Create Manufacturing Order</DialogTitle>
                    <DialogDescription>
                        Create a new manufacturing order for production
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 border-b">
                    <StepIndicator steps={steps} currentStep={currentStep} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 px-6">
                        <div className="py-2">
                            {/* Step 1: Order Type Selection */}
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <Label className="text-base font-medium mb-4 block">
                                            Select Order Type
                                        </Label>
                                        <RadioGroup
                                            value={data.order_type}
                                            onValueChange={(value: 'item' | 'bom') => {
                                                setData({
                                                    ...data,
                                                    order_type: value,
                                                    item_id: null,
                                                    bill_of_material_id: null,
                                                });
                                            }}
                                            className="space-y-4"
                                        >
                                            <div className="flex items-start space-x-3">
                                                <RadioGroupItem value="item" id="item" className="mt-1" />
                                                <div>
                                                    <Label htmlFor="item" className="font-normal cursor-pointer">
                                                        <div className="font-medium">Single Item Order</div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Create an order for a single manufactured item
                                                        </p>
                                                    </Label>
                                                </div>
                                            </div>
                                            <div className="flex items-start space-x-3">
                                                <RadioGroupItem value="bom" id="bom" className="mt-1" />
                                                <div>
                                                    <Label htmlFor="bom" className="font-normal cursor-pointer">
                                                        <div className="font-medium">BOM-Based Order</div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Create orders for all items in a Bill of Materials
                                                        </p>
                                                    </Label>
                                                </div>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Item/BOM Selection */}
                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    {data.order_type === 'item' ? (
                                        <div>
                                            <ItemSelect
                                                label="Select Item"
                                                items={items.filter(i => i.can_be_manufactured)}
                                                value={data.item_id}
                                                onValueChange={(value) => {
                                                    const item = items.find(i => i.id === value);
                                                    setData({
                                                        ...data,
                                                        item_id: value,
                                                        unit_of_measure: item?.unit_of_measure || 'EA',
                                                    });
                                                }}
                                                placeholder="Select an item to manufacture..."
                                                searchPlaceholder="Search items..."
                                                displayValue={(item) => `${item.item_number} - ${item.name}`}
                                                error={errors.item_id}
                                                required
                                            />

                                            {selectedItem && (
                                                <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                                                    <p className="text-sm font-medium">{selectedItem.name}</p>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {selectedItem.description}
                                                    </p>
                                                    <div className="flex gap-4 mt-2">
                                                        <Badge variant="outline">{selectedItem.category}</Badge>
                                                        <span className="text-sm text-muted-foreground">
                                                            Lead time: {selectedItem.manufacturing_lead_time_days} days
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <ItemSelect
                                                label="Select Bill of Materials"
                                                items={billsOfMaterial}
                                                value={data.bill_of_material_id}
                                                onValueChange={(value) => setData('bill_of_material_id', value)}
                                                placeholder="Select a BOM..."
                                                searchPlaceholder="Search BOMs..."
                                                displayValue={(bom) => `${bom.bom_number} - ${bom.name}`}
                                                error={errors.bill_of_material_id}
                                                required
                                            />

                                            {selectedBOM && (
                                                <div className="mt-4 space-y-4">
                                                    <div className="p-4 bg-muted/20 rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">
                                                                {selectedBOM.name}
                                                            </span>
                                                            <Badge variant="secondary" className="text-xs">
                                                                Version {selectedBOM.current_version?.version_number || 1}
                                                            </Badge>
                                                        </div>
                                                        {selectedBOM.description && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {selectedBOM.description}
                                                            </p>
                                                        )}
                                                        <div className="flex gap-4 mt-2">
                                                            <Badge variant="outline">
                                                                {selectedBOM.item_masters_count} items
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <Alert>
                                                        <Info className="h-4 w-4" />
                                                        <AlertDescription>
                                                            This will create {bomItems.length} child orders
                                                            for the items in this BOM
                                                        </AlertDescription>
                                                    </Alert>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Order Details */}
                            {currentStep === 3 && (
                                <div className="space-y-6">
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
                                            displayValue={(item) => item.name}
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

                                    {/* Child Orders Preview for BOM */}
                                    {data.order_type === 'bom' && bomItems.length > 0 && (
                                        <div className="space-y-4">
                                            <Separator />
                                            <div>
                                                <h3 className="font-medium mb-3">Child Orders Preview</h3>
                                                <div className="border rounded-lg overflow-hidden">
                                                    <div className="max-h-48 overflow-auto">
                                                        <table className="w-full">
                                                            <thead className="bg-muted/50 sticky top-0">
                                                                <tr className="text-sm">
                                                                    <th className="text-left p-3">Item</th>
                                                                    <th className="text-right p-3">Quantity</th>
                                                                    <th className="text-left p-3">UOM</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {bomItems.map((bomItem: any, index: number) => (
                                                                    <tr key={index} className="text-sm">
                                                                        <td className="p-3">
                                                                            <div>
                                                                                <p className="font-medium">
                                                                                    {bomItem.item?.item_number}
                                                                                </p>
                                                                                <p className="text-muted-foreground">
                                                                                    {bomItem.item?.name}
                                                                                </p>
                                                                            </div>
                                                                        </td>
                                                                        <td className="text-right p-3">
                                                                            {(bomItem.quantity * data.quantity).toFixed(2)}
                                                                        </td>
                                                                        <td className="p-3">
                                                                            {bomItem.unit_of_measure}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 4: Configuration */}
                            {currentStep === 4 && (
                                <div className="space-y-6">

                                    {/* Route Configuration */}
                                    <div>
                                        <h3 className="font-medium mb-4">Manufacturing Route</h3>
                                        <RadioGroup
                                            value={data.route_creation_mode}
                                            onValueChange={(value: 'manual' | 'template' | 'auto') =>
                                                setData('route_creation_mode', value)
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
                                                                displayValue={(template) => template.name}
                                                            />

                                                            {data.route_template_id && (
                                                                <div className="mt-3 p-3 bg-muted/20 rounded-lg">
                                                                    <p className="text-sm">
                                                                        {filteredRouteTemplates.find(
                                                                            t => t.id === data.route_template_id
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
                            )}
                        </div>
                    </ScrollArea>

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