import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { TextInput } from '@/components/TextInput';
import { ItemSelect } from '@/components/ItemSelect';
import { createFormAdapter } from '@/utils/form-adapters';
import { OrderCreationWizard } from '@/components/production/templates/OrderCreationWizard';
import { Item, BillOfMaterial, ManufacturingRoute, ItemCategory } from '@/types/production';
import { ArrowLeft, FileText, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    item?: Item;
    templates: ManufacturingRoute[];
    recommendedTemplate?: ManufacturingRoute;
    allTemplates: ManufacturingRoute[];
    hasMultipleTemplates: boolean;
    sourceTypes: Record<string, string>;
    items: Item[];
    billsOfMaterial: BillOfMaterial[];
    categories: ItemCategory[];
    selectedBomId?: number;
}

export default function CreateManufacturingOrder({
    item,
    templates,
    recommendedTemplate,
    allTemplates,
    sourceTypes,
    items,
    billsOfMaterial,
    selectedBomId
}: Props) {
    const [orderType, setOrderType] = useState<'item' | 'bom'>(selectedBomId ? 'bom' : 'item');
    const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
    const [routeCreationMode, setRouteCreationMode] = useState<'auto' | 'manual' | 'empty'>('auto');

    const form = useForm({
        order_type: orderType,
        item_id: item?.id || null,
        bill_of_material_id: selectedBomId || null,
        quantity: 1,
        unit_of_measure: 'EA',
        priority: 50,
        requested_date: '',
        source_type: 'manual',
        source_reference: '',
        template_source_id: null as number | null,
        auto_select_template: false,
        create_empty_route: false,
        auto_complete_on_children: true,
        route_creation_mode: routeCreationMode
    });

    const formAdapter = createFormAdapter(form);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Update form data with current selections
        form.data.order_type = orderType;
        form.data.route_creation_mode = routeCreationMode;
        form.data.template_source_id = selectedTemplate;
        form.data.auto_select_template = routeCreationMode === 'auto' && templates.length === 1;
        form.data.create_empty_route = routeCreationMode === 'empty';

        form.post(route('production.orders.store'), {
            preserveScroll: true,
            onError: () => {
                toast.error('Failed to create manufacturing order');
            }
        });
    };

    const selectedItem = form.data.item_id ? items.find(i => i.id === form.data.item_id) : undefined;
    const selectedBom = form.data.bill_of_material_id ? billsOfMaterial.find(b => b.id === form.data.bill_of_material_id) : undefined;

    return (
        <AppLayout>
            <Head title="Create Manufacturing Order" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={route('production.orders.index')}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-semibold">Create Manufacturing Order</h1>
                            <p className="text-muted-foreground">
                                Create a new production order with automatic route setup
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Order Type Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Type</CardTitle>
                            <CardDescription>
                                Choose whether to create an order for a single item or from a bill of materials
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup
                                value={orderType}
                                onValueChange={(value: 'item' | 'bom') => {
                                    setOrderType(value);
                                    form.setData('order_type', value);
                                }}
                            >
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="item" id="type-item" />
                                    <Label htmlFor="type-item" className="flex items-center gap-2 cursor-pointer">
                                        <Package className="h-4 w-4" />
                                        Single Item
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="bom" id="type-bom" />
                                    <Label htmlFor="type-bom" className="flex items-center gap-2 cursor-pointer">
                                        <FileText className="h-4 w-4" />
                                        Bill of Materials (BOM)
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    {/* Item/BOM Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {orderType === 'item' ? 'Select Item' : 'Select Bill of Materials'}
                            </CardTitle>
                            <CardDescription>
                                {orderType === 'item'
                                    ? 'Choose the item to manufacture'
                                    : 'Choose the BOM that defines the assembly structure'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {orderType === 'item' ? (
                                <ItemSelect
                                    value={form.data.item_id}
                                    onValueChange={(value) => form.setData('item_id', value)}
                                    items={items}
                                    placeholder="Select an item to manufacture"
                                    required
                                />
                            ) : (
                                <ItemSelect
                                    value={form.data.bill_of_material_id}
                                    onValueChange={(value) => form.setData('bill_of_material_id', value)}
                                    type="bom"
                                    placeholder="Select a bill of materials"
                                    required
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Order Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Details</CardTitle>
                            <CardDescription>
                                Specify quantity, priority, and other order parameters
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Quantity</Label>
                                    <TextInput
                                        id="quantity"
                                        form={formAdapter}
                                        name="quantity"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                                    <TextInput
                                        id="unit_of_measure"
                                        form={formAdapter}
                                        name="unit_of_measure"
                                        placeholder="EA"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority (0-100)</Label>
                                    <TextInput
                                        id="priority"
                                        form={formAdapter}
                                        name="priority"
                                        type="number"
                                        min="0"
                                        max="100"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="requested_date">Requested Date</Label>
                                    <TextInput
                                        id="requested_date"
                                        form={formAdapter}
                                        name="requested_date"
                                        type="date"
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label htmlFor="source_type">Source Type</Label>
                                <select
                                    id="source_type"
                                    value={form.data.source_type}
                                    onChange={(e) => form.setData('source_type', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                                >
                                    {Object.entries(sourceTypes).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {form.data.source_type !== 'manual' && (
                                <div className="space-y-2">
                                    <Label htmlFor="source_reference">Source Reference</Label>
                                    <TextInput
                                        id="source_reference"
                                        form={formAdapter}
                                        name="source_reference"
                                        placeholder="Reference number"
                                        required
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Route Setup */}
                    {(selectedItem || selectedBom) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Manufacturing Route</CardTitle>
                                <CardDescription>
                                    Configure how this order will be manufactured
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <OrderCreationWizard
                                    item={selectedItem || selectedBom?.output_item}
                                    templates={templates}
                                    recommendedTemplate={recommendedTemplate}
                                    allTemplates={allTemplates}
                                    selectedTemplate={selectedTemplate}
                                    onTemplateSelect={setSelectedTemplate}
                                    routeCreationMode={routeCreationMode}
                                    onModeChange={setRouteCreationMode}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-4">
                        <Link href={route('production.orders.index')}>
                            <Button variant="outline" type="button">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Creating...' : 'Create Order'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
