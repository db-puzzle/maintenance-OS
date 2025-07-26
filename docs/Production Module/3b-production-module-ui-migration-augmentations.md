# Production Module UI Migration Augmentations

## Overview

This document outlines the additional UI requirements and augmentations needed to support the Manufacturing Order (MO) migration plan. These augmentations address:

1. **Route-to-Order Relationship** - UI changes to reflect routes being tied to orders, not items
2. **State Management** - Enhanced step execution interfaces with proper state tracking
3. **Quality Control** - Specialized interfaces for quality checks and rework handling
4. **Parent-Child Orders** - UI for managing hierarchical order relationships
5. **Permission-Based Access** - UI adaptations for role-based access control

## 1. Updated Manufacturing Order Creation Flow

### 1.1 Enhanced Order Creation Wizard

The existing create order flow needs augmentation to support the new parent-child relationships:

```tsx
// Enhanced Order Creation Step
function OrderConfigurationStep({ data, onChange, selectedBOM }) {
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    
    return (
        <div className="space-y-6">
            {/* Basic Fields (existing) */}
            
            {/* New: Parent-Child Options */}
            {selectedBOM && (
                <Card>
                    <CardHeader>
                        <CardTitle>Child Order Configuration</CardTitle>
                        <CardDescription>
                            This BOM will create {selectedBOM.item_count} child orders
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={data.auto_complete_on_children}
                                onCheckedChange={(checked) => 
                                    onChange({ ...data, auto_complete_on_children: checked })
                                }
                            />
                            <Label>
                                Auto-complete parent order when all children complete
                            </Label>
                        </div>
                        
                        <div className="border rounded-lg p-3 bg-muted/20">
                            <p className="text-sm font-medium mb-2">Child Orders Preview:</p>
                            <div className="space-y-1">
                                {selectedBOM.items.map((item, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                        <span>{item.item_number} - {item.name}</span>
                                        <span className="text-muted-foreground">
                                            {item.quantity * data.quantity} {item.unit_of_measure}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Child orders will inherit the priority and requested date from this parent order
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}
            
            {/* New: Route Template Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Manufacturing Route</CardTitle>
                    <CardDescription>
                        Routes will be created per order after release
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <RadioGroup
                        value={data.route_creation_mode}
                        onValueChange={(value) => 
                            onChange({ ...data, route_creation_mode: value })
                        }
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manual" id="manual" />
                            <Label htmlFor="manual">Create routes manually after release</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="template" id="template" />
                            <Label htmlFor="template">Use route template</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="auto" id="auto" />
                            <Label htmlFor="auto">Auto-create from item category defaults</Label>
                        </div>
                    </RadioGroup>
                    
                    {data.route_creation_mode === 'template' && (
                        <ItemSelect
                            label="Route Template"
                            items={routeTemplates}
                            value={data.route_template_id}
                            onValueChange={(value) => 
                                onChange({ ...data, route_template_id: value })
                            }
                            placeholder="Select template..."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
```

### 1.2 Parent Order Status Card Enhancement

Update the order overview tab to show better parent-child relationships:

```tsx
function ParentOrderStatusCard({ order }) {
    const [expandedChildren, setExpandedChildren] = useState(false);
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Child Orders Status</CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedChildren(!expandedChildren)}
                    >
                        {expandedChildren ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold">{order.child_orders_count}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-500">
                            {order.child_orders_draft}
                        </p>
                        <p className="text-sm text-muted-foreground">Draft</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                            {order.child_orders_in_progress}
                        </p>
                        <p className="text-sm text-muted-foreground">In Progress</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                            {order.completed_child_orders_count}
                        </p>
                        <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                            {order.child_orders_cancelled}
                        </p>
                        <p className="text-sm text-muted-foreground">Cancelled</p>
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Overall Progress</span>
                        <span>{Math.round((order.completed_child_orders_count / order.child_orders_count) * 100)}%</span>
                    </div>
                    <Progress value={(order.completed_child_orders_count / order.child_orders_count) * 100} />
                </div>
                
                {/* Expanded Child List */}
                {expandedChildren && (
                    <div className="mt-4 space-y-2 max-h-64 overflow-auto">
                        {order.children.map((child) => (
                            <ChildOrderRow key={child.id} order={child} />
                        ))}
                    </div>
                )}
                
                {order.auto_complete_on_children && (
                    <Alert className="mt-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            This order will auto-complete when all child orders are finished
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
```

## 2. Manufacturing Route Management Updates

### 2.1 Route Creation Interface

Since routes are now tied to orders, update the route builder:

```tsx
function ManufacturingRouteBuilder({ order, route, routeTemplates }) {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showTemplateSelector, setShowTemplateSelector] = useState(!route);
    
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="h-[calc(100vh-8rem)] flex flex-col">
                {/* Header with Order Context */}
                <div className="p-4 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">
                                {route ? 'Edit' : 'Create'} Manufacturing Route
                            </h1>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span>Order: {order.order_number}</span>
                                <Badge variant="outline">{order.status}</Badge>
                                <span>Item: {order.item.item_number}</span>
                                <span>Qty: {order.quantity} {order.unit_of_measure}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!route && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowTemplateSelector(true)}
                                >
                                    <FileTemplate className="h-4 w-4 mr-2" />
                                    Use Template
                                </Button>
                            )}
                            <Button>
                                <Save className="h-4 w-4 mr-2" />
                                Save Route
                            </Button>
                        </div>
                    </div>
                </div>
                
                {/* Template Selection Dialog */}
                {showTemplateSelector && (
                    <RouteTemplateSelector
                        templates={routeTemplates}
                        itemCategory={order.item.category}
                        onSelect={(template) => {
                            setSelectedTemplate(template);
                            setShowTemplateSelector(false);
                            applyTemplate(template);
                        }}
                        onClose={() => setShowTemplateSelector(false)}
                    />
                )}
                
                {/* Rest of the route builder interface... */}
            </div>
        </AppLayout>
    );
}
```

### 2.2 Route List for Order

New component to show all routes for an order:

```tsx
function OrderRoutesTab({ order }) {
    const [routes, setRoutes] = useState(order.manufacturing_routes || []);
    
    return (
        <div className="space-y-6 py-6">
            {routes.length === 0 ? (
                <EmptyState
                    icon={<Workflow className="h-12 w-12" />}
                    title="No Routes Created"
                    description="Create manufacturing routes for this order after release"
                    action={
                        order.status === 'released' && (
                            <Button asChild>
                                <Link href={`/production/orders/${order.id}/routes/create`}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Route
                                </Link>
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="space-y-4">
                    {routes.map((route) => (
                        <RouteCard key={route.id} route={route} order={order} />
                    ))}
                </div>
            )}
        </div>
    );
}

function RouteCard({ route, order }) {
    const totalSteps = route.steps.length;
    const completedSteps = route.steps.filter(s => s.status === 'completed').length;
    const inProgressSteps = route.steps.filter(s => s.status === 'in_progress').length;
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{route.name}</CardTitle>
                        <CardDescription>
                            {route.description || `Manufacturing route for ${order.item.name}`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={route.is_active ? 'default' : 'secondary'}>
                            {route.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem asChild>
                                    <Link href={`/production/routes/${route.id}/edit`}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Route
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/production/routes/${route.id}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={() => handleDuplicate(route)}
                                    className="text-muted-foreground"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Progress Overview */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span>Step Progress</span>
                            <span>{completedSteps} of {totalSteps} completed</span>
                        </div>
                        <Progress value={(completedSteps / totalSteps) * 100} />
                    </div>
                    
                    {/* Step Status Summary */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 border rounded">
                            <p className="text-lg font-semibold">{totalSteps}</p>
                            <p className="text-xs text-muted-foreground">Total Steps</p>
                        </div>
                        <div className="p-2 border rounded">
                            <p className="text-lg font-semibold text-yellow-600">
                                {route.steps.filter(s => s.status === 'queued').length}
                            </p>
                            <p className="text-xs text-muted-foreground">Queued</p>
                        </div>
                        <div className="p-2 border rounded">
                            <p className="text-lg font-semibold text-blue-600">
                                {inProgressSteps}
                            </p>
                            <p className="text-xs text-muted-foreground">In Progress</p>
                        </div>
                        <div className="p-2 border rounded">
                            <p className="text-lg font-semibold text-green-600">
                                {completedSteps}
                            </p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/production/routes/${route.id}/gantt`}>
                                <BarChart className="h-4 w-4 mr-2" />
                                View Timeline
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/production/routes/${route.id}/steps`}>
                                <List className="h-4 w-4 mr-2" />
                                Manage Steps
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
```

## 3. Enhanced Step Execution Interface

### 3.1 State Management UI

Enhanced step execution with proper state tracking:

```tsx
function ManufacturingStepExecution({ step, execution, order }) {
    const [status, setStatus] = useState(execution?.status || step.status);
    const [showHoldDialog, setShowHoldDialog] = useState(false);
    const [holdReason, setHoldReason] = useState('');
    const [executionTimes, setExecutionTimes] = useState({
        started: execution?.started_at,
        paused: execution?.on_hold_at,
        totalHoldDuration: execution?.total_hold_duration || 0
    });
    
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Enhanced Header with State Info */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-lg font-semibold">{step.name}</h1>
                        <div className="flex items-center gap-2">
                            <Badge variant={getStatusVariant(status)}>
                                {getStepStatusLabel(status)}
                            </Badge>
                            {status === 'in_progress' && (
                                <LiveTimer 
                                    startTime={executionTimes.started} 
                                    pausedDuration={executionTimes.totalHoldDuration}
                                />
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Order: {order.order_number}</span>
                        <span>Step {step.step_number} of {step.route.steps.length}</span>
                        {execution?.part_number && (
                            <span>Part {execution.part_number} of {execution.total_parts}</span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* State Transition Actions */}
            <div className="p-4 space-y-4">
                {/* Pending State */}
                {status === 'pending' && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            This step is waiting for dependencies to complete
                        </AlertDescription>
                    </Alert>
                )}
                
                {/* Queued State */}
                {status === 'queued' && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center space-y-4">
                                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                                <h3 className="text-lg font-semibold">Ready to Start</h3>
                                <p className="text-muted-foreground">
                                    All dependencies are complete. You can start this step.
                                </p>
                                <Button 
                                    size="lg" 
                                    className="w-full"
                                    onClick={() => handleStart()}
                                >
                                    <PlayCircle className="h-5 w-5 mr-2" />
                                    Start Step
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {/* In Progress State */}
                {status === 'in_progress' && (
                    <>
                        {/* Work Instructions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Work Instructions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose prose-sm max-w-none">
                                    {step.description || 'No specific instructions provided.'}
                                </div>
                                {step.work_cell && (
                                    <div className="mt-4 p-3 bg-muted rounded-lg">
                                        <p className="text-sm font-medium">Work Cell</p>
                                        <p className="text-sm text-muted-foreground">
                                            {step.work_cell.name} ({step.work_cell.code})
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        
                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button 
                                variant="outline"
                                onClick={() => setShowHoldDialog(true)}
                            >
                                <Pause className="h-5 w-5 mr-2" />
                                Put On Hold
                            </Button>
                            <Button 
                                onClick={() => handleComplete()}
                                disabled={step.form_id && !execution?.form_execution_id}
                            >
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Complete
                            </Button>
                        </div>
                    </>
                )}
                
                {/* On Hold State */}
                {status === 'on_hold' && (
                    <Card className="border-orange-200 bg-orange-50">
                        <CardContent className="p-6">
                            <div className="text-center space-y-4">
                                <PauseCircle className="h-12 w-12 text-orange-600 mx-auto" />
                                <h3 className="text-lg font-semibold">Step On Hold</h3>
                                {execution?.hold_reason && (
                                    <p className="text-sm text-muted-foreground">
                                        Reason: {execution.hold_reason}
                                    </p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                    On hold for: {formatDuration(executionTimes.totalHoldDuration)}
                                </p>
                                <Button 
                                    size="lg" 
                                    className="w-full"
                                    onClick={() => handleResume()}
                                >
                                    <PlayCircle className="h-5 w-5 mr-2" />
                                    Resume Step
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {/* Completed State */}
                {status === 'completed' && (
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-6">
                            <div className="text-center space-y-4">
                                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                                <h3 className="text-lg font-semibold">Step Completed</h3>
                                <p className="text-sm text-muted-foreground">
                                    Completed at: {formatDateTime(execution.completed_at)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Duration: {formatDuration(execution.duration)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {/* Hold Dialog */}
                <Dialog open={showHoldDialog} onOpenChange={setShowHoldDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Put Step On Hold</DialogTitle>
                            <DialogDescription>
                                Provide a reason for putting this step on hold
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Textarea
                                placeholder="Reason for hold..."
                                value={holdReason}
                                onChange={(e) => setHoldReason(e.target.value)}
                                rows={3}
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowHoldDialog(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={() => handleHold(holdReason)}>
                                    Confirm Hold
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
```

## 4. Quality Check Interface

### 4.1 Enhanced Quality Check Execution

```tsx
function QualityCheckExecution({ step, execution, order }) {
    const [checkMode, setCheckMode] = useState(step.quality_check_mode);
    const [currentPart, setCurrentPart] = useState(1);
    const [results, setResults] = useState([]);
    const [showFailureDialog, setShowFailureDialog] = useState(false);
    const [failedPart, setFailedPart] = useState(null);
    
    const totalParts = checkMode === 'sampling' ? 
        step.sampling_size : 
        (checkMode === 'every_part' ? order.quantity : 1);
    
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-semibold flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-blue-600" />
                                Quality Check: {step.name}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Mode: {getQualityModeLabel(checkMode)}
                            </p>
                        </div>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                            {checkMode === 'entire_lot' ? 
                                'Lot Check' : 
                                `Part ${currentPart} of ${totalParts}`
                            }
                        </Badge>
                    </div>
                </div>
            </div>
            
            {/* Quality Check Interface */}
            <div className="p-4 space-y-4">
                {/* Instructions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Inspection Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {step.quality_criteria?.map((criterion, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{criterion.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {criterion.description}
                                        </p>
                                        {criterion.specification && (
                                            <p className="text-sm mt-1">
                                                <span className="font-medium">Spec:</span> {criterion.specification}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                
                {/* Associated Form */}
                {step.form_id && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Inspection Form</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormExecution
                                formId={step.form_id}
                                executionContext={{
                                    type: 'quality_check',
                                    manufacturing_step_execution_id: execution.id,
                                    part_number: currentPart,
                                    total_parts: totalParts
                                }}
                                onComplete={(formData) => handleFormComplete(formData)}
                            />
                        </CardContent>
                    </Card>
                )}
                
                {/* Result Recording */}
                <Card>
                    <CardHeader>
                        <CardTitle>Record Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-24 border-green-200 hover:bg-green-50"
                                onClick={() => handlePass()}
                            >
                                <div className="text-center">
                                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                    <span className="font-medium">Pass</span>
                                </div>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-24 border-red-200 hover:bg-red-50"
                                onClick={() => {
                                    setFailedPart(currentPart);
                                    setShowFailureDialog(true);
                                }}
                            >
                                <div className="text-center">
                                    <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                                    <span className="font-medium">Fail</span>
                                </div>
                            </Button>
                        </div>
                        
                        {/* Results Summary */}
                        {results.length > 0 && (
                            <div className="border rounded-lg p-3 bg-muted/20">
                                <p className="text-sm font-medium mb-2">Results Summary:</p>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-green-600">
                                        Pass: {results.filter(r => r.result === 'pass').length}
                                    </span>
                                    <span className="text-red-600">
                                        Fail: {results.filter(r => r.result === 'fail').length}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                {/* Navigation for Multi-Part Checks */}
                {checkMode !== 'entire_lot' && currentPart < totalParts && (
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPart(currentPart - 1)}
                            disabled={currentPart === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Previous Part
                        </Button>
                        <Button
                            onClick={() => setCurrentPart(currentPart + 1)}
                            disabled={!results[currentPart - 1]}
                        >
                            Next Part
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                )}
                
                {/* Complete Quality Check */}
                {((checkMode === 'entire_lot' && results.length > 0) || 
                  (checkMode !== 'entire_lot' && results.length === totalParts)) && (
                    <Button size="lg" className="w-full" onClick={() => handleCompleteQualityCheck()}>
                        Complete Quality Check
                    </Button>
                )}
            </div>
            
            {/* Failure Handling Dialog */}
            <FailureHandlingDialog
                open={showFailureDialog}
                onOpenChange={setShowFailureDialog}
                failedPart={failedPart}
                onAction={(action, details) => {
                    handleFailure(failedPart, action, details);
                    setShowFailureDialog(false);
                }}
            />
        </div>
    );
}
```

### 4.2 Failure Handling Dialog

```tsx
function FailureHandlingDialog({ open, onOpenChange, failedPart, onAction }) {
    const [action, setAction] = useState('');
    const [failureMode, setFailureMode] = useState('');
    const [immediateCause, setImmediateCause] = useState('');
    const [rootCause, setRootCause] = useState('');
    const [notes, setNotes] = useState('');
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Quality Check Failed</DialogTitle>
                    <DialogDescription>
                        {failedPart ? `Part ${failedPart} failed quality check` : 'Quality check failed'}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                    {/* Failure Action */}
                    <div className="space-y-3">
                        <Label>Action Required</Label>
                        <RadioGroup value={action} onValueChange={setAction}>
                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="rework" id="rework" />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="rework" className="font-normal cursor-pointer">
                                        Send for Rework
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Item will be sent to rework station for correction
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-2">
                                <RadioGroupItem value="scrap" id="scrap" />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="scrap" className="font-normal cursor-pointer">
                                        Scrap Item
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Item cannot be reworked and will be scrapped
                                    </p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>
                    
                    {/* Failure Analysis */}
                    <Separator />
                    <div className="space-y-4">
                        <h4 className="font-medium">Failure Analysis</h4>
                        
                        <ItemSelect
                            label="Failure Mode"
                            items={failureModes}
                            value={failureMode}
                            onValueChange={setFailureMode}
                            placeholder="Select failure mode..."
                            required
                        />
                        
                        <ItemSelect
                            label="Immediate Cause"
                            items={immediateCauses}
                            value={immediateCause}
                            onValueChange={setImmediateCause}
                            placeholder="Select immediate cause..."
                        />
                        
                        <ItemSelect
                            label="Root Cause"
                            items={rootCauses}
                            value={rootCause}
                            onValueChange={setRootCause}
                            placeholder="Select root cause..."
                        />
                        
                        <div>
                            <Label htmlFor="notes">Additional Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Describe the issue in detail..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={() => onAction(action, {
                            failureMode,
                            immediateCause,
                            rootCause,
                            notes
                        })}
                        disabled={!action || !failureMode}
                    >
                        Submit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

## 5. Permission-Based UI Adaptations

### 5.1 Role-Based Navigation

Update the main navigation to show only permitted sections:

```tsx
function ProductionNavigation({ user }) {
    const permissions = usePermissions(user);
    
    const navigationItems = [
        {
            label: 'Items',
            href: '/production/items',
            icon: <Package className="h-4 w-4" />,
            visible: permissions.canAny(['production.items.viewAny']),
        },
        {
            label: 'BOMs',
            href: '/production/bom',
            icon: <GitBranch className="h-4 w-4" />,
            visible: permissions.canAny(['production.bom.manage', 'production.items.viewAny']),
        },
        {
            label: 'Manufacturing Orders',
            href: '/production/orders',
            icon: <Factory className="h-4 w-4" />,
            visible: permissions.canAny(['production.orders.viewAny']),
        },
        {
            label: 'Routes & Steps',
            href: '/production/routes',
            icon: <Workflow className="h-4 w-4" />,
            visible: permissions.canAny(['production.routes.viewAny', 'production.steps.viewAny']),
        },
        {
            label: 'Planning',
            href: '/production/planning',
            icon: <Calendar className="h-4 w-4" />,
            visible: permissions.hasRole(['production-manager', 'production-planner']),
        },
        {
            label: 'Tracking',
            href: '/production/tracking',
            icon: <Activity className="h-4 w-4" />,
            visible: permissions.canAny(['production.steps.execute', 'production.orders.viewAny']),
        },
        {
            label: 'Quality Control',
            href: '/production/quality',
            icon: <ShieldCheck className="h-4 w-4" />,
            visible: permissions.canAny(['production.quality.executeCheck']),
        },
        {
            label: 'Shipments',
            href: '/production/shipments',
            icon: <Truck className="h-4 w-4" />,
            visible: permissions.canAny(['production.shipments.viewAny']),
        },
    ];
    
    return (
        <nav className="space-y-1">
            {navigationItems
                .filter(item => item.visible)
                .map((item) => (
                    <NavLink key={item.href} {...item} />
                ))}
        </nav>
    );
}
```

### 5.2 Work Cell Based Access

For machine operators, show only their assigned work cells:

```tsx
function WorkCellDashboard({ user }) {
    const [assignedWorkCells, setAssignedWorkCells] = useState([]);
    const [activeSteps, setActiveSteps] = useState([]);
    
    useEffect(() => {
        if (user.hasRole('machine-operator')) {
            // Load only assigned work cells
            fetchAssignedWorkCells(user.id).then(setAssignedWorkCells);
        } else {
            // Load all work cells for supervisors/managers
            fetchAllWorkCells().then(setAssignedWorkCells);
        }
    }, [user]);
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedWorkCells.map((workCell) => (
                <WorkCellCard
                    key={workCell.id}
                    workCell={workCell}
                    canExecute={user.can('production.steps.execute')}
                    canViewDetails={user.can('production.steps.view')}
                />
            ))}
        </div>
    );
}
```

### 5.3 Entity-Scoped Filtering

Add scope-aware filtering to lists:

```tsx
function ManufacturingOrderList({ user }) {
    const [scopeFilter, setScopeFilter] = useState('all');
    const [orders, setOrders] = useState([]);
    
    // Determine available scopes based on permissions
    const availableScopes = useMemo(() => {
        const scopes = [];
        
        // Check plant-level permissions
        const plantPermissions = user.permissions.filter(p => 
            p.startsWith('production.orders.viewAny.plant.')
        );
        
        plantPermissions.forEach(permission => {
            const plantId = permission.split('.').pop();
            scopes.push({ type: 'plant', id: plantId, label: `Plant ${plantId}` });
        });
        
        // Similar for area and sector...
        
        return scopes;
    }, [user.permissions]);
    
    return (
        <ListLayout
            title="Manufacturing Orders"
            filters={
                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by scope" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Permitted</SelectItem>
                        {availableScopes.map((scope) => (
                            <SelectItem key={`${scope.type}-${scope.id}`} value={`${scope.type}-${scope.id}`}>
                                {scope.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            }
        >
            {/* Order list... */}
        </ListLayout>
    );
}
```

## 6. Additional UI Components

### 6.1 Route Template Manager

New page for managing reusable route templates:

```tsx
function RouteTemplateManager() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ListLayout
                title="Route Templates"
                description="Manage reusable manufacturing route templates"
                createRoute="/production/route-templates/create"
                createButtonText="New Template"
            >
                <EntityDataTable
                    data={templates}
                    columns={templateColumns}
                    onRowClick={(template) => router.visit(`/production/route-templates/${template.id}`)}
                    actions={(template) => (
                        <EntityActionDropdown
                            onEdit={() => router.visit(`/production/route-templates/${template.id}/edit`)}
                            onDelete={() => handleDelete(template)}
                            additionalActions={[
                                {
                                    label: 'Preview',
                                    icon: <Eye className="h-4 w-4" />,
                                    onClick: () => setPreviewTemplate(template)
                                },
                                {
                                    label: 'Duplicate',
                                    icon: <Copy className="h-4 w-4" />,
                                    onClick: () => handleDuplicate(template)
                                },
                                {
                                    label: 'Export',
                                    icon: <Download className="h-4 w-4" />,
                                    onClick: () => handleExport(template)
                                }
                            ]}
                        />
                    )}
                />
            </ListLayout>
        </AppLayout>
    );
}
```

### 6.2 Manufacturing Analytics Dashboard

Enhanced analytics with order hierarchy insights:

```tsx
function ManufacturingAnalytics() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="p-6 space-y-6">
                {/* Parent Order Completion Rates */}
                <Card>
                    <CardHeader>
                        <CardTitle>Parent Order Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MetricCard
                                title="Auto-Complete Rate"
                                value="87%"
                                description="Parent orders completing via children"
                                icon={<GitBranch className="h-4 w-4" />}
                            />
                            <MetricCard
                                title="Avg Child Orders"
                                value="12.4"
                                description="Average child orders per parent"
                                icon={<Layers className="h-4 w-4" />}
                            />
                            <MetricCard
                                title="Cascade Efficiency"
                                value="94%"
                                description="Child completion synchronization"
                                icon={<Zap className="h-4 w-4" />}
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Quality Metrics */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quality Control Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <QualityMetricsChart
                            data={qualityData}
                            showReworkTrends
                            showFailureModes
                        />
                    </CardContent>
                </Card>
                
                {/* Route Efficiency */}
                <Card>
                    <CardHeader>
                        <CardTitle>Route Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RouteEfficiencyMatrix
                            routes={routeData}
                            groupBy="template"
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
```

## 7. Mobile-Specific Enhancements

### 7.1 Simplified Step State Management

Mobile-optimized state transitions:

```tsx
function MobileStepExecution({ step, execution }) {
    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Simplified Header */}
            <div className="bg-primary text-white p-4">
                <h1 className="text-lg font-medium">{step.name}</h1>
                <p className="text-sm opacity-90">Step {step.step_number}</p>
            </div>
            
            {/* Large State Indicator */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-6">
                    <StatusIcon status={execution.status} size="large" />
                    
                    {/* Single Action Button */}
                    {execution.status === 'queued' && (
                        <Button size="lg" className="w-full max-w-xs h-16 text-lg">
                            <PlayCircle className="h-6 w-6 mr-3" />
                            Start
                        </Button>
                    )}
                    
                    {execution.status === 'in_progress' && (
                        <div className="space-y-3">
                            <Button size="lg" className="w-full max-w-xs h-16 text-lg">
                                <CheckCircle className="h-6 w-6 mr-3" />
                                Complete
                            </Button>
                            <Button size="lg" variant="outline" className="w-full max-w-xs">
                                <Pause className="h-5 w-5 mr-2" />
                                Hold
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Bottom Action Bar */}
            <div className="bg-white border-t p-4">
                <div className="flex justify-around">
                    <Button variant="ghost" size="sm">
                        <Info className="h-5 w-5" />
                        <span className="sr-only">Info</span>
                    </Button>
                    <Button variant="ghost" size="sm">
                        <FileText className="h-5 w-5" />
                        <span className="sr-only">Form</span>
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Camera className="h-5 w-5" />
                        <span className="sr-only">Photo</span>
                    </Button>
                    <Button variant="ghost" size="sm">
                        <MessageSquare className="h-5 w-5" />
                        <span className="sr-only">Note</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
```

## 8. System Integration Points

### 8.1 Form Integration Enhancement

Update form execution to include manufacturing context:

```tsx
function FormExecutionWithManufacturingContext({ 
    formId, 
    manufacturingStepExecutionId,
    onComplete 
}) {
    const { form, tasks } = useForm(formId);
    const [responses, setResponses] = useState({});
    
    const handleSubmit = async () => {
        const formExecution = await createFormExecution({
            form_id: formId,
            form_version_id: form.current_version_id,
            manufacturing_step_execution_id: manufacturingStepExecutionId,
            responses: responses
        });
        
        onComplete(formExecution);
    };
    
    return (
        <div className="space-y-4">
            {/* Manufacturing Context Header */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    This form is part of the manufacturing process. 
                    All responses will be linked to the current production order.
                </AlertDescription>
            </Alert>
            
            {/* Form Tasks */}
            {tasks.map((task) => (
                <TaskInput
                    key={task.id}
                    task={task}
                    value={responses[task.id]}
                    onChange={(value) => setResponses({
                        ...responses,
                        [task.id]: value
                    })}
                />
            ))}
            
            <Button onClick={handleSubmit} className="w-full">
                Submit Form
            </Button>
        </div>
    );
}
```

## Implementation Priority

1. **Critical** - Manufacturing Order parent-child UI
2. **Critical** - Route-to-Order association interfaces
3. **Critical** - Step state management UI
4. **High** - Quality check and rework interfaces
5. **High** - Permission-based filtering and access
6. **Medium** - Route template management
7. **Medium** - Enhanced analytics dashboards
8. **Low** - Mobile optimizations

This augmentation plan ensures the UI fully supports the new manufacturing order system architecture while maintaining consistency with the existing design system.