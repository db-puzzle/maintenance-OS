import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    FileText,
    Info,
    Settings,
    Check,
    ChevronLeft,
    ChevronRight,
    Search,
    Layers,
    Factory
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createFormAdapter } from '@/utils/form-adapters';
import { TextInput } from '@/components/TextInput';
import InputError from '@/components/input-error';
import StateButton from '@/components/StateButton';
import { Item, ManufacturingOrder, ManufacturingRoute, ItemCategory, WorkCell } from '@/types/production';
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
import { toast } from 'sonner';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items?: Item[];
    orders?: ManufacturingOrder[];
    routeTemplates?: ManufacturingRoute[];
    itemCategories?: ItemCategory[];
    _workCells?: WorkCell[];
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

export default function CreateManufacturingRouteDialog({
    open,
    onOpenChange,
    items: _items = [],
    orders = [],
    routeTemplates = [],
    itemCategories = [],
    _workCells = []
}: Props) {
    const [currentStep, setCurrentStep] = useState(1);
    const [routeType, setRouteType] = useState<'production' | 'template'>('production');
    const [orderSearchQuery, setOrderSearchQuery] = useState('');
    const [templateSearchQuery, setTemplateSearchQuery] = useState('');
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersPerPage, setOrdersPerPage] = useState(5);
    const [templatesPage, setTemplatesPage] = useState(1);
    const [templatesPerPage, setTemplatesPerPage] = useState(10);
    const [categoriesPage, setCategoriesPage] = useState(1);
    const [categoriesPerPage, setCategoriesPerPage] = useState(5);
    const [categorySearchQuery, setCategorySearchQuery] = useState('');

    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm<{
        name: string;
        description: string;
        is_active: boolean;
        is_template: boolean;
        manufacturing_order_id: string;
        item_id: string;
        template_source_id: string;
        item_category_id: string;
    }>({
        // Common fields
        name: '',
        description: '',
        is_active: true,
        is_template: false,

        // Production route fields
        manufacturing_order_id: '',
        item_id: '',
        template_source_id: '',

        // Template fields
        item_category_id: '',
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    // Update is_template when route type changes
    useEffect(() => {
        setData('is_template', routeType === 'template');
    }, [routeType, setData]);

    // Auto-generate name when reaching the final step
    useEffect(() => {
        const isLastStep = (routeType === 'production' && currentStep === 3) ||
            (routeType === 'template' && currentStep === 2);

        if (isLastStep) {
            if (routeType === 'production' && data.manufacturing_order_id) {
                const order = orders.find(o => o.id === parseInt(data.manufacturing_order_id));
                if (order && order.item) {
                    setData('name', `Roteiro ${order.order_number} - ${order.item.name}`);
                }
            } else if (routeType === 'template' && data.item_category_id) {
                const category = itemCategories.find(c => c.id === parseInt(data.item_category_id));
                if (category) {
                    setData('name', `Template ${category.name}`);
                }
            } else if (routeType === 'template' && !data.item_category_id) {
                // For templates without category
                setData('name', 'Template Geral');
            }
        }
    }, [currentStep, routeType, data.manufacturing_order_id, data.item_category_id, orders, itemCategories, setData]);

    const steps = useMemo(() => {
        if (routeType === 'production') {
            return [
                { number: 1, title: 'Tipo e Ordem', icon: <Layers className="h-4 w-4" /> },
                { number: 2, title: 'Template', icon: <FileText className="h-4 w-4" /> },
                { number: 3, title: 'Detalhes', icon: <Settings className="h-4 w-4" /> },
            ];
        } else {
            return [
                { number: 1, title: 'Tipo e Categoria', icon: <Layers className="h-4 w-4" /> },
                { number: 2, title: 'Detalhes', icon: <Settings className="h-4 w-4" /> },
            ];
        }
    }, [routeType]);

    const selectedOrder = useMemo(() => {
        if (data.manufacturing_order_id) {
            return orders.find(o => o.id === parseInt(data.manufacturing_order_id));
        }
        return null;
    }, [data.manufacturing_order_id, orders]);

    const selectedItem = useMemo(() => {
        // Get item from selected order
        if (selectedOrder?.item) {
            return selectedOrder.item;
        }
        return null;
    }, [selectedOrder]);



    // Filter orders based on search query
    const filteredOrders = useMemo(() => {
        const availableOrders = orders.filter(order =>
            (order.status === 'draft' || order.status === 'planned') && !order.manufacturing_route
        );

        if (!orderSearchQuery.trim()) return availableOrders;

        const query = orderSearchQuery.toLowerCase();
        return availableOrders.filter(order =>
            order.order_number.toLowerCase().includes(query) ||
            order.item?.name?.toLowerCase().includes(query) ||
            order.item?.item_number?.toLowerCase().includes(query)
        );
    }, [orders, orderSearchQuery]);

    // Filter route templates based on selected item category
    const filteredRouteTemplates = useMemo(() => {
        let templates = routeTemplates.filter(r => r.is_template === true);

        // If an item is selected, filter by its category
        if (selectedItem?.category) {
            templates = templates.filter(t =>
                (!t.item_category_id || t.item_category_id === selectedItem.category?.id)
            );
        }

        if (!templateSearchQuery.trim()) return templates;

        const query = templateSearchQuery.toLowerCase();
        return templates.filter(template =>
            template.name.toLowerCase().includes(query) ||
            template.description?.toLowerCase().includes(query)
        );
    }, [routeTemplates, selectedItem, templateSearchQuery]);

    // Paginated data

    const paginatedOrders = useMemo(() => {
        const start = (ordersPage - 1) * ordersPerPage;
        const end = start + ordersPerPage;
        return filteredOrders.slice(start, end);
    }, [filteredOrders, ordersPage, ordersPerPage]);

    const ordersPagination = useMemo(() => ({
        current_page: ordersPage,
        last_page: Math.ceil(filteredOrders.length / ordersPerPage),
        per_page: ordersPerPage,
        total: filteredOrders.length,
        from: filteredOrders.length > 0 ? (ordersPage - 1) * ordersPerPage + 1 : null,
        to: filteredOrders.length > 0 ? Math.min(ordersPage * ordersPerPage, filteredOrders.length) : null,
    }), [filteredOrders, ordersPage, ordersPerPage]);

    const paginatedTemplates = useMemo(() => {
        const start = (templatesPage - 1) * templatesPerPage;
        const end = start + templatesPerPage;
        return filteredRouteTemplates.slice(start, end);
    }, [filteredRouteTemplates, templatesPage, templatesPerPage]);

    const templatesPagination = useMemo(() => ({
        current_page: templatesPage,
        last_page: Math.ceil(filteredRouteTemplates.length / templatesPerPage),
        per_page: templatesPerPage,
        total: filteredRouteTemplates.length,
        from: filteredRouteTemplates.length > 0 ? (templatesPage - 1) * templatesPerPage + 1 : null,
        to: filteredRouteTemplates.length > 0 ? Math.min(templatesPage * templatesPerPage, filteredRouteTemplates.length) : null,
    }), [filteredRouteTemplates, templatesPage, templatesPerPage]);

    // Filter categories based on search query
    const filteredCategories = useMemo(() => {
        if (!categorySearchQuery.trim()) return itemCategories;

        const query = categorySearchQuery.toLowerCase();
        return itemCategories.filter(category =>
            category.name.toLowerCase().includes(query) ||
            category.description?.toLowerCase().includes(query)
        );
    }, [itemCategories, categorySearchQuery]);

    // Paginated categories
    const paginatedCategories = useMemo(() => {
        const start = (categoriesPage - 1) * categoriesPerPage;
        const end = start + categoriesPerPage;
        return filteredCategories.slice(start, end);
    }, [filteredCategories, categoriesPage, categoriesPerPage]);

    const categoriesPagination = useMemo(() => ({
        current_page: categoriesPage,
        last_page: Math.ceil(filteredCategories.length / categoriesPerPage),
        per_page: categoriesPerPage,
        total: filteredCategories.length,
        from: filteredCategories.length > 0 ? (categoriesPage - 1) * categoriesPerPage + 1 : null,
        to: filteredCategories.length > 0 ? Math.min(categoriesPage * categoriesPerPage, filteredCategories.length) : null,
    }), [filteredCategories, categoriesPage, categoriesPerPage]);

    // Track selected rows
    const [selectedOrderId, setSelectedOrderId] = useState<Set<string | number>>(
        data.manufacturing_order_id ? new Set([parseInt(data.manufacturing_order_id)]) : new Set()
    );
    const [selectedTemplateId, setSelectedTemplateId] = useState<Set<string | number>>(
        data.template_source_id ? new Set([parseInt(data.template_source_id)]) : new Set()
    );
    const [selectedCategoryId, setSelectedCategoryId] = useState<Set<string | number>>(
        data.item_category_id ? new Set([parseInt(data.item_category_id)]) : new Set()
    );



    // Define columns for orders table
    const orderColumns: ColumnConfig<ManufacturingOrder>[] = useMemo(() => [
        {
            key: 'selection',
            label: '',
            width: 'w-[40px]',
            render: (_value: unknown, order: ManufacturingOrder) => (
                data.manufacturing_order_id === order.id.toString() ? <Check className="h-4 w-4 text-primary" /> : null
            )
        },
        {
            key: 'order_number',
            label: 'Número da Ordem',
            width: 'w-[150px]',
            render: (value: unknown) => <span className="font-medium">{String(value || '-')}</span>
        },
        {
            key: 'item',
            label: 'Item',
            width: 'w-[300px]',
            render: (_value: unknown, order: ManufacturingOrder) => (
                <div>
                    <div className="font-medium">{order.item?.item_number || '-'}</div>
                    <div className="text-sm text-muted-foreground">{order.item?.name || '-'}</div>
                </div>
            )
        },
        {
            key: 'quantity',
            label: 'Quantidade',
            width: 'w-[100px]',
            render: (value: unknown, order: ManufacturingOrder) => (
                <span>{String(value || 0)} {order.unit_of_measure || 'EA'}</span>
            )
        }
    ], [data.manufacturing_order_id]);

    // Define columns for categories table
    const categoryColumns: ColumnConfig<ItemCategory>[] = useMemo(() => [
        {
            key: 'selection',
            label: '',
            width: 'w-[40px]',
            render: (_value: unknown, category: ItemCategory) => (
                data.item_category_id === category.id.toString() ? <Check className="h-4 w-4 text-primary" /> : null
            )
        },
        {
            key: 'name',
            label: 'Nome da Categoria',
            width: 'w-[200px]',
            render: (value: unknown) => <span className="font-medium">{String(value || '-')}</span>
        },
        {
            key: 'description',
            label: 'Descrição',
            width: 'w-[400px]',
            render: (value: unknown) => (
                <span className="text-sm text-muted-foreground">
                    {value ? String(value) : '-'}
                </span>
            )
        }
    ], [data.item_category_id]);

    // Define columns for templates table
    const templateColumns: ColumnConfig<ManufacturingRoute>[] = useMemo(() => [
        {
            key: 'selection',
            label: '',
            width: 'w-[40px]',
            render: (_value: unknown, template: ManufacturingRoute) => (
                data.template_source_id === template.id.toString() ? <Check className="h-4 w-4 text-primary" /> : null
            )
        },
        {
            key: 'name',
            label: 'Nome do Template',
            width: 'w-[250px]',
            render: (value: unknown) => <span className="font-medium">{String(value || '-')}</span>
        },
        {
            key: 'description',
            label: 'Descrição',
            width: 'w-[300px]',
            render: (value: unknown) => (
                <span className="text-sm text-muted-foreground">
                    {value ? String(value).substring(0, 80) + (String(value).length > 80 ? '...' : '') : '-'}
                </span>
            )
        },
        {
            key: 'steps_count',
            label: 'Etapas',
            width: 'w-[80px]',
            render: (value: unknown) => (
                <Badge variant="secondary">{String(value || 0)} etapas</Badge>
            )
        }
    ], [data.template_source_id]);

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
        // Transform the data before submission
        transform((data) => ({
            ...data,
            item_id: data.item_id ? parseInt(data.item_id) : null,
            manufacturing_order_id: data.manufacturing_order_id ? parseInt(data.manufacturing_order_id) : null,
            template_source_id: data.template_source_id ? parseInt(data.template_source_id) : null,
            item_category_id: data.item_category_id ? parseInt(data.item_category_id) : null,
        }));

        // Submit the form
        post(route('production.routing.store'), {
            onSuccess: (page) => {
                console.log('Form submitted successfully', page);
                // The toast will be shown by the redirect flash message
                // Close the dialog
                handleOpenChange(false);
            },
            onError: (errors) => {
                console.error('Form submission errors:', errors);
                toast.error('Erro ao criar roteiro');
            },
            onFinish: () => {
                console.log('Form submission finished');
            },
            preserveScroll: true,
        });
    };

    const isStepValid = (step: number) => {
        if (routeType === 'production') {
            switch (step) {
                case 1:
                    // Manufacturing order must be selected for production routes
                    return !!data.manufacturing_order_id;
                case 2:
                    return true; // Template selection is optional
                case 3:
                    return !!data.name && data.name.trim().length > 0;
                default:
                    return false;
            }
        } else {
            // Template route
            switch (step) {
                case 1:
                    return true; // Category selection is optional
                case 2:
                    return !!data.name && data.name.trim().length > 0;
                default:
                    return false;
            }
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
            setCurrentStep(1);
            setRouteType('production');
            setOrderSearchQuery('');
            setTemplateSearchQuery('');
            setCategorySearchQuery('');
            setOrdersPage(1);
            setTemplatesPage(1);
            setCategoriesPage(1);
            setSelectedCategoryId(new Set());
        }
        onOpenChange(open);
    };



    const handleOrderSelection = (selectedIds: Set<string | number>) => {
        setSelectedOrderId(selectedIds);
        const selectedId = Array.from(selectedIds)[0];
        if (selectedId) {
            const order = filteredOrders.find(o => o.id === selectedId);
            if (order) {
                setData({
                    ...data,
                    manufacturing_order_id: order.id.toString(),
                    item_id: order.item_id?.toString() || '', // Set item_id from the order
                });
            }
        } else {
            setData({
                ...data,
                manufacturing_order_id: '',
                item_id: '', // Clear item_id when no order is selected
            });
        }
    };

    const handleTemplateSelection = (selectedIds: Set<string | number>) => {
        setSelectedTemplateId(selectedIds);
        const selectedId = Array.from(selectedIds)[0];
        if (selectedId) {
            setData('template_source_id', selectedId.toString());
        } else {
            setData('template_source_id', '');
        }
    };

    const handleCategorySelection = (selectedIds: Set<string | number>) => {
        setSelectedCategoryId(selectedIds);
        const selectedId = Array.from(selectedIds)[0];
        if (selectedId) {
            setData('item_category_id', selectedId.toString());
        } else {
            setData('item_category_id', '');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="!max-w-[60vw] w-[60vw] h-[80vh] flex flex-col p-0">
                <DialogHeader className="mt-4 px-6 py-4 border-b">
                    <DialogTitle>Criar Roteiro de Produção</DialogTitle>
                    <DialogDescription>
                        Crie um novo roteiro de produção ou template de roteiro
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-2 border-b">
                    <StepIndicator steps={steps} currentStep={currentStep} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden px-6">
                    <div className="flex-1 overflow-y-auto py-2">
                        {/* Step 1: Route Type Selection with Order/Category */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-base font-medium mb-4 block">
                                        Selecione o tipo de roteiro
                                    </Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <StateButton
                                            icon={Factory}
                                            title="Roteiro de Produção"
                                            description="Criar um roteiro para uma ordem de produção específica"
                                            selected={routeType === 'production'}
                                            onClick={() => setRouteType('production')}
                                        />
                                        <StateButton
                                            icon={FileText}
                                            title="Template de Roteiro"
                                            description="Criar um template reutilizável para futuras ordens"
                                            selected={routeType === 'template'}
                                            onClick={() => setRouteType('template')}
                                        />
                                    </div>
                                </div>

                                {routeType === 'production' && (
                                    <>
                                        {/* Order Selection */}
                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">
                                                Ordem de Produção
                                            </Label>

                                            {/* Search Box */}
                                            <div className="relative mb-4">
                                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    type="text"
                                                    placeholder="Buscar por número da ordem ou item..."
                                                    value={orderSearchQuery}
                                                    onChange={(e) => {
                                                        setOrderSearchQuery(e.target.value);
                                                        setOrdersPage(1);
                                                    }}
                                                    className="pl-10"
                                                />
                                            </div>

                                            {/* Orders Table */}
                                            <div className="mb-4">
                                                <EntityDataTable
                                                    data={paginatedOrders}
                                                    columns={orderColumns}
                                                    loading={false}
                                                    emptyMessage="Nenhuma ordem de produção em rascunho ou planejada sem roteiro encontrada."
                                                    maxHeight="200px"
                                                    selectable={true}
                                                    selectedRows={selectedOrderId}
                                                    onSelectionChange={handleOrderSelection}
                                                    getRowId={(order) => (order as ManufacturingOrder).id}
                                                    onRowClick={(order) => {
                                                        const orderId = (order as ManufacturingOrder).id;
                                                        const newSelection = new Set(selectedOrderId);
                                                        if (newSelection.has(orderId)) {
                                                            newSelection.delete(orderId);
                                                        } else {
                                                            newSelection.clear();
                                                            newSelection.add(orderId);
                                                        }
                                                        handleOrderSelection(newSelection);
                                                    }}
                                                />
                                            </div>

                                            {/* Pagination */}
                                            {filteredOrders.length > ordersPerPage && (
                                                <EntityPagination
                                                    pagination={ordersPagination}
                                                    onPageChange={setOrdersPage}
                                                    onPerPageChange={(perPage) => {
                                                        setOrdersPerPage(perPage);
                                                        setOrdersPage(1);
                                                    }}
                                                />
                                            )}

                                            {errors.manufacturing_order_id && (
                                                <InputError message={errors.manufacturing_order_id} className="mt-2" />
                                            )}
                                        </div>
                                    </>
                                )}

                                {routeType === 'template' && (
                                    <>
                                        {/* Category Selection */}
                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">
                                                Categoria do Item (opcional)
                                            </Label>

                                            {/* Search Box */}
                                            <div className="relative mb-4">
                                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    type="text"
                                                    placeholder="Buscar por nome ou descrição..."
                                                    value={categorySearchQuery}
                                                    onChange={(e) => {
                                                        setCategorySearchQuery(e.target.value);
                                                        setCategoriesPage(1);
                                                    }}
                                                    className="pl-10"
                                                />
                                            </div>

                                            {/* Categories Table */}
                                            <div className="mb-4">
                                                <EntityDataTable
                                                    data={paginatedCategories}
                                                    columns={categoryColumns}
                                                    loading={false}
                                                    emptyMessage="Nenhuma categoria encontrada."
                                                    maxHeight="200px"
                                                    selectable={true}
                                                    selectedRows={selectedCategoryId}
                                                    onSelectionChange={handleCategorySelection}
                                                    getRowId={(category) => (category as ItemCategory).id}
                                                    onRowClick={(category) => {
                                                        const categoryId = (category as ItemCategory).id;
                                                        const newSelection = new Set(selectedCategoryId);
                                                        if (newSelection.has(categoryId)) {
                                                            newSelection.delete(categoryId);
                                                        } else {
                                                            newSelection.clear();
                                                            newSelection.add(categoryId);
                                                        }
                                                        handleCategorySelection(newSelection);
                                                    }}
                                                />
                                            </div>

                                            {/* Pagination */}
                                            {filteredCategories.length > categoriesPerPage && (
                                                <EntityPagination
                                                    pagination={categoriesPagination}
                                                    onPageChange={setCategoriesPage}
                                                    onPerPageChange={(perPage) => {
                                                        setCategoriesPerPage(perPage);
                                                        setCategoriesPage(1);
                                                    }}
                                                />
                                            )}

                                            {data.item_category_id && (
                                                <Alert>
                                                    <Info className="h-4 w-4" />
                                                    <AlertDescription>
                                                        Este template só poderá ser usado para criar roteiros de itens da categoria selecionada.
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {errors.item_category_id && (
                                                <InputError message={errors.item_category_id} className="mt-2" />
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}



                        {/* Step 2 for Production Route: Template Selection */}
                        {currentStep === 2 && routeType === 'production' && (
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-base font-medium mb-2 block">
                                        Usar Template de Roteiro (opcional)
                                    </Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Você pode iniciar com um template existente e depois personalizar as etapas.
                                    </p>
                                </div>

                                {/* Search Box */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar templates..."
                                        value={templateSearchQuery}
                                        onChange={(e) => {
                                            setTemplateSearchQuery(e.target.value);
                                            setTemplatesPage(1);
                                        }}
                                        className="pl-10"
                                    />
                                </div>

                                {filteredRouteTemplates.length > 0 ? (
                                    <>
                                        {/* Templates Table */}
                                        <div className="mb-4">
                                            <EntityDataTable
                                                data={paginatedTemplates}
                                                columns={templateColumns}
                                                loading={false}
                                                emptyMessage="Nenhum template encontrado."
                                                maxHeight="300px"
                                                selectable={true}
                                                selectedRows={selectedTemplateId}
                                                onSelectionChange={handleTemplateSelection}
                                                getRowId={(template) => (template as ManufacturingRoute).id}
                                                onRowClick={(template) => {
                                                    const templateId = (template as ManufacturingRoute).id;
                                                    const newSelection = new Set(selectedTemplateId);
                                                    if (newSelection.has(templateId)) {
                                                        newSelection.delete(templateId);
                                                    } else {
                                                        newSelection.clear();
                                                        newSelection.add(templateId);
                                                    }
                                                    handleTemplateSelection(newSelection);
                                                }}
                                            />
                                        </div>

                                        {/* Pagination */}
                                        {filteredRouteTemplates.length > templatesPerPage && (
                                            <EntityPagination
                                                pagination={templatesPagination}
                                                onPageChange={setTemplatesPage}
                                                onPerPageChange={(perPage) => {
                                                    setTemplatesPerPage(perPage);
                                                    setTemplatesPage(1);
                                                }}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            Nenhum template de roteiro disponível{selectedItem?.category ? ` para a categoria ${selectedItem.category.name}` : ''}.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Se você não selecionar um template, o roteiro será criado vazio e você poderá adicionar etapas manualmente.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {/* Last Step: Route Details */}
                        {((currentStep === 3 && routeType === 'production') || (currentStep === 2 && routeType === 'template')) && (
                            <ScrollArea className="h-full">
                                <div className="space-y-6 pr-4">
                                    {/* Nome do Roteiro */}
                                    <TextInput
                                        form={formAdapter}
                                        name="name"
                                        label="Nome do Roteiro"
                                        placeholder={routeType === 'template' ? "Ex: Template de Montagem Padrão" : "Ex: Roteiro de Montagem Principal"}
                                        required
                                    />

                                    {/* Descrição */}
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Descrição</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Descreva o processo de produção..."
                                            rows={4}
                                        />
                                        {errors.description && (
                                            <p className="text-sm text-red-600">{errors.description}</p>
                                        )}
                                    </div>

                                    {/* Status Ativo */}
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => {
                                                if (typeof checked === 'boolean') {
                                                    setData('is_active', checked);
                                                }
                                            }}
                                        />
                                        <Label htmlFor="is_active">
                                            {routeType === 'template' ? 'Template Ativo' : 'Roteiro Ativo'}
                                        </Label>
                                    </div>

                                    {/* Summary */}
                                    <div className="rounded-lg border p-4 space-y-2">
                                        <h4 className="font-medium text-sm">Resumo do Roteiro</h4>

                                        {routeType === 'production' && (
                                            <>
                                                {selectedOrder && (
                                                    <>
                                                        <div className="text-sm">
                                                            <span className="text-muted-foreground">Ordem:</span>{' '}
                                                            <span className="font-medium">{selectedOrder.order_number}</span>
                                                        </div>
                                                        {selectedOrder.item && (
                                                            <div className="text-sm">
                                                                <span className="text-muted-foreground">Item:</span>{' '}
                                                                <span className="font-medium">{selectedOrder.item.item_number} - {selectedOrder.item.name}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {data.template_source_id && (
                                                    <div className="text-sm">
                                                        <span className="text-muted-foreground">Template:</span>{' '}
                                                        <span className="font-medium">
                                                            {filteredRouteTemplates.find(t => t.id === parseInt(data.template_source_id))?.name || '-'}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {routeType === 'template' && (
                                            <>
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">Tipo:</span>{' '}
                                                    <span className="font-medium">Template</span>
                                                </div>
                                                {data.item_category_id && (() => {
                                                    const category = itemCategories.find(c => c.id === parseInt(data.item_category_id));
                                                    return (
                                                        <div className="space-y-1">
                                                            <div className="text-sm">
                                                                <span className="text-muted-foreground">Categoria:</span>{' '}
                                                                <span className="font-medium">{category?.name || '-'}</span>
                                                            </div>
                                                            {category?.description && (

                                                                <div className="text-sm">
                                                                    <span className="text-muted-foreground">Descrição:</span>{' '}
                                                                    <span className="font-medium">{category?.description || '-'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        )}
                                    </div>
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
                            Anterior
                        </Button>

                        {currentStep < steps.length ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={!isStepValid(currentStep)}
                            >
                                Próximo
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={processing || !isStepValid(currentStep)}
                            >
                                {processing ? 'Criando...' : 'Criar Roteiro'}
                            </Button>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
