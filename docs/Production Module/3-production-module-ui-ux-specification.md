# Production Module - UI/UX Design Specification

## 1. Overview

This document defines the user interface and user experience design for the Production Module, ensuring consistency with existing system standards while providing intuitive workflows for manufacturing operations.

### 1.1 Design Principles
- **Consistency**: Leverage existing layouts and components from the maintenance system
- **Efficiency**: Minimize clicks and optimize workflows for shop floor usage
- **Clarity**: Clear visual hierarchy and intuitive navigation
- **Responsiveness**: Mobile-first design for QR scanning and shop floor operations
- **Performance**: Fast load times and smooth interactions

### 1.2 Technology Stack
- **Frontend Framework**: React with Inertia.js
- **UI Components**: Shadcn/ui
- **Icons**: Lucide React
- **Styling**: Tailwind CSS
- **Shared Components**: EntityDataTable, EntityActionDropdown, EntityPagination, EntityDeleteDialog, TextInput, ItemSelect

## 2. Navigation Structure

### 2.1 Main Navigation
The Production Module will be integrated into the existing sidebar navigation with the following structure:

```
Production
├── Items
├── BOMs
├── Manufacturing Orders
├── Routes & Steps
├── Planning
├── Tracking
└── Shipments
```

### 2.2 Breadcrumb Navigation
Standard breadcrumb pattern following existing system:
- Home > Production > [Section] > [Subsection]
- Example: Home > Production > BOMs > BOM-2024-001 > Hierarchy

## 3. Module Sections

### 3.1 Item Management

#### 3.1.1 Item List Page
**Route**: `/production/items`
**Layout**: `ListLayout`

```tsx
// Page Structure
<AppLayout breadcrumbs={breadcrumbs}>
    <ListLayout
        title="Itens"
        description="Gerencie o catálogo de itens de manufatura, compra e venda"
        searchPlaceholder="Buscar por número ou nome do item..."
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        createRoute="/production/items/create"
        createButtonText="Novo Item"
    >
        <EntityDataTable
            data={items}
            columns={itemColumns}
            loading={loading}
            onRowClick={(item) => router.visit(`/production/items/${item.id}`)}
            actions={(item) => (
                <EntityActionDropdown
                    onEdit={() => router.visit(`/production/items/${item.id}/edit`)}
                    onDelete={() => handleDelete(item)}
                    additionalActions={[
                        {
                            label: 'Gerenciar BOM',
                            icon: <Package className="h-4 w-4" />,
                            onClick: () => router.visit(`/production/items/${item.id}/bom`),
                            disabled: !item.can_be_manufactured
                        },
                        {
                            label: 'Histórico de BOM',
                            icon: <History className="h-4 w-4" />,
                            onClick: () => router.visit(`/production/items/${item.id}/bom-history`),
                            disabled: !item.can_be_manufactured
                        },
                        {
                            label: 'Onde é Usado',
                            icon: <GitBranch className="h-4 w-4" />,
                            onClick: () => router.visit(`/production/items/${item.id}/where-used`)
                        }
                    ]}
                />
            )}
        />
        <EntityPagination
            pagination={pagination}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
        />
    </ListLayout>
</AppLayout>
```

**Column Configuration**:
```tsx
const itemColumns: ColumnConfig[] = [
    {
        key: 'item_number',
        label: 'Número',
        sortable: true,
        width: 'w-[150px]',
        render: (value, item) => (
            <div className="flex items-center gap-2">
                <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                    {value}
                </Badge>
            </div>
        )
    },
    {
        key: 'name',
        label: 'Nome',
        sortable: true,
        render: (value, item) => (
            <div>
                <div className="font-medium">{value}</div>
                <div className="text-sm text-muted-foreground">{item.category}</div>
            </div>
        )
    },
    {
        key: 'item_type',
        label: 'Tipo',
        sortable: true,
        width: 'w-[120px]',
        render: (value) => (
            <Badge variant="outline">
                {itemTypeLabels[value]}
            </Badge>
        )
    },
    {
        key: 'capabilities',
        label: 'Capacidades',
        width: 'w-[180px]',
        render: (value, item) => (
            <div className="flex gap-1">
                {item.can_be_sold && (
                    <Badge variant="secondary" className="text-xs">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Vendável
                    </Badge>
                )}
                {item.can_be_manufactured && (
                    <Badge variant="secondary" className="text-xs">
                        <Factory className="h-3 w-3 mr-1" />
                        Manufaturável
                    </Badge>
                )}
                {item.can_be_purchased && (
                    <Badge variant="secondary" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        Comprável
                    </Badge>
                )}
            </div>
        )
    },
    {
        key: 'current_bom',
        label: 'BOM Atual',
        width: 'w-[150px]',
        render: (value, item) => (
            item.current_bom && item.can_be_manufactured ? (
                <Link 
                    href={`/production/bom/${item.current_bom_id}`}
                    className="text-primary hover:underline"
                >
                    {item.current_bom.bom_number}
                </Link>
            ) : (
                <span className="text-muted-foreground">—</span>
            )
        )
    },
    {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: 'w-[120px]',
        headerAlign: 'center',
        render: (value) => (
            <div className="text-center">
                <StatusBadge status={value} />
            </div>
        )
    }
];
```

#### 3.1.2 Item Details Page
**Route**: `/production/items/{id}`
**Layout**: `ShowLayout`

```tsx
// Tab Structure
const tabs = [
    {
        id: 'overview',
        label: 'Visão Geral',
        content: <ItemOverviewTab item={item} />
    },
    {
        id: 'bom',
        label: 'BOM',
        content: <ItemBomTab item={item} />,
        visible: item.can_be_manufactured
    },
    {
        id: 'where-used',
        label: 'Onde é Usado',
        content: <ItemWhereUsedTab item={item} />
    },
    {
        id: 'history',
        label: 'Histórico',
        content: <ItemHistoryTab item={item} />
    },
    {
        id: 'analytics',
        label: 'Análises',
        content: <ItemAnalyticsTab item={item} />
    }
];

// Overview Tab Component
function ItemOverviewTab({ item }) {
    return (
        <div className="space-y-6 py-6">
            {/* Item Information Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Informações do Item</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <DetailItem label="Número" value={item.item_number} />
                            <DetailItem label="Nome" value={item.name} />
                            <DetailItem label="Categoria" value={item.category} />
                            <DetailItem label="Tipo" value={
                                <Badge variant="outline">
                                    {itemTypeLabels[item.item_type]}
                                </Badge>
                            } />
                        </div>
                        <div className="space-y-4">
                            <DetailItem label="Status" value={
                                <StatusBadge status={item.status} />
                            } />
                            <DetailItem label="Unidade de Medida" value={item.unit_of_measure} />
                            <DetailItem label="Lead Time" value={`${item.lead_time_days} dias`} />
                            <DetailItem label="Custo" value={formatCurrency(item.cost)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Capabilities Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Capacidades</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        {item.can_be_sold && (
                            <div className="flex items-center gap-2 p-3 border rounded-lg">
                                <ShoppingCart className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="font-medium">Vendável</p>
                                    <p className="text-sm text-muted-foreground">
                                        Preço: {formatCurrency(item.list_price)}
                                    </p>
                                </div>
                            </div>
                        )}
                        {item.can_be_manufactured && (
                            <div className="flex items-center gap-2 p-3 border rounded-lg">
                                <Factory className="h-5 w-5 text-blue-600" />
                                <div>
                                    <p className="font-medium">Manufaturável</p>
                                    <p className="text-sm text-muted-foreground">
                                        {item.current_bom ? 'BOM definida' : 'Sem BOM'}
                                    </p>
                                </div>
                            </div>
                        )}
                        {item.can_be_purchased && (
                            <div className="flex items-center gap-2 p-3 border rounded-lg">
                                <Package className="h-5 w-5 text-orange-600" />
                                <div>
                                    <p className="font-medium">Comprável</p>
                                    <p className="text-sm text-muted-foreground">
                                        Fornecedor: {item.preferred_vendor || 'Não definido'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Current BOM Card - Only show if item can be manufactured */}
            {item.can_be_manufactured && item.current_bom && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>BOM Atual</CardTitle>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/production/bom/${item.current_bom_id}`}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver BOM
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <BomSummary bom={item.current_bom} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
```

#### 3.1.3 Item Form Page
**Route**: `/production/items/create` or `/production/items/{id}/edit`
**Layout**: Standard form layout

```tsx
function ItemForm({ item, mode }) {
    const { data, setData, errors, processing } = useForm({
        item_number: item?.item_number || '',
        name: item?.name || '',
        description: item?.description || '',
        category: item?.category || '',
        item_type: item?.item_type || 'manufactured',
        can_be_sold: item?.can_be_sold ?? true,
        can_be_purchased: item?.can_be_purchased ?? false,
        can_be_manufactured: item?.can_be_manufactured ?? true,
        status: item?.status || 'active',
        unit_of_measure: item?.unit_of_measure || 'EA',
        weight: item?.weight || '',
        list_price: item?.list_price || '',
        cost: item?.cost || '',
        lead_time_days: item?.lead_time_days || 0,
        preferred_vendor: item?.preferred_vendor || '',
        vendor_item_number: item?.vendor_item_number || '',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {mode === 'create' ? 'Novo Item' : 'Editar Item'}
                            </CardTitle>
                            <CardDescription>
                                Preencha as informações do item
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TextInput
                                    form={{ data, setData, errors }}
                                    name="item_number"
                                    label="Número do Item"
                                    placeholder="ITEM-001"
                                    required
                                    view={mode === 'view'}
                                />
                                <TextInput
                                    form={{ data, setData, errors }}
                                    name="name"
                                    label="Nome"
                                    placeholder="Nome do item"
                                    required
                                    view={mode === 'view'}
                                />
                            </div>

                            <div className="grid grid-cols-1">
                                <TextAreaInput
                                    form={{ data, setData, errors }}
                                    name="description"
                                    label="Descrição"
                                    placeholder="Descrição detalhada do item"
                                    rows={3}
                                    view={mode === 'view'}
                                />
                            </div>

                            {/* Classification */}
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ItemSelect
                                    label="Categoria"
                                    items={categories}
                                    value={data.category}
                                    onValueChange={(value) => setData('category', value)}
                                    placeholder="Selecione a categoria"
                                    error={errors.category}
                                    view={mode === 'view'}
                                />
                                <ItemSelect
                                    label="Tipo de Item"
                                    items={itemTypes}
                                    value={data.item_type}
                                    onValueChange={(value) => setData('item_type', value)}
                                    error={errors.item_type}
                                    view={mode === 'view'}
                                    required
                                />
                                <ItemSelect
                                    label="Status"
                                    items={itemStatuses}
                                    value={data.status}
                                    onValueChange={(value) => setData('status', value)}
                                    error={errors.status}
                                    view={mode === 'view'}
                                    required
                                />
                            </div>

                            {/* Capabilities */}
                            <Separator />
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Capacidades</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={data.can_be_sold}
                                            onCheckedChange={(checked) => setData('can_be_sold', checked)}
                                            disabled={mode === 'view'}
                                        />
                                        <span className="text-sm font-medium">Pode ser vendido</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={data.can_be_purchased}
                                            onCheckedChange={(checked) => setData('can_be_purchased', checked)}
                                            disabled={mode === 'view'}
                                        />
                                        <span className="text-sm font-medium">Pode ser comprado</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={data.can_be_manufactured}
                                            onCheckedChange={(checked) => setData('can_be_manufactured', checked)}
                                            disabled={mode === 'view'}
                                        />
                                        <span className="text-sm font-medium">Pode ser manufaturado</span>
                                    </label>
                                </div>
                            </div>

                            {/* Physical Attributes */}
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <TextInput
                                    form={{ data, setData, errors }}
                                    name="unit_of_measure"
                                    label="Unidade de Medida"
                                    placeholder="EA"
                                    view={mode === 'view'}
                                />
                                <TextInput
                                    form={{ data, setData, errors }}
                                    name="weight"
                                    label="Peso (kg)"
                                    placeholder="0.00"
                                    type="number"
                                    step="0.0001"
                                    view={mode === 'view'}
                                />
                                <TextInput
                                    form={{ data, setData, errors }}
                                    name="lead_time_days"
                                    label="Lead Time (dias)"
                                    placeholder="0"
                                    type="number"
                                    view={mode === 'view'}
                                />
                            </div>

                            {/* Financial Information */}
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TextInput
                                    form={{ data, setData, errors }}
                                    name="list_price"
                                    label="Preço de Lista"
                                    placeholder="0.00"
                                    type="number"
                                    step="0.01"
                                    view={mode === 'view'}
                                    disabled={!data.can_be_sold}
                                />
                                <TextInput
                                    form={{ data, setData, errors }}
                                    name="cost"
                                    label="Custo"
                                    placeholder="0.00"
                                    type="number"
                                    step="0.01"
                                    view={mode === 'view'}
                                />
                            </div>

                            {/* Purchasing Information - Only show if can be purchased */}
                            {data.can_be_purchased && (
                                <>
                                    <Separator />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <TextInput
                                            form={{ data, setData, errors }}
                                            name="preferred_vendor"
                                            label="Fornecedor Preferencial"
                                            placeholder="Nome do fornecedor"
                                            view={mode === 'view'}
                                        />
                                        <TextInput
                                            form={{ data, setData, errors }}
                                            name="vendor_item_number"
                                            label="Código do Fornecedor"
                                            placeholder="Código do item no fornecedor"
                                            view={mode === 'view'}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                        {mode !== 'view' && (
                            <CardFooter className="flex justify-end gap-4">
                                <Button variant="outline" type="button" asChild>
                                    <Link href="/production/items">Cancelar</Link>
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
```

### 3.2 Manufacturing Orders

#### 3.2.1 Manufacturing Order List Page
**Route**: `/production/orders`
**Layout**: `ListLayout`

```tsx
<ListLayout
    title="Ordens de Manufatura"
    description="Gerencie ordens de produção e acompanhe o progresso"
    searchPlaceholder="Buscar por número da ordem..."
    searchValue={searchValue}
    onSearchChange={handleSearchChange}
    createRoute="/production/orders/create"
    createButtonText="Nova Ordem"
    actions={
        <ButtonGroup>
            <Button variant="outline" onClick={() => setShowBulkCreate(true)}>
                <Package className="h-4 w-4 mr-2" />
                Criar de BOM
            </Button>
            <FilterDropdown
                filters={filters}
                onFiltersChange={setFilters}
                filterOptions={[
                    { key: 'status', label: 'Status', options: orderStatuses },
                    { key: 'priority', label: 'Prioridade', options: priorities },
                    { key: 'plant', label: 'Planta', options: plants },
                ]}
            />
        </ButtonGroup>
    }
>
    <EntityDataTable
        data={orders}
        columns={orderColumns}
        loading={loading}
        onRowClick={(order) => router.visit(`/production/orders/${order.id}`)}
        actions={(order) => (
            <EntityActionDropdown
                onEdit={() => router.visit(`/production/orders/${order.id}/edit`)}
                onDelete={() => handleDelete(order)}
                additionalActions={[
                    {
                        label: 'Liberar para Produção',
                        icon: <PlayCircle className="h-4 w-4" />,
                        onClick: () => handleRelease(order),
                        disabled: order.status !== 'planned',
                        visible: hasPermission('production.orders.release')
                    },
                    {
                        label: 'Ver Rotas',
                        icon: <Workflow className="h-4 w-4" />,
                        onClick: () => router.visit(`/production/orders/${order.id}/routes`)
                    },
                    {
                        label: 'Ver Ordens Filhas',
                        icon: <GitBranch className="h-4 w-4" />,
                        onClick: () => router.visit(`/production/orders/${order.id}/children`),
                        visible: order.child_orders_count > 0
                    },
                    {
                        label: 'Cancelar',
                        icon: <XCircle className="h-4 w-4" />,
                        onClick: () => handleCancel(order),
                        disabled: ['completed', 'cancelled'].includes(order.status)
                    }
                ]}
            />
        )}
    />
</ListLayout>

// Column Configuration for Orders
const orderColumns: ColumnConfig[] = [
    {
        key: 'order_number',
        label: 'Número',
        sortable: true,
        width: 'w-[150px]',
        render: (value, order) => (
            <div className="flex items-center gap-2">
                <span className="font-medium">{value}</span>
                {order.parent_id && (
                    <Badge variant="outline" className="text-xs">
                        <GitBranch className="h-3 w-3 mr-1" />
                        Filha
                    </Badge>
                )}
            </div>
        )
    },
    {
        key: 'item',
        label: 'Item',
        sortable: true,
        render: (value) => (
            <div>
                <div className="font-medium">{value.item_number}</div>
                <div className="text-sm text-muted-foreground">{value.name}</div>
            </div>
        )
    },
    {
        key: 'quantity',
        label: 'Quantidade',
        sortable: true,
        width: 'w-[120px]',
        render: (value, order) => (
            <div>
                <div>{value} {order.unit_of_measure}</div>
                {order.quantity_completed > 0 && (
                    <Progress 
                        value={(order.quantity_completed / value) * 100} 
                        className="h-1 mt-1"
                    />
                )}
            </div>
        )
    },
    {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: 'w-[120px]',
        render: (value) => (
            <Badge variant={getStatusVariant(value)}>
                {statusLabels[value]}
            </Badge>
        )
    },
    {
        key: 'priority',
        label: 'Prioridade',
        sortable: true,
        width: 'w-[100px]',
        render: (value) => (
            <div className="flex items-center gap-1">
                <PriorityIcon priority={value} />
                <span className="text-sm">{value}</span>
            </div>
        )
    },
    {
        key: 'requested_date',
        label: 'Data Solicitada',
        sortable: true,
        width: 'w-[120px]',
        render: (value) => formatDate(value)
    },
    {
        key: 'progress',
        label: 'Progresso',
        width: 'w-[150px]',
        render: (value, order) => {
            if (order.child_orders_count > 0) {
                return (
                    <div className="text-sm">
                        <span className="font-medium">
                            {order.completed_child_orders_count}/{order.child_orders_count}
                        </span>
                        <span className="text-muted-foreground ml-1">ordens filhas</span>
                    </div>
                );
            }
            return <span className="text-muted-foreground">—</span>;
        }
    }
];
```

#### 3.2.2 Manufacturing Order Details Page
**Route**: `/production/orders/{id}`
**Layout**: `ShowLayout` with tabs

```tsx
function ManufacturingOrderDetails({ order }) {
    const tabs = [
        {
            id: 'overview',
            label: 'Visão Geral',
            content: <OrderOverviewTab order={order} />
        },
        {
            id: 'routes',
            label: 'Rotas e Etapas',
            content: <OrderRoutesTab order={order} />,
            badge: order.manufacturing_route ? '1' : null
        },
        {
            id: 'children',
            label: 'Ordens Filhas',
            content: <OrderChildrenTab order={order} />,
            visible: order.child_orders_count > 0,
            badge: order.child_orders_count
        },
        {
            id: 'materials',
            label: 'Materiais',
            content: <OrderMaterialsTab order={order} />
        },
        {
            id: 'execution',
            label: 'Execução',
            content: <OrderExecutionTab order={order} />,
            visible: ['released', 'in_progress', 'completed'].includes(order.status)
        },
        {
            id: 'history',
            label: 'Histórico',
            content: <OrderHistoryTab order={order} />
        }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ShowLayout
                title={`Ordem ${order.order_number}`}
                subtitle={order.item.name}
                backUrl="/production/orders"
                tabs={tabs}
                actions={
                    <div className="flex gap-2">
                        {order.status === 'planned' && (
                            <Button 
                                onClick={() => handleRelease(order)}
                                disabled={!canRelease(order)}
                            >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Liberar
                            </Button>
                        )}
                        {order.status === 'released' && !order.manufacturing_route && (
                            <Button variant="outline" asChild>
                                <Link href={`/production/orders/${order.id}/routes/create`}>
                                    <Workflow className="h-4 w-4 mr-2" />
                                    Criar Rota
                                </Link>
                            </Button>
                        )}
                        <EntityActionDropdown
                            onEdit={() => router.visit(`/production/orders/${order.id}/edit`)}
                            onDelete={() => handleDelete(order)}
                            disabled={['in_progress', 'completed'].includes(order.status)}
                        />
                    </div>
                }
            />
        </AppLayout>
    );
}

// Order Overview Tab
function OrderOverviewTab({ order }) {
    return (
        <div className="space-y-6 py-6">
            {/* Status Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Status da Ordem</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Status Atual
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                                <Badge variant={getStatusVariant(order.status)} className="text-base">
                                    {statusLabels[order.status]}
                                </Badge>
                                {order.auto_complete_on_children && order.child_orders_count > 0 && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Será concluída automaticamente quando todas as ordens filhas forem concluídas</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Prioridade
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                                <PriorityIcon priority={order.priority} />
                                <span className="font-medium">{order.priority}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Progresso
                            </label>
                            <div className="mt-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">
                                        {order.quantity_completed} / {order.quantity}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {Math.round((order.quantity_completed / order.quantity) * 100)}%
                                    </span>
                                </div>
                                <Progress value={(order.quantity_completed / order.quantity) * 100} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Parent Order Card - if this is a child order */}
            {order.parent && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Ordem Principal</CardTitle>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/production/orders/${order.parent.id}`}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver Ordem
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <p className="font-medium">{order.parent.order_number}</p>
                                <p className="text-sm text-muted-foreground">
                                    {order.parent.item.item_number} - {order.parent.item.name}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Quantidade</p>
                                <p className="font-medium">
                                    {order.parent.quantity} {order.parent.unit_of_measure}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Child Orders Summary - if this has child orders */}
            {order.child_orders_count > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Resumo das Ordens Filhas</CardTitle>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/production/orders/${order.id}/children`}>
                                <GitBranch className="h-4 w-4 mr-2" />
                                Ver Todas
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 border rounded-lg">
                                <p className="text-2xl font-bold">{order.child_orders_count}</p>
                                <p className="text-sm text-muted-foreground">Total</p>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <p className="text-2xl font-bold text-green-600">
                                    {order.completed_child_orders_count}
                                </p>
                                <p className="text-sm text-muted-foreground">Concluídas</p>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <p className="text-2xl font-bold text-blue-600">
                                    {order.child_orders_in_progress}
                                </p>
                                <p className="text-sm text-muted-foreground">Em Progresso</p>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <p className="text-2xl font-bold text-yellow-600">
                                    {order.child_orders_pending}
                                </p>
                                <p className="text-sm text-muted-foreground">Pendentes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
```

#### 3.2.3 Create Manufacturing Order for BOM
**Route**: `/production/orders/create-from-bom`
**Component**: Multi-step wizard

```tsx
function CreateOrderFromBOM({ boms }) {
    const [step, setStep] = useState(1);
    const [orderData, setOrderData] = useState({
        bill_of_material_id: null,
        quantity: 1,
        requested_date: null,
        priority: 50,
        auto_create_routes: false,
        route_template_id: null
    });

    const steps = [
        { number: 1, title: 'Selecionar BOM' },
        { number: 2, title: 'Configurar Ordem' },
        { number: 3, title: 'Rotas de Produção' },
        { number: 4, title: 'Visualização' },
        { number: 5, title: 'Confirmação' }
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Criar Ordem de Manufatura de BOM</DialogTitle>
                    <DialogDescription>
                        Crie uma ordem principal e todas as ordens filhas automaticamente
                    </DialogDescription>
                </DialogHeader>

                <WizardSteps steps={steps} currentStep={step} />

                <div className="flex-1 overflow-auto">
                    {step === 1 && (
                        <BOMSelectionStep
                            selectedBOM={orderData.bill_of_material_id}
                            onSelect={(bomId) => 
                                setOrderData({ ...orderData, bill_of_material_id: bomId })
                            }
                            boms={boms}
                        />
                    )}
                    {step === 2 && (
                        <OrderConfigurationStep
                            data={orderData}
                            onChange={setOrderData}
                            selectedBOM={boms.find(b => b.id === orderData.bill_of_material_id)}
                        />
                    )}
                    {step === 3 && (
                        <RouteConfigurationStep
                            data={orderData}
                            onChange={setOrderData}
                            bomItems={getExpandedBOMItems(orderData.bill_of_material_id)}
                        />
                    )}
                    {step === 4 && (
                        <OrderPreviewStep
                            orderData={orderData}
                            preview={generateOrderPreview(orderData)}
                        />
                    )}
                    {step === 5 && (
                        <ConfirmationStep
                            onConfirm={handleCreateOrders}
                            summary={generateOrderSummary(orderData)}
                        />
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setStep(step - 1)}
                        disabled={step === 1}
                    >
                        Voltar
                    </Button>
                    <Button
                        onClick={() => step === steps.length ? handleCreateOrders() : setStep(step + 1)}
                        disabled={!canProceedToNextStep()}
                    >
                        {step === steps.length ? 'Criar Ordens' : 'Próximo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

### 3.3 BOM Management

#### 3.3.1 BOM List Page
**Route**: `/production/bom`
**Layout**: `ListLayout`

```tsx
<ListLayout
    title="Bills of Materials"
    description="Gerencie estruturas de produtos e montagens"
    searchPlaceholder="Buscar por número ou nome..."
    searchValue={searchValue}
    onSearchChange={handleSearchChange}
    createButtonText="Nova BOM"
    actions={
        <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
        </Button>
    }
>
    <EntityDataTable
        data={boms}
        columns={bomColumns}
        loading={loading}
        onRowClick={(bom) => router.visit(`/production/bom/${bom.id}`)}
        actions={(bom) => (
            <EntityActionDropdown
                onEdit={() => router.visit(`/production/bom/${bom.id}/edit`)}
                onDelete={() => handleDelete(bom)}
                additionalActions={[
                    {
                        label: 'Ver Hierarquia',
                        icon: <GitBranch className="h-4 w-4" />,
                        onClick: () => router.visit(`/production/bom/${bom.id}/hierarchy`)
                    },
                    {
                        label: 'Duplicar',
                        icon: <Copy className="h-4 w-4" />,
                        onClick: () => handleDuplicate(bom)
                    },
                    {
                        label: 'Exportar',
                        icon: <Download className="h-4 w-4" />,
                        onClick: () => handleExport(bom)
                    }
                ]}
            />
        )}
    />
</ListLayout>
```

#### 3.3.2 BOM Hierarchy View
**Route**: `/production/bom/{id}/hierarchy`
**Layout**: Custom full-screen layout

```tsx
function BomHierarchyView({ bom }) {
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [selectedItem, setSelectedItem] = useState(null);
    const [viewMode, setViewMode] = useState('tree'); // tree, grid, 3d

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-[calc(100vh-8rem)] flex">
                {/* Left Panel - Hierarchy Tree */}
                <div className="w-1/3 border-r flex flex-col">
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">{bom.name}</h2>
                            <ButtonGroup>
                                <Button
                                    variant={viewMode === 'tree' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('tree')}
                                >
                                    <TreePine className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid3x3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === '3d' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('3d')}
                                >
                                    <Box className="h-4 w-4" />
                                </Button>
                            </ButtonGroup>
                        </div>
                        <SearchInput
                            placeholder="Buscar item..."
                            value={searchValue}
                            onChange={setSearchValue}
                        />
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        {viewMode === 'tree' && (
                            <BomTreeView
                                items={bom.items}
                                expandedNodes={expandedNodes}
                                onToggleExpand={handleToggleExpand}
                                selectedItem={selectedItem}
                                onSelectItem={setSelectedItem}
                            />
                        )}
                        {viewMode === 'grid' && (
                            <BomGridView
                                items={bom.items}
                                selectedItem={selectedItem}
                                onSelectItem={setSelectedItem}
                            />
                        )}
                    </div>
                </div>

                {/* Right Panel - Item Details */}
                <div className="flex-1 flex flex-col">
                    {selectedItem ? (
                        <>
                            <div className="p-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {selectedItem.item_number}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedItem.name}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">
                                            <Edit className="h-4 w-4 mr-2" />
                                            Editar
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <QrCode className="h-4 w-4 mr-2" />
                                            QR Code
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                                <BomItemDetails item={selectedItem} />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Package className="h-12 w-12 mx-auto mb-4" />
                                <p>Selecione um item para ver os detalhes</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
```

#### 3.3.3 BOM Import Wizard
**Component**: Modal dialog with multi-step wizard

```tsx
function BomImportWizard({ open, onClose }) {
    const [step, setStep] = useState(1);
    const [importData, setImportData] = useState({
        source: 'inventor', // inventor, csv
        file: null,
        mapping: {},
        preview: null
    });

    const steps = [
        { number: 1, title: 'Fonte de Dados' },
        { number: 2, title: 'Upload de Arquivo' },
        { number: 3, title: 'Mapeamento' },
        { number: 4, title: 'Visualização' },
        { number: 5, title: 'Confirmação' }
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Importar BOM</DialogTitle>
                    <DialogDescription>
                        Importe estruturas de produtos do Inventor ou arquivo CSV
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Steps */}
                <div className="py-4">
                    <WizardSteps steps={steps} currentStep={step} />
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-auto">
                    {step === 1 && (
                        <SourceSelectionStep
                            source={importData.source}
                            onSourceChange={(source) => 
                                setImportData({ ...importData, source })
                            }
                        />
                    )}
                    {step === 2 && (
                        <FileUploadStep
                            source={importData.source}
                            onFileSelect={(file) => 
                                setImportData({ ...importData, file })
                            }
                        />
                    )}
                    {step === 3 && importData.source === 'csv' && (
                        <FieldMappingStep
                            file={importData.file}
                            mapping={importData.mapping}
                            onMappingChange={(mapping) => 
                                setImportData({ ...importData, mapping })
                            }
                        />
                    )}
                    {step === 4 && (
                        <PreviewStep
                            importData={importData}
                            onPreviewGenerated={(preview) => 
                                setImportData({ ...importData, preview })
                            }
                        />
                    )}
                    {step === 5 && (
                        <ConfirmationStep
                            preview={importData.preview}
                            onConfirm={handleImport}
                        />
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setStep(step - 1)}
                        disabled={step === 1}
                    >
                        Voltar
                    </Button>
                    <Button
                        onClick={() => setStep(step + 1)}
                        disabled={!canProceed()}
                    >
                        {step === steps.length ? 'Importar' : 'Próximo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

### 3.4 Manufacturing Routes & Steps

#### 3.4.1 Manufacturing Route Builder
**Route**: `/production/orders/{orderId}/routes/create` or `/production/routes/{id}/edit`
**Layout**: Custom split-screen layout

```tsx
function ManufacturingRouteBuilder({ order, route }) {
    const [steps, setSteps] = useState(route?.steps || []);
    const [selectedStep, setSelectedStep] = useState(null);
    const [viewMode, setViewMode] = useState('visual'); // visual, grid
    const [showTemplates, setShowTemplates] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-[calc(100vh-8rem)] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">
                                Rota de Manufatura: {order.order_number}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {order.item.item_number} - {order.item.name}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <ButtonGroup>
                                <Button
                                    variant={viewMode === 'visual' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('visual')}
                                >
                                    <Workflow className="h-4 w-4 mr-2" />
                                    Visual
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Table className="h-4 w-4 mr-2" />
                                    Tabela
                                </Button>
                            </ButtonGroup>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowTemplates(true)}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Templates
                            </Button>
                            <Button variant="outline" size="sm">
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {viewMode === 'visual' ? (
                        <>
                            {/* Visual Builder */}
                            <div className="flex-1 p-4 overflow-auto bg-muted/20">
                                <ManufacturingStepVisualBuilder
                                    steps={steps}
                                    onStepsChange={setSteps}
                                    selectedStep={selectedStep}
                                    onSelectStep={setSelectedStep}
                                />
                            </div>
                            {/* Step Details Panel */}
                            <div className="w-96 border-l bg-background">
                                {selectedStep ? (
                                    <ManufacturingStepDetails
                                        step={selectedStep}
                                        onUpdate={(updatedStep) => 
                                            handleStepUpdate(selectedStep.id, updatedStep)
                                        }
                                        workCells={workCells}
                                        forms={forms}
                                    />
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <MousePointer className="h-12 w-12 mx-auto mb-4" />
                                        <p>Selecione uma etapa para editar</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Grid View */
                        <div className="flex-1 p-4">
                            <ManufacturingStepGridEditor
                                steps={steps}
                                onStepsChange={setSteps}
                                workCells={workCells}
                                forms={forms}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
```

#### 3.4.2 Manufacturing Step Visual Components

```tsx
// Manufacturing Step Node Component
function ManufacturingStepNode({ step, isSelected, onSelect, onConnect }) {
    const getStepTypeIcon = (type) => {
        switch(type) {
            case 'quality_check':
                return <CheckCircle className="h-4 w-4" />;
            case 'rework':
                return <RefreshCw className="h-4 w-4" />;
            default:
                return <Settings className="h-4 w-4" />;
        }
    };

    const getStepTypeColor = (type) => {
        switch(type) {
            case 'quality_check':
                return 'border-blue-500 bg-blue-50';
            case 'rework':
                return 'border-orange-500 bg-orange-50';
            default:
                return 'border-gray-300 bg-white';
        }
    };

    return (
        <div
            className={cn(
                "relative border-2 rounded-lg p-4 cursor-pointer transition-all",
                "hover:shadow-md min-w-[250px]",
                isSelected ? "border-primary shadow-lg" : getStepTypeColor(step.step_type)
            )}
            onClick={() => onSelect(step)}
        >
            {/* Connection Points */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <ConnectionPoint type="input" onConnect={onConnect} />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <ConnectionPoint type="output" onConnect={onConnect} />
            </div>

            {/* Step Content */}
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        step.step_type === 'quality_check' ? 'bg-blue-100' :
                        step.step_type === 'rework' ? 'bg-orange-100' : 'bg-gray-100'
                    )}>
                        {getStepTypeIcon(step.step_type)}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                            Etapa {step.step_number}
                        </span>
                        <Badge variant="outline" className="text-xs">
                            {getStepStatusLabel(step.status)}
                        </Badge>
                    </div>
                    <h4 className="font-medium text-sm mt-1">{step.name}</h4>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {step.cycle_time_minutes}min
                        </Badge>
                        {step.work_cell && (
                            <Badge variant="outline" className="text-xs">
                                {step.work_cell.code}
                            </Badge>
                        )}
                        {step.form_id && (
                            <Badge variant="outline" className="text-xs">
                                <FileText className="h-3 w-3" />
                            </Badge>
                        )}
                    </div>
                    {step.step_type === 'quality_check' && (
                        <div className="mt-2 text-xs text-muted-foreground">
                            Modo: {getQualityCheckModeLabel(step.quality_check_mode)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Step Details Panel
function ManufacturingStepDetails({ step, onUpdate, workCells, forms }) {
    const [editedStep, setEditedStep] = useState(step);

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <h3 className="font-semibold">Detalhes da Etapa</h3>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Basic Info */}
                <div className="space-y-4">
                    <TextInput
                        label="Nome da Etapa"
                        value={editedStep.name}
                        onChange={(value) => setEditedStep({ ...editedStep, name: value })}
                    />
                    <TextAreaInput
                        label="Descrição"
                        value={editedStep.description}
                        onChange={(value) => setEditedStep({ ...editedStep, description: value })}
                        rows={3}
                    />
                </div>

                <Separator />

                {/* Step Type */}
                <div>
                    <Label>Tipo de Etapa</Label>
                    <Select
                        value={editedStep.step_type}
                        onValueChange={(value) => setEditedStep({ ...editedStep, step_type: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="standard">Padrão</SelectItem>
                            <SelectItem value="quality_check">Verificação de Qualidade</SelectItem>
                            <SelectItem value="rework">Retrabalho</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Quality Check Options */}
                {editedStep.step_type === 'quality_check' && (
                    <>
                        <div>
                            <Label>Modo de Verificação</Label>
                            <Select
                                value={editedStep.quality_check_mode}
                                onValueChange={(value) => 
                                    setEditedStep({ ...editedStep, quality_check_mode: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="every_part">Cada Peça</SelectItem>
                                    <SelectItem value="entire_lot">Lote Completo</SelectItem>
                                    <SelectItem value="sampling">Amostragem (ISO 2859)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {editedStep.quality_check_mode === 'sampling' && (
                            <TextInput
                                label="Tamanho da Amostra"
                                type="number"
                                value={editedStep.sampling_size}
                                onChange={(value) => 
                                    setEditedStep({ ...editedStep, sampling_size: value })
                                }
                            />
                        )}
                    </>
                )}

                <Separator />

                {/* Resources */}
                <div className="space-y-4">
                    <div>
                        <Label>Célula de Trabalho</Label>
                        <Select
                            value={editedStep.work_cell_id}
                            onValueChange={(value) => 
                                setEditedStep({ ...editedStep, work_cell_id: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {workCells.map((cell) => (
                                    <SelectItem key={cell.id} value={cell.id}>
                                        {cell.code} - {cell.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Formulário Associado</Label>
                        <Select
                            value={editedStep.form_id}
                            onValueChange={(value) => 
                                setEditedStep({ ...editedStep, form_id: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Nenhum" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Nenhum</SelectItem>
                                {forms.map((form) => (
                                    <SelectItem key={form.id} value={form.id}>
                                        {form.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Separator />

                {/* Time Settings */}
                <div className="space-y-4">
                    <TextInput
                        label="Tempo de Setup (minutos)"
                        type="number"
                        value={editedStep.setup_time_minutes}
                        onChange={(value) => 
                            setEditedStep({ ...editedStep, setup_time_minutes: value })
                        }
                    />
                    <TextInput
                        label="Tempo de Ciclo (minutos)"
                        type="number"
                        value={editedStep.cycle_time_minutes}
                        onChange={(value) => 
                            setEditedStep({ ...editedStep, cycle_time_minutes: value })
                        }
                    />
                </div>

                {/* Dependencies */}
                <div>
                    <Label>Depende da Etapa</Label>
                    <Select
                        value={editedStep.depends_on_step_id}
                        onValueChange={(value) => 
                            setEditedStep({ ...editedStep, depends_on_step_id: value })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Nenhuma dependência" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Nenhuma</SelectItem>
                            {/* List other steps */}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="p-4 border-t">
                <Button 
                    className="w-full"
                    onClick={() => onUpdate(editedStep)}
                >
                    Atualizar Etapa
                </Button>
            </div>
        </div>
    );
}
```

#### 3.4.3 Manufacturing Step Execution Interface
**Route**: `/production/steps/{id}/execute`
**Layout**: Mobile-optimized execution interface

```tsx
function ManufacturingStepExecution({ step, execution }) {
    const [status, setStatus] = useState(execution?.status || 'queued');
    const [qualityResult, setQualityResult] = useState(null);
    const [showForm, setShowForm] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-lg font-semibold">{step.name}</h1>
                        <Badge variant={getStatusVariant(status)}>
                            {getStepStatusLabel(status)}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Ordem: {step.route.production_order.order_number}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Step Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informações da Etapa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <DetailItem 
                            label="Item" 
                            value={step.route.production_order.item.item_number}
                        />
                        <DetailItem 
                            label="Quantidade" 
                            value={`${step.route.production_order.quantity} ${step.route.production_order.unit_of_measure}`}
                        />
                        <DetailItem 
                            label="Célula de Trabalho" 
                            value={step.work_cell?.name}
                        />
                        <DetailItem 
                            label="Tempo Estimado" 
                            value={`${step.cycle_time_minutes} minutos`}
                        />
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                {status === 'queued' && (
                    <Button 
                        size="lg" 
                        className="w-full"
                        onClick={() => handleStart()}
                    >
                        <PlayCircle className="h-5 w-5 mr-2" />
                        Iniciar Etapa
                    </Button>
                )}

                {status === 'in_progress' && (
                    <div className="space-y-2">
                        {step.form_id && !showForm && (
                            <Button 
                                variant="outline"
                                className="w-full"
                                onClick={() => setShowForm(true)}
                            >
                                <FileText className="h-5 w-5 mr-2" />
                                Preencher Formulário
                            </Button>
                        )}
                        
                        {step.step_type === 'quality_check' && (
                            <QualityCheckPanel
                                onResult={(result) => setQualityResult(result)}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <Button 
                                variant="outline"
                                onClick={() => handlePause()}
                            >
                                <Pause className="h-5 w-5 mr-2" />
                                Pausar
                            </Button>
                            <Button 
                                onClick={() => handleComplete()}
                                disabled={step.form_id && !formCompleted}
                            >
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Concluir
                            </Button>
                        </div>
                    </div>
                )}

                {status === 'on_hold' && (
                    <Button 
                        size="lg" 
                        className="w-full"
                        onClick={() => handleResume()}
                    >
                        <PlayCircle className="h-5 w-5 mr-2" />
                        Retomar Etapa
                    </Button>
                )}

                {/* Form Display */}
                {showForm && step.form_id && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Formulário da Etapa</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormExecution
                                formId={step.form_id}
                                executionContext={{
                                    type: 'manufacturing_step',
                                    id: execution.id
                                }}
                                onComplete={() => setShowForm(false)}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Quality Check Result */}
                {step.step_type === 'quality_check' && qualityResult && (
                    <QualityResultActions
                        result={qualityResult}
                        onAction={handleQualityAction}
                    />
                )}
            </div>
        </div>
    );
}
```

### 3.5 Production Planning

#### 3.5.1 Production Schedule Calendar
**Route**: `/production/planning/calendar`
**Layout**: Full-screen calendar view

```tsx
function ProductionCalendar({ schedules, workCells }) {
    const [view, setView] = useState('month'); // month, week, day
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filters, setFilters] = useState({
        workCells: [],
        status: [],
        products: []
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-[calc(100vh-8rem)] flex flex-col">
                {/* Header with Controls */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-semibold">
                                Calendário de Produção
                            </h1>
                            <ButtonGroup>
                                <Button
                                    variant={view === 'month' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setView('month')}
                                >
                                    Mês
                                </Button>
                                <Button
                                    variant={view === 'week' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setView('week')}
                                >
                                    Semana
                                </Button>
                                <Button
                                    variant={view === 'day' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setView('day')}
                                >
                                    Dia
                                </Button>
                            </ButtonGroup>
                        </div>
                        <div className="flex items-center gap-2">
                            <FilterPopover
                                filters={filters}
                                onFiltersChange={setFilters}
                            />
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Nova Ordem
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Calendar View */}
                <div className="flex-1 overflow-hidden">
                    <BigCalendar
                        localizer={localizer}
                        events={schedules}
                        view={view}
                        onView={setView}
                        date={selectedDate}
                        onNavigate={setSelectedDate}
                        components={{
                            event: ProductionEventComponent,
                            toolbar: CustomToolbar
                        }}
                        eventPropGetter={getEventStyle}
                        onSelectEvent={handleEventClick}
                        onSelectSlot={handleSlotSelect}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
```

#### 3.5.2 Gantt Chart View
**Route**: `/production/planning/gantt`
**Layout**: Custom Gantt layout

```tsx
function ProductionGantt({ orders, workCells }) {
    const [timeRange, setTimeRange] = useState('week');
    const [groupBy, setGroupBy] = useState('workCell'); // workCell, product, order

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-[calc(100vh-8rem)] flex flex-col">
                {/* Controls */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-semibold">
                                Gráfico de Gantt
                            </h1>
                            <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Dia</SelectItem>
                                    <SelectItem value="week">Semana</SelectItem>
                                    <SelectItem value="month">Mês</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={groupBy} onValueChange={setGroupBy}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="workCell">Por Célula</SelectItem>
                                    <SelectItem value="product">Por Produto</SelectItem>
                                    <SelectItem value="order">Por Ordem</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Exportar
                            </Button>
                            <Button variant="outline" size="sm">
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Gantt Chart */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Resource List */}
                    <div className="w-64 border-r flex flex-col">
                        <div className="p-2 border-b bg-muted/50">
                            <h3 className="text-sm font-medium">
                                {groupBy === 'workCell' ? 'Células de Trabalho' : 
                                 groupBy === 'product' ? 'Produtos' : 'Ordens'}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <GanttResourceList
                                resources={getResources()}
                                groupBy={groupBy}
                            />
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 overflow-auto">
                        <GanttTimeline
                            tasks={orders}
                            timeRange={timeRange}
                            onTaskClick={handleTaskClick}
                            onTaskDrag={handleTaskDrag}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
```

### 3.6 Production Tracking

#### 3.6.1 QR Code Scanner Interface
**Route**: `/production/tracking/scan`
**Layout**: Mobile-optimized full-screen

```tsx
function QrScanner() {
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(true);
    const [recentScans, setRecentScans] = useState([]);

    return (
        <div className="h-screen bg-black flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 text-white p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">Scanner QR</h1>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-gray-800"
                        asChild
                    >
                        <Link href="/production/tracking">
                            <X className="h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 relative">
                {isScanning ? (
                    <QrReader
                        onResult={(result) => {
                            if (result) {
                                handleScan(result.text);
                            }
                        }}
                        constraints={{ facingMode: 'environment' }}
                        className="w-full h-full"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Button
                            size="lg"
                            onClick={() => setIsScanning(true)}
                            className="bg-white text-black hover:bg-gray-100"
                        >
                            <Camera className="h-6 w-6 mr-2" />
                            Iniciar Scanner
                        </Button>
                    </div>
                )}

                {/* Scan Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="w-64 h-64 border-4 border-white rounded-lg opacity-50" />
                    </div>
                </div>
            </div>

            {/* Result Panel */}
            {scanResult && (
                <div className="bg-white p-4 border-t animate-in slide-in-from-bottom">
                    <QrScanResult
                        result={scanResult}
                        onClose={() => setScanResult(null)}
                        onAction={handleAction}
                    />
                </div>
            )}

            {/* Recent Scans */}
            {recentScans.length > 0 && !scanResult && (
                <div className="bg-gray-900 text-white p-4 border-t border-gray-800">
                    <h3 className="text-sm font-medium mb-2">Scans Recentes</h3>
                    <div className="space-y-2">
                        {recentScans.slice(0, 3).map((scan, index) => (
                            <RecentScanItem
                                key={index}
                                scan={scan}
                                onClick={() => setScanResult(scan)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
```

#### 3.6.2 Production Status Dashboard
**Route**: `/production/tracking`
**Layout**: Dashboard layout

```tsx
function ProductionDashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="p-6 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KpiCard
                        title="Em Produção"
                        value="24"
                        icon={<PlayCircle className="h-4 w-4" />}
                        trend="+12%"
                        trendUp
                    />
                    <KpiCard
                        title="Concluídas Hoje"
                        value="18"
                        icon={<CheckCircle className="h-4 w-4" />}
                        trend="+5%"
                        trendUp
                    />
                    <KpiCard
                        title="Taxa de Defeitos"
                        value="2.3%"
                        icon={<AlertCircle className="h-4 w-4" />}
                        trend="-0.5%"
                        trendUp
                    />
                    <KpiCard
                        title="Eficiência"
                        value="87%"
                        icon={<TrendingUp className="h-4 w-4" />}
                        trend="+3%"
                        trendUp
                    />
                </div>

                {/* Work Cell Status Grid */}
                <Card>
                    <CardHeader>
                        <CardTitle>Status das Células de Trabalho</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {workCells.map((cell) => (
                                <WorkCellCard
                                    key={cell.id}
                                    workCell={cell}
                                    onClick={() => handleCellClick(cell)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Active Production Orders */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Ordens em Produção</CardTitle>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/production/tracking/scan">
                                <QrCode className="h-4 w-4 mr-2" />
                                Scanner QR
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <EntityDataTable
                            data={activeOrders}
                            columns={activeOrderColumns}
                            onRowClick={(order) => handleOrderClick(order)}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
```

### 3.7 Shipment Management

#### 3.7.1 Shipment Creation Form
**Route**: `/production/shipments/create`
**Layout**: Multi-step form

```tsx
function ShipmentForm() {
    const [step, setStep] = useState(1);
    const [shipmentData, setShipmentData] = useState({
        items: [],
        destination: {},
        carrier: '',
        photos: []
    });

    const steps = [
        { number: 1, title: 'Itens', icon: <Package className="h-4 w-4" /> },
        { number: 2, title: 'Destino', icon: <MapPin className="h-4 w-4" /> },
        { number: 3, title: 'Transporte', icon: <Truck className="h-4 w-4" /> },
        { number: 4, title: 'Fotos', icon: <Camera className="h-4 w-4" /> },
        { number: 5, title: 'Confirmação', icon: <Check className="h-4 w-4" /> }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="max-w-4xl mx-auto py-6 px-4">
                {/* Progress Steps */}
                <div className="mb-8">
                    <StepIndicator steps={steps} currentStep={step} />
                </div>

                {/* Step Content */}
                <Card>
                    <CardContent className="p-6">
                        {step === 1 && (
                            <ShipmentItemsStep
                                items={shipmentData.items}
                                onItemsChange={(items) => 
                                    setShipmentData({ ...shipmentData, items })
                                }
                            />
                        )}
                        {step === 2 && (
                            <DestinationStep
                                destination={shipmentData.destination}
                                onDestinationChange={(destination) => 
                                    setShipmentData({ ...shipmentData, destination })
                                }
                            />
                        )}
                        {step === 3 && (
                            <CarrierStep
                                carrier={shipmentData.carrier}
                                onCarrierChange={(carrier) => 
                                    setShipmentData({ ...shipmentData, carrier })
                                }
                            />
                        )}
                        {step === 4 && (
                            <PhotosStep
                                photos={shipmentData.photos}
                                onPhotosChange={(photos) => 
                                    setShipmentData({ ...shipmentData, photos })
                                }
                            />
                        )}
                        {step === 5 && (
                            <ConfirmationStep
                                shipmentData={shipmentData}
                                onConfirm={handleCreateShipment}
                            />
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setStep(step - 1)}
                            disabled={step === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                        <Button
                            onClick={() => 
                                step === steps.length ? 
                                handleCreateShipment() : 
                                setStep(step + 1)
                            }
                        >
                            {step === steps.length ? 'Criar Remessa' : 'Próximo'}
                            {step < steps.length && 
                                <ChevronRight className="h-4 w-4 ml-2" />
                            }
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </AppLayout>
    );
}
```

## 4. Mobile Interfaces

### 4.1 Mobile QR Scanner
- Full-screen camera view
- Large, touch-friendly action buttons
- Haptic feedback on successful scan
- Offline capability with sync queue

### 4.2 Mobile Production Tracking
- Simplified interface for shop floor tablets
- Large buttons for start/stop/complete actions
- Visual work instructions with swipe navigation
- Voice notes capability

## 5. Component Library Extensions

### 5.1 Production-Specific Components

```tsx
// Status Badge Component
function StatusBadge({ status }) {
    const variants = {
        'active': 'default',
        'inactive': 'secondary',
        'prototype': 'outline',
        'discontinued': 'destructive'
    };

    const labels = {
        'active': 'Ativo',
        'inactive': 'Inativo',
        'prototype': 'Protótipo',
        'discontinued': 'Descontinuado'
    };

    return (
        <Badge variant={variants[status] || 'default'}>
            {labels[status] || status}
        </Badge>
    );
}

// BOM Tree Node Component
function BomTreeNode({ bomItem, level, isExpanded, onToggle, onSelect, isSelected }) {
    return (
        <div
            className={cn(
                "flex items-center gap-2 py-1 px-2 rounded cursor-pointer",
                "hover:bg-muted/50",
                isSelected && "bg-muted"
            )}
            style={{ paddingLeft: `${level * 24 + 8}px` }}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className="p-0.5"
            >
                {bomItem.children.length > 0 ? (
                    isExpanded ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                ) : (
                    <div className="w-4" />
                )}
            </button>
            
                                            {bomItem.thumbnail_path && (
                                    <img
                                        src={bomItem.thumbnail_path}
                                        alt={bomItem.item.name}
                                        className="w-8 h-8 object-cover rounded"
                                    />
                                )}
                                
                                <div className="flex-1" onClick={() => onSelect(bomItem)}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {bomItem.item.item_number}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            {bomItem.quantity} {bomItem.unit_of_measure}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {bomItem.item.name}
                                    </span>
                                </div>
            
            {bomItem.qr_code && (
                <QrCode className="h-4 w-4 text-muted-foreground" />
            )}
        </div>
    );
}
```

## 6. Accessibility

### 6.1 Keyboard Navigation
- Full keyboard support for all interactions
- Tab order follows logical flow
- Escape key closes modals/dropdowns
- Arrow keys for tree navigation

### 6.2 Screen Reader Support
- Proper ARIA labels and descriptions
- Landmark regions for navigation
- Status announcements for async operations
- Form validation announcements

### 6.3 Visual Accessibility
- High contrast mode support
- Focus indicators on all interactive elements
- Color not sole indicator of meaning
- Minimum text size of 14px

## 7. Performance Considerations

### 7.1 Lazy Loading
- Load BOM items on expand
- Virtualized lists for large datasets
- Image lazy loading with placeholders
- Code splitting by route

### 7.2 Optimistic Updates
- Immediate UI feedback
- Background sync
- Rollback on failure
- Offline queue management

## 8. Error Handling

### 8.1 Form Validation
- Inline validation messages
- Field-level error states
- Summary of errors at top
- Clear error recovery paths

### 8.2 System Errors
- User-friendly error messages
- Retry mechanisms
- Fallback states
- Error boundary components

## 9. Help & Documentation

### 9.1 Contextual Help
- Tooltip hints on hover
- Help icons with explanations
- Inline documentation links
- Video tutorials for complex features

### 9.2 Onboarding
- Feature tours for new users
- Progressive disclosure
- Sample data for testing
- Quick start guides

## 10. Responsive Breakpoints

```scss
// Breakpoint definitions
$mobile: 640px;
$tablet: 768px;
$desktop: 1024px;
$wide: 1280px;

// Usage examples
@media (max-width: $mobile) {
  // Mobile-specific styles
}

@media (min-width: $tablet) and (max-width: $desktop) {
  // Tablet-specific styles
}

@media (min-width: $desktop) {
  // Desktop styles
}
```

This UI/UX specification provides a comprehensive guide for implementing the Production Module interface while maintaining consistency with the existing system design patterns and components. 