# Gate Card UI Specification

## Executive Summary

This specification defines a new UI pattern for manufacturing route configuration that introduces "Gate Cards" - visual elements that sit between manufacturing steps to configure and display step dependencies. This approach replaces the step-based configuration of child order dependencies with dedicated gate cards that use a side panel for detailed configuration, similar to how step properties are configured.

## Design Philosophy

### Core Principles

1. **Visual Clarity**: Dependencies are represented as physical "gates" between steps, making the flow logic immediately apparent
2. **Consistent Configuration Pattern**: Gate settings are configured through a dedicated side panel, maintaining consistency with step configuration
3. **Contextual Design**: Gates exist in the context of the workflow, showing clear relationships between steps
4. **Configuration Focus**: UI is optimized for route setup, not execution tracking
5. **Separation of Concerns**: Step configuration and gate configuration use separate panels to avoid confusion

### Visual Concept

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Step 1  │ ──► │  Gate   │ ──► │ Step 2  │ ──► │  Gate   │ ──► │ Step 3  │ ──► │  Gate   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
                                                                                      │
                                                                                      ▼
                                                                                 To Parent MO
```

## Gate Card Design

### 1. Default State

The gate card is a compact, clickable element that visually connects two elements:

**Standard Gate (between steps):**
```
┌─────────────────────────────┐
│ ⚊⚊⚊  Gate: All Children    │
└─────────────────────────────┘
```

**Final Gate (after last step):**
```
┌─────────────────────────────┐
│ ⚊⚊⚊  Parent Gate: Min 50   │
└─────────────────────────────┘
```

**Elements:**
- Gate icon (customizable based on dependency type)
- Brief description of the gate condition
- "Parent Gate" label for the final gate
- Click indicator on hover (cursor change, subtle highlight)
- Connection lines to adjacent elements

### 2. Selected State

When a gate is selected:
- The gate card shows a highlighted border
- A side panel opens (similar to StepPropertiesPanel) showing gate configuration
- The selected gate remains visually connected to its context in the flow

**Visual indicators for selected gate:**
```
┌─────────────────────────────┐
│ ⚊⚊⚊  Gate: All Children    │ ← Highlighted border (e.g., primary color)
└─────────────────────────────┘
```

### 3. Gate Properties Panel

When a gate is selected, a dedicated side panel slides in from the right (similar to StepPropertiesPanel):

**Gate Properties Panel Layout:**

The panel follows the same design patterns as StepPropertiesPanel:
- Fixed width (35rem)
- Slides in from the right with smooth animation
- Contains scrollable content area
- Auto-saves on field changes (no Apply/Cancel buttons needed)

**Standard Gate Configuration Panel:**
```
┌─────────────────────────────────────────────┐
│ Gate Configuration                          │
│ ─────────────────────────────────────────   │
│                                             │
│ Gate between: Step 1 → Step 2               │
│                                             │
│ Dependency Type                             │
│ ┌─────────────────────────────────────┐     │
│ │ ▼ Minimum quantity from children    │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ Minimum Quantity                            │
│ ┌─────────────────────────────────────┐     │
│ │ 50                                  │     │
│ └─────────────────────────────────────┘     │
│ Units required before next step can start   │
│                                             │
│ Description                                 │
│ ┌─────────────────────────────────────┐     │
│ │ Wait for at least 50 units from    │     │
│ │ child orders before proceeding...   │     │
│ └─────────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

**Final Gate Configuration Panel:**
```
┌─────────────────────────────────────────────┐
│ Parent Gate Configuration                   │
│ ─────────────────────────────────────────   │
│                                             │
│ Controls when parent order can start        │
│                                             │
│ Dependency Type                             │
│ ┌─────────────────────────────────────┐     │
│ │ ▼ Minimum quantity produced         │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ Minimum Quantity                            │
│ ┌─────────────────────────────────────┐     │
│ │ 50                                  │     │
│ └─────────────────────────────────────┘     │
│ Units parent needs before starting         │
│                                             │
│ Description                                 │
│ ┌─────────────────────────────────────┐     │
│ │ Parent manufacturing order can      │     │
│ │ begin once 50 units are ready...    │     │
│ └─────────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

**Panel Features:**
- Header shows gate type and context
- Dropdown for dependency type selection
- Conditional fields based on dependency type
- Optional description field for documentation
- Real-time validation
- Auto-save on changes (follows same pattern as StepPropertiesPanel)

### 4. Gate Types and Icons

| Dependency Type | Icon | Description | Visual Style |
|----------------|------|-------------|--------------|
| None | ▶️ | Direct flow | Simple arrow |
| All Children Complete | 🔒 | Locked gate | Padlock icon |
| Minimum Quantity | 📊 | Quantity threshold | Bar chart icon |

### 5. Interaction Patterns

**Click Behavior:**
- Single click on gate card: Select gate and open properties panel
- Clicking another gate: Switch panel content to new gate
- Clicking a step: Close gate panel, open step properties panel
- Clicking outside: Deselect gate and close panel

**Panel Behavior:**
- Only one panel can be open at a time (either StepPropertiesPanel or GatePropertiesPanel)
- Smooth transition when switching between panels
- Panel content updates immediately when selecting different gates

**Hover Effects:**
- Subtle highlight of the gate card
- Tooltip showing current configuration
- Cursor changes to indicate interactivity

**Keyboard Navigation:**
- Tab to focus gate cards
- Enter/Space to select gate and open panel
- Escape to close panel
- Arrow keys to navigate between form fields in panel

## Integration with Step Cards

### 1. Layout Flow

```
┌────────────┐
│  Step 1    │
│            │ ← Step details, work cell, timing
└────────────┘
      │
      ▼
┌────────────┐
│   Gate 1   │ ← Controls when Step 2 can start
└────────────┘
      │
      ▼
┌────────────┐
│  Step 2    │
└────────────┘
      │
      ▼
┌────────────┐
│   Gate 2   │ ← Controls when Step 3 can start
└────────────┘
      │
      ▼
┌────────────┐
│  Step 3    │
└────────────┘
      │
      ▼
┌────────────┐
│ Final Gate │ ← Controls when parent MO can start
└────────────┘
```

### 2. Data Model

Each step stores the gate configuration that comes AFTER it:

```typescript
interface StepWithGate {
    step: ManufacturingStep;
    gate_after: {
        dependency_type: 'none' | 'all_children_completed' | 'children_quantity';
        minimum_quantity?: number;
    };
}
```

**Note**: The gate configuration is stored on the step that precedes it:
- Step 1 stores the gate that controls when Step 2 can start
- Step 2 stores the gate that controls when Step 3 can start  
- Last step stores the gate that controls when the parent MO can start

### 3. Gate Positioning Rules

1. **First Step**: Has no preceding gate (starts when the manufacturing order is released)
2. **Middle Steps**: Have gates that control when they can start based on previous step completion and child order dependencies
3. **Last Step**: Has a gate after it that controls when the parent manufacturing order's steps can begin

The last step's gate is particularly important in hierarchical manufacturing orders, as it determines when the parent order can start consuming the output of this order.

## Component Architecture

### 1. New Components

**GateCard Component:**
```typescript
interface GateCardProps {
    gate: GateConfiguration;
    isSelected: boolean;
    onClick: () => void;
    disabled?: boolean;
    isFinalGate?: boolean;
}
```

**GatePropertiesPanel Component:**
```typescript
interface GatePropertiesPanelProps {
    selectedGate: GateConfiguration | null;
    precedingStep: ManufacturingStep;
    followingStep?: ManufacturingStep; // undefined for final gate
    onGateUpdate: (gate: GateConfiguration) => void;
    isOpen: boolean;
    viewMode?: boolean;
}
```

**RouteFlowView Component:**
```typescript
interface RouteFlowViewProps {
    steps: ManufacturingStep[];
    selectedStepId?: number;
    selectedGateId?: string;
    onStepSelect: (stepId: number) => void;
    onGateSelect: (gateId: string) => void;
    onStepUpdate: (stepId: number, updates: Partial<ManufacturingStep>) => void;
    onGateUpdate: (stepId: number, gate: GateConfiguration) => void;
    canEdit: boolean;
}
```

### 2. Modified Components

**RouteBuilderCanvas:**
- Remove child order dependency configuration from StepPropertiesPanel
- Integrate GateCard components between steps
- Manage selection state for both steps and gates
- Coordinate which panel (step or gate) is open

**StepCard:**
- Remove child order dependency indicators
- Focus purely on step-specific information

**StepPropertiesPanel:**
- Remove all child order dependency UI
- Simplify to focus only on step-specific properties

## User Experience Flow

### 1. Creating a New Route

1. User adds steps to the route
2. Gate cards automatically appear:
   - Between each step pair (controls next step start)
   - After the last step (controls parent MO start)
3. All gates default to "no dependencies"
4. User clicks on any gate card to select it
5. Gate properties panel slides in from the right
6. User configures the gate settings in the panel
7. Changes are auto-saved as user types/selects options

### 2. Editing Existing Routes

1. Route loads with existing gate configurations visible on cards
2. User can click any gate to open its properties panel
3. Panel shows current configuration
4. Changes are auto-saved with the existing auto-save mechanism
5. User can switch between gates by clicking different gate cards

### 3. Panel Coordination

1. Only one properties panel can be open at a time
2. Clicking a step closes any open gate panel and opens step panel
3. Clicking a gate closes any open step panel and opens gate panel
4. Smooth transitions between panels maintain visual continuity

### 4. Visual Feedback

- **Selected State**: Selected gate card has highlighted border
- **Configuration State**: Icon and text on card indicate current gate setting
- **Hover State**: Subtle highlight and cursor change on gate cards
- **Panel State**: Smooth slide-in animation for properties panel
- **Disabled State**: Grayed out appearance when route is read-only

## Benefits of This Approach

1. **Intuitive Visualization**: Dependencies are shown where they logically exist - between steps
2. **Consistent UX Pattern**: Gate configuration follows the same side-panel pattern as step configuration
3. **Better Overview**: All gates visible at once in the flow, with detailed configuration in the panel
4. **Clear Separation**: Step properties and gate properties are clearly separated in different panels
5. **Cleaner Step Cards**: Steps focus on their core purpose, gates handle flow control
6. **Familiar Interaction**: Users already understand the side-panel pattern from step configuration

## Special Considerations for Final Gate

### 1. Purpose

The final gate (after the last step) serves a critical role in hierarchical manufacturing:
- Controls when the parent manufacturing order can begin consuming this order's output
- Enables progressive flow where parent orders can start before child orders are complete
- Provides the same dependency options but in the context of parent-child relationships

### 2. Visual Differentiation

- Labeled as "Parent Gate" to distinguish from step-to-step gates
- May use a different color or icon to indicate its special purpose
- Shows connection arrow pointing to "Parent MO" rather than another step

### 3. Configuration Context

The configuration dialog explicitly mentions "parent MO" rather than "next step" to make the relationship clear.

## Migration Path

### 1. Backend Compatibility

The underlying data model remains unchanged - child order dependencies are still stored on the step that they affect. The gate card is purely a UI representation.

### 2. UI Migration Steps

1. Create new GateCard component
2. Create new GatePropertiesPanel component (similar to StepPropertiesPanel)
3. Update RouteBuilderCanvas to render gates between steps
4. Implement selection state management for both steps and gates
5. Move dependency configuration from StepPropertiesPanel to GatePropertiesPanel
6. Remove dependency UI from StepPropertiesPanel
7. Update auto-save logic to handle gate changes
8. Implement panel coordination logic (only one panel open at a time)

### 3. Backwards Compatibility

Existing routes will display with their current dependency settings shown in the appropriate gate cards.

## Future Enhancements

1. **Additional Gate Types**: Time-based gates, approval gates, resource availability gates
2. **Gate Templates**: Save and reuse common gate configurations
3. **Conditional Logic**: More complex gate conditions (AND/OR combinations)
4. **Visual Indicators**: Optional execution preview showing how gates would behave

## Technical Implementation Notes

### 1. State Management

```typescript
// RouteBuilderCanvas state additions
const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
const [selectedStepId, setSelectedStepId] = useState<number | null>(null);

// Gate ID format: "gate-after-{stepId}" or "final-gate"
```

### 2. Panel Coordination

```typescript
// When selecting a gate
const handleGateSelect = (gateId: string) => {
    setSelectedGateId(gateId);
    setSelectedStepId(null); // Clear step selection
};

// When selecting a step
const handleStepSelect = (stepId: number) => {
    setSelectedStepId(stepId);
    setSelectedGateId(null); // Clear gate selection
};
```

### 3. Data Flow

- Gate configurations continue to be stored on the step that precedes them
- The GatePropertiesPanel receives the gate configuration and updates it through the same auto-save mechanism as steps
- No changes to the backend data model are required

## Conclusion

This Gate Card UI pattern provides a more intuitive and efficient way to configure manufacturing route dependencies. By visualizing dependencies as gates between steps and using a familiar side-panel configuration pattern, users can better understand and configure their manufacturing flows while maintaining consistency with the existing UI patterns in the application.
