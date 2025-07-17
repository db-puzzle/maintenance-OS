# Parts CRUD Implementation Plan

## Overview
This document outlines the implementation plan for the Parts administration module, following the same patterns and conventions established in the Plant module.

## Important Migration Considerations

### Table Conflict Resolution
Currently, there are two parts-related tables in the system:
1. `inventory_parts` table (created 2024_12_20) - older placeholder table
2. `parts` table (created 2025_07_14) - newer, more complete implementation

The `work_order_parts` table currently references `inventory_parts`. We need to:
1. Create a migration to update the foreign key constraint from `inventory_parts` to `parts`
2. Migrate any existing data from `inventory_parts` to `parts` (if any exists)
3. Drop the `inventory_parts` table

### Migration Steps Required:
```php
// New migration: 2025_XX_XX_migrate_inventory_parts_to_parts.php
1. Copy data from inventory_parts to parts (if any)
2. Drop foreign key constraint on work_order_parts.part_id
3. Add new foreign key constraint to parts table
4. Drop inventory_parts table
```

### Model Updates Required:
1. Update `WorkOrderPart` model to include relationship to `Part`:
```php
public function part(): BelongsTo
{
    return $this->belongsTo(\App\Models\Part::class);
}
```

2. Update `Part` model to include relationship to `WorkOrderPart`:
```php
public function workOrderParts(): HasMany
{
    return $this->hasMany(\App\Models\WorkOrders\WorkOrderPart::class);
}
```

## Database Structure
The Parts table is already created with migration `2025_07_14_111246_create_parts_table.php` containing:
- `id`
- `part_number` (unique)
- `name`
- `description`
- `unit_cost`
- `available_quantity`
- `minimum_quantity`
- `maximum_quantity`
- `location`
- `supplier`
- `manufacturer`
- `active`
- `timestamps`

## Backend Implementation

### 1. Controller Structure
Create `app/Http/Controllers/Parts/PartsController.php` with the following methods:

#### Methods to Implement:
- `index()` - List all parts with filtering, sorting, and pagination
- `store()` - Create a new part
- `show()` - Display a single part (JSON response for modal/sheet)
- `update()` - Update an existing part
- `destroy()` - Delete a part
- `checkDependencies()` - Check if part has dependencies before deletion

#### Key Features:
- Search functionality (by part_number, name, supplier, manufacturer)
- Sorting by all columns
- Pagination (default 8 per page)
- Permission-based filtering (following Plant pattern)
- Dependency checking before deletion

### 2. Routes
Add to `routes/parts.php` (new file):
```php
Route::middleware(['auth'])->group(function () {
    // Parts Management
    Route::get('parts', [PartsController::class, 'index'])->name('parts.index');
    Route::post('parts', [PartsController::class, 'store'])->name('parts.store');
    Route::get('parts/{part}', [PartsController::class, 'show'])->name('parts.show');
    Route::put('parts/{part}', [PartsController::class, 'update'])->name('parts.update');
    Route::delete('parts/{part}', [PartsController::class, 'destroy'])->name('parts.destroy');
    Route::get('parts/{part}/check-dependencies', [PartsController::class, 'checkDependencies'])->name('parts.check-dependencies');
});
```

### 3. Policy
Create `app/Policies/PartPolicy.php`:
- `viewAny()` - Check if user can view parts list
- `view()` - Check if user can view specific part
- `create()` - Check if user can create parts
- `update()` - Check if user can update specific part
- `delete()` - Check if user can delete specific part

### 4. Permissions
Add to permission system:
- `parts.viewAny` - View parts list
- `parts.view` - View part details
- `parts.create` - Create new parts
- `parts.update` - Update parts
- `parts.delete` - Delete parts

## Frontend Implementation

### 1. Pages Structure

#### `resources/js/pages/parts/index.tsx`
Main listing page following Plant index pattern:
- **EntityDataTable** for displaying parts
  ```tsx
  <EntityDataTable
      data={parts.data}
      columns={columns}
      loading={loading}
      onRowClick={(part) => router.visit(route('parts.show', part.id))}
      columnVisibility={columnVisibility}
      onSort={handleSort}
      actions={(part) => (
          <EntityActionDropdown 
              onEdit={() => handleEdit(part)} 
              onDelete={() => handleDelete(part)} 
          />
      )}
  />
  ```
- Search functionality with debounce
- Column visibility toggle using ColumnVisibility component
- Sorting capabilities via useSorting hook
- **EntityPagination** component
  ```tsx
  <EntityPagination 
      pagination={pagination} 
      onPageChange={handlePageChange} 
      onPerPageChange={handlePerPageChange} 
  />
  ```
- **EntityActionDropdown** in each row
- **CreatePartSheet** integration for create/edit
- **EntityDeleteDialog** for delete confirmation
  ```tsx
  <EntityDeleteDialog
      open={isDeleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      entityLabel={deletingPart?.name || ''}
      onConfirm={confirmDelete}
  />
  ```
- **EntityDependenciesDialog** for dependency checking
  ```tsx
  <EntityDependenciesDialog
      open={isDependenciesDialogOpen}
      onOpenChange={setDependenciesDialogOpen}
      entityName="peça"
      dependencies={dependencies}
  />
  ```
- Use `useEntityOperations` hook for standard CRUD operations

#### `resources/js/pages/parts/show.tsx`
Detail view page with tabs:
- **Informações Gerais** - Part details (view/edit mode)
- **Estoque** - Stock information and history
- **Ordens de Serviço** - Work orders using this part
- **Histórico** - Usage history and movements

### 2. Components

#### `resources/js/components/CreatePartSheet.tsx`
Sheet component for creating/editing parts:
- Form validation
- All fields from Part model
- Support for both create and edit modes
- Stay option for continuous creation

#### `resources/js/components/PartFormComponent.tsx`
Reusable form component:
- View/Edit modes
- Form validation
- Field masks (cost, quantities)
- Active/Inactive toggle

### 3. Shared Components Usage
Leverage existing shared components [[memory:3200929]]:
- `@EntityDataTable.tsx` - For parts listing
  - Pass columns configuration with sorting support
  - Handle row clicks to navigate to detail page
  - Support column visibility toggle
- `@EntityActionDropdown.tsx` - For row actions
  - Edit action to open CreatePartSheet
  - Delete action to trigger deletion flow
- `@EntityPagination.tsx` - For pagination
  - Handle page changes
  - Support per-page selection (10, 20, 30, 50, 100)
- `@EntityDeleteDialog.tsx` - For delete confirmation
  - Require user to type "EXCLUIR" to confirm
  - Show loading state during deletion
- `@EntityDependenciesDialog.tsx` - For showing dependencies
  - Display work orders using the part
  - Show count and list of dependent items
  - Prevent deletion if dependencies exist

### 4. UI Specifications
- Use shadcn components throughout
- Lucide icons for consistency
- Follow existing color schemes and spacing

## Permissions and Role Updates

### Update PermissionSeeder.php
Add the following permissions to the seeder:

```php
// Parts management permissions
$partsPermissions = [
    [
        'name' => 'parts.viewAny',
        'display_name' => 'View Parts List',
        'description' => 'View list of all parts',
        'sort_order' => 60
    ],
    [
        'name' => 'parts.view',
        'display_name' => 'View Part Details',
        'description' => 'View part details',
        'sort_order' => 61
    ],
    [
        'name' => 'parts.create',
        'display_name' => 'Create Parts',
        'description' => 'Create new parts',
        'sort_order' => 62
    ],
    [
        'name' => 'parts.update',
        'display_name' => 'Update Parts',
        'description' => 'Update part information',
        'sort_order' => 63
    ],
    [
        'name' => 'parts.delete',
        'display_name' => 'Delete Parts',
        'description' => 'Delete parts',
        'sort_order' => 64
    ],
    [
        'name' => 'parts.manage-stock',
        'display_name' => 'Manage Parts Stock',
        'description' => 'Adjust part quantities and stock levels',
        'sort_order' => 65
    ]
];
```

### Update RoleSeeder.php
Add parts permissions to appropriate roles:

1. **Administrator** - Automatically gets all permissions

2. **Plant Manager** - Add to plantManagerPermissions:
   ```php
   'parts.viewAny',
   'parts.view',
   'parts.create',
   'parts.update',
   'parts.delete',
   'parts.manage-stock',
   ```

3. **Maintenance Supervisor** - Add to maintenanceSupervisorPermissions:
   ```php
   'parts.viewAny',
   'parts.view',
   'parts.create',
   'parts.update',
   'parts.delete',
   'parts.manage-stock',
   ```

4. **Planner** - Add to plannerPermissions:
   ```php
   'parts.viewAny',
   'parts.view',
   'parts.create',
   'parts.update',
   'parts.delete',
   'parts.manage-stock',
   ```

5. **Technician** - Add to technicianPermissions:
   ```php
   'parts.viewAny',
   'parts.view',
   ```

6. **Viewer** - Add to viewerPermissions:
   ```php
   'parts.viewAny',
   'parts.view',
   ```

## Data Table Columns

| Column | Label | Sortable | Visibility | Format |
|--------|-------|----------|------------|--------|
| part_number | Número da Peça | Yes | Always | Text |
| name | Nome | Yes | Default | Text with description subtitle |
| unit_cost | Custo Unitário | Yes | Default | Currency (R$) |
| available_quantity | Qtd. Disponível | Yes | Default | Number with low stock indicator |
| minimum_quantity | Qtd. Mínima | Yes | Optional | Number |
| location | Localização | Yes | Default | Text |
| supplier | Fornecedor | Yes | Default | Text |
| manufacturer | Fabricante | Yes | Optional | Text |
| active | Status | Yes | Default | Badge (Ativo/Inativo) |

## Search Functionality
Search should filter by:
- Part number (partial match)
- Name (partial match)
- Supplier (partial match)
- Manufacturer (partial match)
- Location (partial match)

## Dependency Checking
Before deletion, check for:
- Work order parts (work_order_parts table)
- Active routines requiring this part
- Any other future relationships

## Deletion Prevention and Part Substitution

### Overview
Following the same pattern as the shift update mechanism, the parts deletion system will:

1. **Check Dependencies** - Before deletion, check if the part is used in any work orders
2. **Prevent Direct Deletion** - If dependencies exist, prevent deletion and show substitution dialog
3. **Offer Substitution Options**:
   - **Replace All** - Replace the part in all dependent work orders
   - **Replace Selected** - Choose specific work orders to update
4. **Maintain History** - Add notes to work order parts tracking the substitution
5. **Complete Deletion** - After substitution, delete the part if no dependencies remain

This provides a user-friendly way to handle part deletions without breaking existing work orders, similar to how shift updates handle affected assets.

### Backend Implementation

#### 1. Update PartsController
Add methods for handling deletion with substitution:

```php
public function checkDependencies(Part $part)
{
    $workOrderParts = $part->workOrderParts()
        ->with(['workOrder' => function($q) {
            $q->select('id', 'title', 'status');
        }])
        ->take(5)
        ->get();
    
    $totalWorkOrderParts = $part->workOrderParts()->count();
    
    $canDelete = $totalWorkOrderParts === 0;
    
    return response()->json([
        'can_delete' => $canDelete,
        'dependencies' => [
            'work_orders' => [
                'total' => $totalWorkOrderParts,
                'items' => $workOrderParts->map(function($wop) {
                    return [
                        'id' => $wop->workOrder->id,
                        'title' => $wop->workOrder->title,
                        'status' => $wop->workOrder->status,
                        'quantity' => $wop->estimated_quantity
                    ];
                })
            ]
        ]
    ]);
}

public function substituteAndDelete(Request $request, Part $part)
{
    $validated = $request->validate([
        'substitute_part_id' => 'required|exists:parts,id|different:id,' . $part->id,
        'update_mode' => 'required|in:all,selected',
        'selected_work_order_ids' => 'required_if:update_mode,selected|array',
        'selected_work_order_ids.*' => 'exists:work_orders,id'
    ]);
    
    return DB::transaction(function() use ($part, $validated) {
        $substitutePart = Part::findOrFail($validated['substitute_part_id']);
        
        if ($validated['update_mode'] === 'all') {
            // Update all work order parts
            WorkOrderPart::where('part_id', $part->id)
                ->update([
                    'part_id' => $substitutePart->id,
                    'part_number' => $substitutePart->part_number,
                    'part_name' => $substitutePart->name,
                    'unit_cost' => $substitutePart->unit_cost,
                    'notes' => DB::raw("CONCAT(COALESCE(notes, ''), '\nPeça substituída de {$part->part_number} para {$substitutePart->part_number} em ', NOW())")
                ]);
        } else {
            // Update only selected work orders
            WorkOrderPart::where('part_id', $part->id)
                ->whereIn('work_order_id', $validated['selected_work_order_ids'])
                ->update([
                    'part_id' => $substitutePart->id,
                    'part_number' => $substitutePart->part_number,
                    'part_name' => $substitutePart->name,
                    'unit_cost' => $substitutePart->unit_cost,
                    'notes' => DB::raw("CONCAT(COALESCE(notes, ''), '\nPeça substituída de {$part->part_number} para {$substitutePart->part_number} em ', NOW())")
                ]);
        }
        
        // Check if part can now be deleted
        if ($part->workOrderParts()->count() === 0) {
            $part->delete();
            return response()->json([
                'success' => true,
                'message' => 'Peça substituída e excluída com sucesso'
            ]);
        } else {
            return response()->json([
                'success' => true,
                'message' => 'Peça substituída nos itens selecionados',
                'remaining_dependencies' => $part->workOrderParts()->count()
            ]);
        }
    });
}
```

### Frontend Implementation

#### 1. Create PartSubstitutionDialog Component
`resources/js/components/parts/PartSubstitutionDialog.tsx`:

```tsx
interface PartSubstitutionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    part: Part;
    dependencies: DependencyResult;
    availableParts: Part[];
    onConfirm: (substitutePart: Part, updateMode: 'all' | 'selected', selectedIds: number[]) => void;
}

export function PartSubstitutionDialog({ 
    open, 
    onOpenChange, 
    part, 
    dependencies, 
    availableParts,
    onConfirm 
}: PartSubstitutionDialogProps) {
    const [substitutePart, setSubstitutePart] = useState<Part | null>(null);
    const [updateMode, setUpdateMode] = useState<'all' | 'selected'>('all');
    const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);
    
    // Filter out the current part from available substitutes
    const substituteParts = availableParts.filter(p => p.id !== part.id);
    
    const workOrders = dependencies.dependencies.work_orders?.items || [];
    
    const handleConfirm = async () => {
        if (!substitutePart) return;
        
        setProcessing(true);
        try {
            await onConfirm(
                substitutePart, 
                updateMode, 
                updateMode === 'all' ? [] : selectedWorkOrderIds
            );
            onOpenChange(false);
        } finally {
            setProcessing(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Substituir Peça Antes de Excluir
                    </DialogTitle>
                    <DialogDescription>
                        A peça "{part.name}" está sendo usada em {workOrders.length} ordem(ns) de serviço.
                        Selecione uma peça substituta antes de excluir.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                    {/* Part selection */}
                    <div>
                        <Label>Peça Substituta</Label>
                        <Select
                            value={substitutePart?.id.toString()}
                            onValueChange={(value) => {
                                const selected = substituteParts.find(p => p.id.toString() === value);
                                setSubstitutePart(selected || null);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma peça para substituir" />
                            </SelectTrigger>
                            <SelectContent>
                                {substituteParts.map((p) => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{p.part_number}</span>
                                            <span className="text-muted-foreground">- {p.name}</span>
                                            {p.available_quantity < p.minimum_quantity && (
                                                <Badge variant="destructive" className="ml-2">
                                                    Estoque Baixo
                                                </Badge>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {/* Update mode selection */}
                    <div className="space-y-3">
                        <Label>Modo de Atualização</Label>
                        <RadioGroup value={updateMode} onValueChange={(v) => setUpdateMode(v as 'all' | 'selected')}>
                            <div className="flex items-start space-x-3">
                                <RadioGroupItem value="all" id="update-all" />
                                <label htmlFor="update-all" className="cursor-pointer">
                                    <div className="font-medium">Substituir em todas as ordens</div>
                                    <div className="text-sm text-muted-foreground">
                                        A peça será substituída em todas as {workOrders.length} ordens de serviço
                                    </div>
                                </label>
                            </div>
                            
                            <div className="flex items-start space-x-3">
                                <RadioGroupItem value="selected" id="update-selected" />
                                <label htmlFor="update-selected" className="cursor-pointer">
                                    <div className="font-medium">Substituir apenas nas ordens selecionadas</div>
                                    <div className="text-sm text-muted-foreground">
                                        Escolha quais ordens terão a peça substituída
                                    </div>
                                </label>
                            </div>
                        </RadioGroup>
                    </div>
                    
                    {/* Work order selection (when mode is 'selected') */}
                    {updateMode === 'selected' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Ordens de Serviço</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        if (selectedWorkOrderIds.length === workOrders.length) {
                                            setSelectedWorkOrderIds([]);
                                        } else {
                                            setSelectedWorkOrderIds(workOrders.map(wo => wo.id));
                                        }
                                    }}
                                >
                                    {selectedWorkOrderIds.length === workOrders.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                                </Button>
                            </div>
                            
                            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                                {workOrders.map((wo) => (
                                    <label
                                        key={wo.id}
                                        className="flex items-center space-x-3 p-2 hover:bg-accent rounded cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={selectedWorkOrderIds.includes(wo.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedWorkOrderIds([...selectedWorkOrderIds, wo.id]);
                                                } else {
                                                    setSelectedWorkOrderIds(selectedWorkOrderIds.filter(id => id !== wo.id));
                                                }
                                            }}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">#{wo.id} - {wo.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Quantidade: {wo.quantity} | Status: {wo.status}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Warning message */}
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            As ordens de serviço serão atualizadas automaticamente para usar a nova peça.
                            Um registro será adicionado ao histórico de cada ordem afetada.
                        </AlertDescription>
                    </Alert>
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!substitutePart || (updateMode === 'selected' && selectedWorkOrderIds.length === 0) || processing}
                    >
                        {processing ? 'Processando...' : 'Substituir e Excluir'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

#### 2. Update Parts Index Page

In `resources/js/pages/parts/index.tsx`, update the `useEntityOperations` usage:

```tsx
const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false);
const [availableParts, setAvailableParts] = useState<Part[]>([]);

// Update the handleDelete function in useEntityOperations
const entityOps = useEntityOperations<Part>({
    entityName: 'part',
    entityLabel: 'Peça',
    routes: {
        index: 'parts.index',
        show: 'parts.show',
        destroy: 'parts.destroy',
        checkDependencies: 'parts.check-dependencies',
    },
    onDependenciesFound: (dependencies) => {
        // If there are work order dependencies, show substitution dialog
        if (dependencies.dependencies.work_orders?.total > 0) {
            // Load available parts for substitution
            axios.get(route('parts.index', { per_page: 1000, active: true }))
                .then(response => {
                    setAvailableParts(response.data.parts.data);
                    setShowSubstitutionDialog(true);
                });
            return true; // Prevent default dependencies dialog
        }
        return false; // Show default dependencies dialog
    }
});

const handleSubstitutionConfirm = async (
    substitutePart: Part, 
    updateMode: 'all' | 'selected', 
    selectedIds: number[]
) => {
    try {
        await axios.post(route('parts.substitute-and-delete', entityOps.deletingItem!.id), {
            substitute_part_id: substitutePart.id,
            update_mode: updateMode,
            selected_work_order_ids: selectedIds
        });
        
        toast.success('Peça substituída e excluída com sucesso');
        setShowSubstitutionDialog(false);
        router.reload();
    } catch (error) {
        toast.error('Erro ao substituir peça');
    }
};

// Add the PartSubstitutionDialog component
return (
    <AppLayout breadcrumbs={breadcrumbs}>
        {/* ... existing content ... */}
        
        <PartSubstitutionDialog
            open={showSubstitutionDialog}
            onOpenChange={setShowSubstitutionDialog}
            part={entityOps.deletingItem!}
            dependencies={entityOps.dependencies!}
            availableParts={availableParts}
            onConfirm={handleSubstitutionConfirm}
        />
    </AppLayout>
);
```

### 3. Routes Update
Add the substitution route to `routes/parts.php`:

```php
Route::post('parts/{part}/substitute-and-delete', [PartsController::class, 'substituteAndDelete'])
    ->name('parts.substitute-and-delete');
```

## Stock Management Features

### Low Stock Indicator
- Visual indicator when `available_quantity < minimum_quantity`
- Red badge or warning icon
- Optional notification system

### Stock Movements
Track when parts are:
- Reserved for work orders
- Consumed in work orders
- Returned to stock
- Manually adjusted

## Integration Points

### Work Orders
- Parts selection in work order planning
- Availability checking
- Cost calculation
- Consumption tracking

### Reports
- Stock levels report
- Usage history
- Cost analysis
- Supplier performance

## Implementation Steps

1. **Backend Setup** (Day 1)
   - Create PartsController
   - Implement CRUD operations
   - Set up routes
   - Create policy
   - Add permissions

2. **Frontend List Page** (Day 2)
   - Create index.tsx
   - Implement data table
   - Add search and filters
   - Set up pagination

3. **Create/Edit Functionality** (Day 3)
   - Create CreatePartSheet
   - Implement PartFormComponent
   - Add validation
   - Test CRUD operations

4. **Detail Page** (Day 4)
   - Create show.tsx
   - Implement tabs
   - Add stock information
   - Show related work orders

5. **Integration & Testing** (Day 5)
   - Test all CRUD operations
   - Verify permissions
   - Check responsive design
   - Performance optimization

## Navigation Integration
Add Parts to:
1. Main navigation menu
2. Home page quick access
3. Work order parts selection
4. Relevant breadcrumbs

### Update Navigation Menu
In `resources/js/layouts/app/navigation.tsx` (or similar), add Parts menu item:
```tsx
{
    title: 'Peças',
    href: '/parts',
    icon: Package, // from lucide-react
    permission: 'parts.viewAny'
}
```

### Update Home Page
In `resources/js/pages/home.tsx`, add Parts card to quick access section:
```tsx
parts: {
    title: 'Peças',
    icon: Package,
    description: 'Gestão de peças e estoque',
    href: '/parts',
}
```

## Import/Export Functionality

### Overview
Following the asset import/export pattern, the parts module will support:
1. **CSV Export** - Export all parts data with filters
2. **CSV Import** - Bulk import parts with validation and mapping
3. **Permission-based access** - Control who can import/export

### Backend Implementation

#### 1. Create PartsImportExportController
`app/Http/Controllers/Parts/PartsImportExportController.php`:

```php
class PartsImportExportController extends Controller
{
    public function import()
    {
        $this->authorize('import', Part::class);
        return Inertia::render('parts/import');
    }
    
    public function export()
    {
        $this->authorize('export', Part::class);
        return Inertia::render('parts/export');
    }
    
    public function exportData(Request $request)
    {
        $this->authorize('export', Part::class);
        
        $parts = Part::query()
            ->when($request->active_only, fn($q) => $q->active())
            ->when($request->low_stock_only, fn($q) => $q->whereRaw('available_quantity < minimum_quantity'))
            ->get();
        
        $data = $parts->map(function ($part) {
            return [
                'Número da Peça' => $part->part_number,
                'Nome' => $part->name,
                'Descrição' => $part->description,
                'Custo Unitário' => $part->unit_cost,
                'Qtd. Disponível' => $part->available_quantity,
                'Qtd. Mínima' => $part->minimum_quantity,
                'Qtd. Máxima' => $part->maximum_quantity,
                'Localização' => $part->location,
                'Fornecedor' => $part->supplier,
                'Fabricante' => $part->manufacturer,
                'Ativo' => $part->active ? 'Sim' : 'Não',
            ];
        })->toArray();
        
        // Create CSV file
        $filename = 'pecas_'.date('Y-m-d_His').'.csv';
        $filepath = storage_path('app/public/exports/'.$filename);
        
        // ... CSV generation logic ...
        
        return response()->download($filepath)->deleteFileAfterSend();
    }
    
    public function analyzeCsv(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120', // 5MB max
        ]);
        
        // ... CSV analysis logic ...
        
        return response()->json([
            'headers' => $headers,
            'data' => $previewData,
            'totalLines' => $totalLines,
        ]);
    }
    
    public function importData(Request $request)
    {
        $this->authorize('import', Part::class);
        
        $request->validate([
            'mapping' => 'required|array',
            'update_existing' => 'boolean',
        ]);
        
        DB::transaction(function() use ($request) {
            $imported = 0;
            $updated = 0;
            $skipped = 0;
            $errors = [];
            
            foreach ($data as $row) {
                try {
                    $partNumber = $row['part_number'];
                    
                    if ($request->update_existing) {
                        Part::updateOrCreate(
                            ['part_number' => $partNumber],
                            $mappedData
                        );
                    } else {
                        if (Part::where('part_number', $partNumber)->exists()) {
                            $skipped++;
                            continue;
                        }
                        Part::create($mappedData);
                    }
                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = [
                        'line' => $index + 1,
                        'part_number' => $partNumber,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            return response()->json([
                'success' => true,
                'imported' => $imported,
                'updated' => $updated,
                'skipped' => $skipped,
                'errors' => $errors,
            ]);
        });
    }
}
```

### Frontend Implementation

#### 1. Create Generalized Import Component
First, create a reusable import component that can be used for any entity type:

`resources/js/components/shared/EntityImportWizard.tsx`:

```tsx
interface EntityImportWizardProps {
    entityName: string; // 'parts', 'assets', etc.
    entityLabel: string; // 'Peças', 'Ativos', etc.
    importFields: ImportField[];
    requiredFields: string[];
    importRoute: string;
    analyzeRoute: string;
    listRoute: string;
    maxFileSize?: number; // in MB, default 5
    importInstructions?: React.ReactNode;
    duplicateInfo?: React.ReactNode;
}

export function EntityImportWizard({
    entityName,
    entityLabel,
    importFields,
    requiredFields,
    importRoute,
    analyzeRoute,
    listRoute,
    maxFileSize = 5,
    importInstructions,
    duplicateInfo
}: EntityImportWizardProps) {
    // All the import logic from asset import, but generalized
    const [processing, setProcessing] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progressValue, setProgressValue] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<CsvData | null>(null);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [updateExisting, setUpdateExisting] = useState(false);
    
    // ... rest of the generalized import logic
    
    return (
        <div className="space-y-8">
            {/* File upload section */}
            <div className="max-w-2xl">
                <HeadingSmall 
                    title={`Importar ${entityLabel}`} 
                    description={`Importe ${entityLabel.toLowerCase()} através de um arquivo CSV`} 
                />
                
                {/* Custom import instructions */}
                {importInstructions}
                
                {/* File upload form */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                    {/* ... file upload UI ... */}
                </form>
            </div>
            
            {/* Field mapping table */}
            {showTable && csvData && (
                <FieldMappingTable
                    csvData={csvData}
                    fieldMapping={fieldMapping}
                    importFields={importFields}
                    requiredFields={requiredFields}
                    onFieldMappingChange={handleFieldMappingChange}
                />
            )}
            
            {/* Import progress dialogs */}
            <ImportProgressDialog
                open={showImportProgress}
                onOpenChange={setShowImportProgress}
                importing={importing}
                importProgress={importProgress}
                importSuccess={importSuccess}
                importStats={importStats}
                onCancel={handleCancelImport}
                onClose={handleCloseImportDialog}
            />
        </div>
    );
}
```

#### 2. Parts Import Page Using Generalized Component
`resources/js/pages/parts/import.tsx`:

```tsx
export default function ImportParts() {
    const importFields = [
        { value: 'part_number', label: 'Número da Peça' },
        { value: 'name', label: 'Nome' },
        { value: 'description', label: 'Descrição' },
        { value: 'unit_cost', label: 'Custo Unitário' },
        { value: 'available_quantity', label: 'Qtd. Disponível' },
        { value: 'minimum_quantity', label: 'Qtd. Mínima' },
        { value: 'maximum_quantity', label: 'Qtd. Máxima' },
        { value: 'location', label: 'Localização' },
        { value: 'supplier', label: 'Fornecedor' },
        { value: 'manufacturer', label: 'Fabricante' },
        { value: 'active', label: 'Ativo' },
    ];
    
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Peças', href: '/parts' },
        { title: 'Importar', href: '/parts/import' },
    ];
    
    const importInstructions = (
        <div className="bg-muted relative rounded-lg p-4 mt-6">
            <div className="space-y-1">
                <h3 className="text-base font-medium">Colunas esperadas no CSV</h3>
                <p className="text-muted-foreground text-sm">
                    Seu arquivo CSV deve conter as colunas abaixo para uma importação bem-sucedida.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-x-12 gap-y-1 font-mono text-sm">
                    {importFields.map(field => (
                        <div key={field.value}>{field.label}</div>
                    ))}
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-sm">
                    <Lightbulb className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">
                        Use a funcionalidade de exportar para facilitar a criação do modelo do arquivo CSV.
                    </span>
                </div>
            </div>
        </div>
    );
    
    const duplicateInfo = (
        <div className="bg-muted relative mt-4 rounded-lg p-4">
            <div className="space-y-1">
                <h3 className="text-base font-medium">Números de Peça Duplicados</h3>
                <p className="text-muted-foreground text-sm">
                    Durante a importação, o sistema verifica automaticamente por números de peça duplicados.
                </p>
                <div className="mt-4 space-y-2 text-sm">
                    <p>• Números de peça que já existem não serão importados (a menos que "Atualizar existentes" esteja marcado)</p>
                    <p>• Números de peça duplicados dentro do arquivo CSV serão considerados apenas uma vez</p>
                    <p>• O campo "Número da Peça" deve ser único para cada peça</p>
                </div>
            </div>
        </div>
    );
    
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar Peças" />
            
            <CadastroLayout>
                <EntityImportWizard
                    entityName="parts"
                    entityLabel="Peças"
                    importFields={importFields}
                    requiredFields={['part_number']}
                    importRoute={route('parts.import.data')}
                    analyzeRoute={route('parts.import.analyze')}
                    listRoute={route('parts.index')}
                    maxFileSize={5}
                    importInstructions={importInstructions}
                    duplicateInfo={duplicateInfo}
                />
            </CadastroLayout>
        </AppLayout>
    );
}
```

#### 3. Create Generalized Export Component
`resources/js/components/shared/EntityExportDialog.tsx`:

```tsx
interface EntityExportDialogProps {
    entityLabel: string;
    exportRoute: string;
    filters?: ExportFilter[];
    onExportComplete?: () => void;
}

interface ExportFilter {
    id: string;
    label: string;
    type: 'checkbox' | 'select';
    defaultValue?: any;
    options?: { value: string; label: string }[];
}

export function EntityExportDialog({
    entityLabel,
    exportRoute,
    filters = [],
    onExportComplete
}: EntityExportDialogProps) {
    const [exporting, setExporting] = useState(false);
    const [filterValues, setFilterValues] = useState<Record<string, any>>({});
    
    // Initialize filter values
    useEffect(() => {
        const initialValues: Record<string, any> = {};
        filters.forEach(filter => {
            initialValues[filter.id] = filter.defaultValue ?? (filter.type === 'checkbox' ? false : '');
        });
        setFilterValues(initialValues);
    }, [filters]);
    
    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await axios.post(
                exportRoute,
                filterValues,
                { responseType: 'blob' }
            );
            
            // Download file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${entityLabel.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.success('Exportação concluída com sucesso');
            onExportComplete?.();
        } catch (error) {
            toast.error(`Erro ao exportar ${entityLabel.toLowerCase()}`);
        } finally {
            setExporting(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Exportar {entityLabel}</CardTitle>
                <CardDescription>
                    Exporte os dados para um arquivo CSV
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Export filters */}
                {filters.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Filtros de Exportação</h3>
                        <div className="space-y-2">
                            {filters.map(filter => (
                                <FilterControl
                                    key={filter.id}
                                    filter={filter}
                                    value={filterValues[filter.id]}
                                    onChange={(value) => setFilterValues({
                                        ...filterValues,
                                        [filter.id]: value
                                    })}
                                />
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Export info */}
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        O arquivo CSV exportado incluirá todos os campos dos registros
                        selecionados e poderá ser usado para backup ou análise externa.
                    </AlertDescription>
                </Alert>
                
                {/* Export button */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleExport}
                        disabled={exporting}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        {exporting ? 'Exportando...' : 'Exportar CSV'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
```

#### 4. Parts Export Page Using Generalized Component
`resources/js/pages/parts/export.tsx`:

```tsx
export default function ExportParts() {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Peças', href: '/parts' },
        { title: 'Exportar', href: '/parts/export' },
    ];
    
    const exportFilters: ExportFilter[] = [
        {
            id: 'active_only',
            label: 'Exportar apenas peças ativas',
            type: 'checkbox',
            defaultValue: true
        },
        {
            id: 'low_stock_only',
            label: 'Exportar apenas peças com estoque baixo',
            type: 'checkbox',
            defaultValue: false
        }
    ];
    
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Exportar Peças" />
            
            <div className="container py-6">
                <EntityExportDialog
                    entityLabel="Peças"
                    exportRoute={route('parts.export.data')}
                    filters={exportFilters}
                    onExportComplete={() => {
                        // Optional: redirect or refresh
                    }}
                />
            </div>
        </AppLayout>
    );
}
```

### Benefits of Generalized Import/Export Components

1. **Consistency**: All imports/exports follow the same UI/UX pattern
2. **Maintainability**: Updates to import/export flow only need to be made in one place
3. **Reusability**: Can be easily used for future entities (e.g., work orders, routines, etc.)
4. **Feature Parity**: All entities get the same advanced features:
   - Progress tracking
   - Field auto-mapping
   - Validation error display
   - Cancel operation support
   - Duplicate handling
   - Update existing records option

### Additional Shared Components to Extract

1. **FieldMappingTable**: Handles CSV column to system field mapping
2. **ImportProgressDialog**: Shows import progress with cancel option
3. **ImportErrorDialog**: Displays validation errors
4. **FilterControl**: Renders export filter controls based on type

### Implementation Notes

1. The generalized components should be placed in `resources/js/components/shared/`
2. All entity-specific logic should be passed as props
3. Use the same styling and animations as the asset import
4. Support for internationalization should be built-in
5. Error handling should be comprehensive and user-friendly

### Routes Configuration

Add to `routes/parts.php`:

```php
// Import/Export routes
Route::middleware(['auth'])->prefix('parts')->group(function () {
    Route::get('/import', [PartsImportExportController::class, 'import'])->name('parts.import');
    Route::post('/import/analyze', [PartsImportExportController::class, 'analyzeCsv'])->name('parts.import.analyze');
    Route::post('/import/data', [PartsImportExportController::class, 'importData'])->name('parts.import.data');
    
    Route::get('/export', [PartsImportExportController::class, 'export'])->name('parts.export');
    Route::post('/export/data', [PartsImportExportController::class, 'exportData'])->name('parts.export.data');
});
```

### Permissions Update

Update `PermissionSeeder.php` to include import/export permissions:

```php
// Add to $partsPermissions array:
[
    'name' => 'parts.import',
    'display_name' => 'Import Parts',
    'description' => 'Import parts from CSV files',
    'sort_order' => 66
],
[
    'name' => 'parts.export',
    'display_name' => 'Export Parts',
    'description' => 'Export parts to CSV files',
    'sort_order' => 67
]
```

Update `RoleSeeder.php` to assign import/export permissions:

1. **Plant Manager** - Add:
   ```php
   'parts.import',
   'parts.export',
   ```

2. **Maintenance Supervisor** - Add:
   ```php
   'parts.export',
   ```

### Policy Update

Update `PartPolicy.php` to include import/export authorization:

```php
public function import(User $user)
{
    return $user->isAdministrator() || $user->can('parts.import');
}

public function export(User $user)
{
    return $user->isAdministrator() || $user->can('parts.export');
}
```

### Navigation Update

Add import/export links to the Parts section in the sidebar:

```tsx
// In app-sidebar.tsx or navigation component
{
    title: 'Peças',
    href: '#',
    icon: Package,
    items: [
        {
            title: 'Listar Peças',
            href: '/parts',
        },
        {
            title: 'Importar Peças',
            href: '/parts/import',
        },
        {
            title: 'Exportar Peças',
            href: '/parts/export',
        },
    ],
}
```

### UI Features

1. **Import Features**:
   - Drag-and-drop file upload
   - CSV preview with first 10 rows
   - Automatic field mapping suggestions
   - Validation error display
   - Progress indicator for large files
   - Option to update existing parts

2. **Export Features**:
   - Filter options (active only, low stock)
   - Export format options (future enhancement)
   - Download progress indicator
   - Export history (future enhancement)

3. **Error Handling**:
   - File size validation (5MB max)
   - CSV format validation
   - Duplicate part number handling
   - Transaction rollback on errors
   - Detailed error reporting per row

## Validation Rules

### Backend Validation
- `part_number`: required, unique, max 255
- `name`: required, max 255
- `description`: optional, text
- `unit_cost`: required, numeric, min 0
- `available_quantity`: required, integer, min 0
- `minimum_quantity`: required, integer, min 0
- `maximum_quantity`: optional, integer, greater than minimum
- `location`: optional, max 255
- `supplier`: optional, max 255
- `manufacturer`: optional, max 255
- `active`: boolean

### Frontend Validation
- Real-time validation feedback
- Currency formatting for costs
- Number formatting for quantities
- Prevent negative values
- Maximum quantity must be > minimum quantity

## Performance Considerations
- Lazy load related data (work orders, history)
- Use pagination for all lists
- Index frequently searched columns
- Cache part counts and statistics
- Optimize queries with eager loading

## Future Enhancements
1. Barcode/QR code support
2. Multiple suppliers per part
3. Price history tracking
4. Automatic reorder points
5. Integration with procurement system
6. Part categories/classifications
7. Technical specifications attachment
8. Alternative parts/substitutes 