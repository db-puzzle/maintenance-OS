# External Steps Naming Convention in Route Templates

## Overview
This document describes the implementation of the naming convention for route templates that include external steps.

## Date: November 20, 2025

## Feature Request
When naming a route template that has an external step, the template name should append "(ext)" to the step name that composes the template name.

## Implementation

### Frontend - SaveAsTemplateDialog Component
**File:** `resources/js/components/production/templates/SaveAsTemplateDialog.tsx`

**Changes:**
Modified the `generateDefaultName()` function to detect external steps and append "(ext)" to their names.

**Code Location:** Lines 37-55

**Logic:**
```typescript
.map(step => {
    const name = step.name || '';
    // Append "(ext)" to external steps
    if (name.trim() && step.execution_location === 'external') {
        return `${name} (ext)`;
    }
    return name;
})
```

**Impact:** 
- When a route is saved as a template, any steps with `execution_location === 'external'` will have "(ext)" appended to their name in the template name
- This provides immediate visual indication that the template includes external manufacturing steps
- The naming is automatic and requires no user input

---

## Examples

### Template with Internal Steps Only
**Steps:**
- Cutting
- Welding
- Finishing

**Generated Template Name:**
```
Cutting, Welding, Finishing
```

**Generated Template Description:**
```
Rota com 3 etapas | Tempo total de setup: 45 min | Tempo total de ciclo: 120 min | Células: Cutting Cell, Welding Cell, Finishing Cell
```

### Template with Mixed Internal and External Steps
**Steps:**
- Cutting (internal)
- Galvanization (external, manufacturer: ABC Galvanizing)
- Welding (internal)
- Painting (external, manufacturer: XYZ Coatings)

**Generated Template Name:**
```
Cutting, Galvanization (ext), Welding, Painting (ext)
```

**Generated Template Description:**
```
Rota com 4 etapas | Tempo total de setup: 60 min | Tempo total de ciclo: 150 min | Células: Cutting Cell, Welding Cell | Fabricantes externos: ABC Galvanizing, XYZ Coatings
```

### Template with All External Steps
**Steps:**
- Heat Treatment (external, manufacturer: Heat Masters Inc)
- Surface Coating (external, manufacturer: Coating Pros)
- Quality Inspection (external, manufacturer: QA Specialists)

**Generated Template Name:**
```
Heat Treatment (ext), Surface Coating (ext), Quality Inspection (ext)
```

**Generated Template Description:**
```
Rota com 3 etapas | Tempo total de setup: 30 min | Tempo total de ciclo: 90 min | Fabricantes externos: Heat Masters Inc, Coating Pros, QA Specialists
```

---

## User Experience

### Benefits
1. **Immediate Visual Feedback:** Users can quickly identify templates that include external steps
2. **Better Template Organization:** Templates with external steps are clearly distinguished
3. **Improved Template Selection:** When browsing templates, users know which ones involve external manufacturing
4. **No Additional User Action:** The naming is automatic and doesn't require user intervention
5. **Comprehensive Description:** Template descriptions now include manufacturer information, providing complete visibility into external dependencies

### Template Creation Flow
1. User creates a route with internal and/or external steps
2. User assigns manufacturers to external steps
3. User clicks "Save as Template"
4. Dialog opens with auto-generated name and description
5. External steps automatically have "(ext)" appended in the name
6. External manufacturers are listed in the description
7. User can edit the name/description if desired or keep the auto-generated ones
8. User saves the template

---

## Technical Details

### Detection Logic
- **Field Checked:** `step.execution_location`
- **Condition:** `execution_location === 'external'`
- **Marker:** " (ext)" appended to step name

### Description Generation
The template description is automatically generated with the following information:

1. **Total Steps:** Number of steps in the route
2. **Setup Time:** Total setup time across all steps (if > 0)
3. **Cycle Time:** Total cycle time across all steps (if > 0)
4. **Work Cells:** List of unique work cells used (for internal steps)
5. **External Manufacturers:** List of unique manufacturers used (for external steps)

**Logic for Manufacturers:**
```typescript
const manufacturers = [...new Set(manufacturingRoute.steps
    .filter(step => step.execution_location === 'external' && step.manufacturer?.name)
    .map(step => step.manufacturer!.name)
)];
```

**Format:**
```
Rota com X etapa(s) | Tempo total de setup: Y min | Tempo total de ciclo: Z min | Células: Cell1, Cell2 | Fabricantes externos: Mfg1, Mfg2
```

### Integration Points
- Works seamlessly with existing template saving functionality
- Compatible with all external step fields (manufacturer, lead time)
- Maintains backwards compatibility with existing templates
- Manufacturer information is displayed only when external steps are present

### Type Safety
- Leverages existing TypeScript types for `ManufacturingStep`
- No new types or interfaces needed
- Uses existing `execution_location` field from step model

---

## Related Documentation

### Related Features
- [External Steps in Route Templates](./external-steps-in-route-templates.md) - Main documentation for external step support in templates

### Related Files
- `resources/js/components/production/templates/SaveAsTemplateDialog.tsx` - Template creation dialog
- `resources/js/types/production.ts` - Type definitions including ManufacturingStep

---

## Testing Recommendations

### Manual Testing
1. **Create Route with External Step:**
   - Create a manufacturing order
   - Add a route with at least one external step
   - Set execution_location to 'external'
   - Assign a manufacturer

2. **Save as Template:**
   - Click "Save as Template"
   - Verify the auto-generated name includes "(ext)" for external steps
   - Verify internal steps don't have "(ext)"

3. **Verify Template Name:**
   - Check that the name clearly indicates which steps are external
   - Confirm the name is readable and properly formatted

4. **Edit and Save:**
   - Verify user can edit the auto-generated name
   - Confirm the template saves successfully with custom name

### Edge Cases
- Template with only external steps
- Template with only internal steps
- Template with mixed internal/external steps
- Steps with empty or missing names
- Very long step names

---

## Future Enhancements

1. **Visual Indicators:**
   - Add external step badge in template list
   - Show manufacturer name in template preview
   - Display external step icon in template card

2. **Filtering:**
   - Filter templates by execution type (internal/external/mixed)
   - Search templates by manufacturer
   - Sort templates by number of external steps

3. **Naming Options:**
   - Allow users to customize the "(ext)" marker
   - Support for language localization of the marker
   - Option to show/hide external indicators in name

---

## Summary

The naming convention enhancement provides a simple yet effective way to identify templates with external steps. By automatically appending "(ext)" to external step names in the template name and listing manufacturers in the description, users can:

- ✅ Quickly identify templates with external manufacturing steps
- ✅ See which external manufacturers are involved at a glance  
- ✅ Make informed decisions when selecting templates
- ✅ Better organize and manage their template library
- ✅ Understand template complexity and dependencies at a glance

The implementation is:
- ✅ Automatic and requires no user action
- ✅ Compatible with existing functionality
- ✅ Type-safe and follows project standards
- ✅ Easy to maintain and extend

### Fix Applied
- **ManufacturingOrder Model:** Added eager loading of `manufacturer` relationship in `scopeForPlanningView()` to ensure manufacturer data is available in the frontend (Line 471: `'manufacturer:id,name'`)


