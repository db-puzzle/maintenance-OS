# Shared Components Architecture Plan

## Overview

A pragmatic approach to reduce code duplication while maintaining separate pages for each entity. This architecture focuses on extracting common components and services that can be shared across all entity management pages.

## Core Philosophy

- **Keep entity pages separate** - Each entity maintains its own page and sheet components
- **Share common components** - Extract reusable UI components 
- **Unify data services** - Create a common API service layer
- **Standardize patterns** - Use consistent patterns across all entities

## Architecture

### 1. Component Structure

```
resources/js/
├── components/
│   ├── shared/
│   │   ├── EntityDataTable.tsx         # Generic data table
│   │   ├── EntityPagination.tsx        # Reusable pagination
│   │   ├── EntitySearchBar.tsx         # Search with debouncing
│   │   ├── EntityColumnVisibility.tsx  # Column visibility toggle
│   │   ├── EntityDeleteDialog.tsx      # Generic delete confirmation
│   │   ├── EntityDependencyDialog.tsx  # Dependency checker dialog
│   │   ├── EntityEmptyState.tsx        # Empty state component
│   │   └── EntityActionDropdown.tsx    # Row actions dropdown
│   │
│   ├── TextInput.tsx                   # EXISTING - Text field component
│   ├── ItemSelect.tsx                  # EXISTING - Select/dropdown component
│   ├── smart-input.tsx                 # EXISTING - Smart input component
│   ├── input-error.tsx                 # EXISTING - Error display component
│   │
│   ├── CreatePlantSheet.tsx           # Specific to plants
│   ├── CreateAreaSheet.tsx            # Specific to areas
│   ├── CreateSectorSheet.tsx          # Specific to sectors
│   ├── CreateManufacturerSheet.tsx    # Specific to manufacturers
│   └── CreateAssetTypeSheet.tsx       # Specific to asset types
│
├── services/
│   ├── EntityService.ts               # Generic CRUD service
│   ├── api/
│   │   ├── apiClient.ts              # Axios wrapper
│   │   └── endpoints.ts              # API endpoint definitions
│   └── utils/
│       ├── validation.ts             # Shared validation logic
│       └── formatting.ts             # Data formatting utilities
│
├── hooks/
│   ├── useEntityList.ts              # List view logic
│   ├── useEntityForm.ts              # Form handling
│   ├── useEntityDelete.ts            # Delete with dependencies
│   └── useDebounce.ts               # Debouncing utility
│
├── types/
│   ├── shared.ts                     # Shared type definitions
│   └── entities/
│       ├── plant.ts
│       ├── area.ts
│       ├── sector.ts
│       ├── manufacturer.ts
│       └── assetType.ts
│
└── pages/
    └── asset-hierarchy/
        ├── plantas/
        │   └── index.tsx            # Uses shared components
        ├── areas/
        │   └── index.tsx            # Uses shared components
        ├── setores/
        │   └── index.tsx            # Uses shared components
        ├── manufacturers/
        │   └── index.tsx            # Uses shared components
        ├── asset-types/
        │   └── index.tsx            # Uses shared components
        └── assets/
            └── index.tsx            # Uses shared components
```

### 2. Leveraging Existing Field Components

The project already has field components that should be reused:

#### 2.1 TextInput Component
Already exists at `components/TextInput.tsx` with features:
- Label with required indicator
- Error display via InputError
- Smart input functionality
- View mode support
- Form integration with Inertia

Usage in entity sheets:
```typescript
<TextInput<PlantForm>
    form={{
        data,
        setData,
        errors,
        clearErrors: () => {},
    }}
    name="name"
    label="Nome da Planta"
    placeholder="Nome da planta"
    required
/>
```

#### 2.2 ItemSelect Component
Already exists at `components/ItemSelect.tsx` with features:
- Searchable dropdown
- Create new item option
- Icon support
- Clear selection option
- View mode support

Usage for entity relationships:
```typescript
<ItemSelect
    label="Planta"
    items={plants}
    value={data.plant_id}
    onValueChange={(value) => setData('plant_id', value)}
    placeholder="Selecione uma planta"
    required
    searchable
/>
```

#### 2.3 Additional Field Needs
For fields not yet implemented, we'll need to create:
- **MaskedInput**: For CEP, phone numbers (can extend TextInput)
- **TextareaInput**: For longer text fields (following TextInput pattern)
- **SelectWithCommand**: For state selection (as seen in CreatePlantSheet)

### 3. Shared Components Design

#### 3.1 EntityDataTable
A flexible data table that accepts configuration for columns and actions:

```typescript
interface EntityDataTableProps<T> {
  data: T[];
  columns: ColumnConfig[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  columnVisibility?: Record<string, boolean>;
}
```

#### 3.2 EntityDeleteDialog
Handles both simple deletion and dependency checking:

```typescript
interface EntityDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityLabel: string;
  onConfirm: () => Promise<void>;
  checkDependencies?: () => Promise<DependencyResult>;
}
```

#### 3.3 EntitySearchBar
Reusable search with built-in debouncing:

```typescript
interface EntitySearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}
```

### 4. Service Layer

#### 4.1 EntityService
A generic service class that handles all CRUD operations:

```typescript
class EntityService<T> {
  constructor(private endpoints: EntityEndpoints) {}
  
  // List with pagination and filters
  async list(params: ListParams): Promise<PaginatedResponse<T>>
  
  // Get single entity
  async get(id: number, options?: GetOptions): Promise<T>
  
  // Create new entity
  async create(data: Partial<T>): Promise<T>
  
  // Update existing entity
  async update(id: number, data: Partial<T>): Promise<T>
  
  // Delete entity
  async delete(id: number): Promise<void>
  
  // Check dependencies
  async checkDependencies(id: number): Promise<DependencyResult>
}
```

#### 4.2 Endpoint Configuration
Each entity defines its endpoints:

```typescript
const plantEndpoints: EntityEndpoints = {
  list: 'asset-hierarchy.plants',
  get: 'asset-hierarchy.plants.show',
  create: 'asset-hierarchy.plants.store',
  update: 'asset-hierarchy.plants.update',
  delete: 'asset-hierarchy.plants.destroy',
  dependencies: 'asset-hierarchy.plants.check-dependencies'
};
```

### 5. Hooks for Common Logic

#### 5.1 useEntityList
Manages list view state and operations:

```typescript
function useEntityList<T>(service: EntityService<T>, config: ListConfig) {
  // State management
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>();
  const [filters, setFilters] = useState<Filters>();
  
  // Operations
  const fetchData = async () => { /* ... */ };
  const handleSearch = (search: string) => { /* ... */ };
  const handleSort = (field: string, direction: 'asc' | 'desc') => { /* ... */ };
  const handleDelete = async (item: T) => { /* ... */ };
  
  return {
    data,
    loading,
    pagination,
    filters,
    operations: {
      refresh: fetchData,
      search: handleSearch,
      sort: handleSort,
      delete: handleDelete
    }
  };
}
```

#### 5.2 useEntityForm
Handles form state and submission:

```typescript
function useEntityForm<T>(
  service: EntityService<T>,
  mode: 'create' | 'edit',
  initialData?: T
) {
  const form = useForm<T>(initialData);
  
  const submit = async () => {
    if (mode === 'create') {
      await service.create(form.data);
    } else {
      await service.update(initialData.id, form.data);
    }
  };
  
  return { ...form, submit };
}
```

### 6. Entity Page Structure

Each entity page follows the same pattern but with its specific sheet:

```typescript
// plantas.tsx
export default function Plantas() {
  const service = new EntityService<Plant>(plantEndpoints);
  const list = useEntityList(service, plantListConfig);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  
  return (
    <AppLayout>
      <ListLayout
        title="Plantas"
        onCreateClick={() => setSheetOpen(true)}
      >
        <EntitySearchBar
          placeholder="Buscar plantas..."
          value={list.filters.search}
          onChange={list.operations.search}
        />
        
        <EntityDataTable
          data={list.data}
          columns={plantColumns}
          loading={list.loading}
          onRowClick={(plant) => router.visit(route('plantas.show', plant.id))}
          actions={(plant) => (
            <EntityActionDropdown
              onEdit={() => {
                setEditingPlant(plant);
                setSheetOpen(true);
              }}
              onDelete={() => list.operations.delete(plant)}
            />
          )}
        />
        
        <EntityPagination
          pagination={list.pagination}
          onChange={list.operations.changePage}
        />
      </ListLayout>
      
      <CreatePlantSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        plant={editingPlant}
        onSuccess={() => {
          setSheetOpen(false);
          list.operations.refresh();
        }}
      />
    </AppLayout>
  );
}
```

## Benefits of This Approach

### 1. Maintainability
- Entity-specific logic stays in dedicated components
- Easy to understand and modify individual entities
- Clear separation of concerns

### 2. Code Reusability
- Common UI components shared across all entities
- Unified service layer reduces API code duplication
- Consistent patterns make development faster
- Reuses existing field components

### 3. Flexibility
- Each entity can have custom fields and behavior
- Easy to add entity-specific features
- No complex configuration system to learn

### 4. Type Safety
- Full TypeScript support for each entity
- No complex generics in page components
- Clear interfaces for shared components

### 5. Progressive Enhancement
- Can migrate one entity at a time
- Existing pages continue to work
- Easy to roll back if needed

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)
1. Create shared component library (EntityDataTable, EntityPagination, etc.)
2. Build EntityService class
3. Implement common hooks
4. Create any missing field components (MaskedInput, TextareaInput)

### Phase 2: First Entity Migration (Week 2)
1. Migrate Plant entity as proof of concept
2. Update CreatePlantSheet to use consistent patterns
3. Update plantas.tsx to use shared components
4. Test thoroughly

### Phase 3: Remaining Entities (Week 3)
1. Migrate Area entity
2. Migrate Sector entity
3. Migrate Manufacturer entity
4. Migrate AssetType entity

### Phase 4: Optimization (Week 4)
1. Performance testing
2. Code cleanup
3. Documentation
4. Team training

## Comparison with Previous Approach

### What We Keep
- Separate pages for each entity
- Separate sheets for create/edit
- Full control over entity-specific features
- Familiar development patterns
- **Existing field components (TextInput, ItemSelect, etc.)**

### What We Share
- Data table component
- Pagination component
- Delete/dependency dialogs
- Search functionality
- API communication layer
- **Project-wide field components**
- Common hooks for data management

### What We Avoid
- Complex generic configuration system
- Steep learning curve
- Over-abstraction
- Difficult debugging
- **Duplicating field components**

## Success Metrics

1. **Code Reduction**: 40-50% less duplicated code
2. **Development Speed**: 2x faster to add new features
3. **Bug Reduction**: Fewer UI inconsistencies
4. **Maintainability**: Easier to onboard new developers
5. **Performance**: No degradation from current system

## Conclusion

This shared components architecture provides the perfect balance between code reusability and maintainability. It reduces duplication where it matters most (UI components and API calls) while keeping entity-specific logic clear and accessible. By leveraging existing field components like TextInput and ItemSelect, we maintain consistency across the entire project, not just within the admin panel. 