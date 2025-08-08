# Type Safety Improvement Guide

## Overview

This guide provides specific examples and patterns for replacing the 136 `any` types found in the codebase with proper TypeScript types.

## Common Patterns and Solutions

### 1. Event Handlers

**Current (Bad):**
```typescript
onChange={(e: any) => setValue(e.target.value)}
```

**Fixed (Good):**
```typescript
onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
```

### 2. API Responses

**Current (Bad):**
```typescript
const handleSubmit = async (data: any) => {
  const response = await api.post('/endpoint', data);
}
```

**Fixed (Good):**
```typescript
interface SubmitData {
  name: string;
  email: string;
  // ... other fields
}

interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

const handleSubmit = async (data: SubmitData) => {
  const response = await api.post<ApiResponse<User>>('/endpoint', data);
}
```

### 3. Array Methods

**Current (Bad):**
```typescript
items.map((item: any) => item.name)
items.filter((item: any) => item.active)
```

**Fixed (Good):**
```typescript
interface Item {
  id: number;
  name: string;
  active: boolean;
}

items.map((item: Item) => item.name)
items.filter((item: Item) => item.active)
```

### 4. Form Data

**Current (Bad):**
```typescript
const [formData, setFormData] = useState<any>({});
```

**Fixed (Good):**
```typescript
interface FormData {
  field1: string;
  field2: number;
  field3?: boolean; // optional field
}

const [formData, setFormData] = useState<FormData>({
  field1: '',
  field2: 0
});
```

### 5. Component Props

**Current (Bad):**
```typescript
const MyComponent = ({ data, onUpdate }: any) => {
  // ...
}
```

**Fixed (Good):**
```typescript
interface MyComponentProps {
  data: DataType;
  onUpdate: (id: number, updates: Partial<DataType>) => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ data, onUpdate }) => {
  // ...
}
```

## File-Specific Fixes

### /workspace/resources/js/Pages/production/items/show.tsx (42 instances)

This file needs comprehensive type definitions for:
- Item data structure
- BOM (Bill of Materials) structure
- Manufacturing order types
- Routing information

**Create these types:**
```typescript
// types/production.ts
export interface ProductionItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  category: ItemCategory;
  unit_of_measure: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ItemCategory {
  id: number;
  name: string;
  slug: string;
}

export interface BillOfMaterial {
  id: number;
  item_id: number;
  version: string;
  status: 'draft' | 'active' | 'obsolete';
  items: BomItem[];
}

export interface BomItem {
  id: number;
  item: ProductionItem;
  quantity: number;
  unit: string;
}
```

### /workspace/resources/js/components/AssetRoutinesTab.tsx (19 instances)

This file needs types for:
- Asset routines
- Execution data
- Task information

**Create these types:**
```typescript
// types/maintenance.ts
export interface AssetRoutine {
  id: number;
  asset_id: number;
  name: string;
  frequency: RoutineFrequency;
  tasks: RoutineTask[];
  last_execution?: RoutineExecution;
  next_due_date?: string;
}

export interface RoutineFrequency {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  value: number;
  unit?: string;
}

export interface RoutineTask {
  id: number;
  description: string;
  order: number;
  required: boolean;
}

export interface RoutineExecution {
  id: number;
  routine_id: number;
  executed_at: string;
  executed_by: User;
  status: 'completed' | 'partial' | 'skipped';
  notes?: string;
}
```

## Generic Utility Types

Create reusable utility types:

```typescript
// types/utils.ts

// For paginated responses
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// For API errors
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

// For select options
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

// For table columns
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
}
```

## Implementation Strategy

1. **Start with shared types**: Create base interfaces that are used across multiple files
2. **Use TypeScript's utility types**: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, etc.
3. **Leverage type inference**: Let TypeScript infer types where possible
4. **Document complex types**: Add JSDoc comments for complex type definitions

## Validation

After implementing types, validate with:

```bash
# Check for type errors
npm run types

# Check for remaining 'any' types
grep -r "any" resources/js --include="*.ts" --include="*.tsx" | grep -v "// eslint-disable" | wc -l
```

## Benefits

1. **Catch errors at compile time**: Type errors will be caught before runtime
2. **Better IDE support**: Auto-completion and inline documentation
3. **Self-documenting code**: Types serve as documentation
4. **Easier refactoring**: TypeScript will catch breaking changes
5. **Improved developer experience**: Less guessing about data structures
