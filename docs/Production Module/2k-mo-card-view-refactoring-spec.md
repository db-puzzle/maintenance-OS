# Manufacturing Order Card View Refactoring Specification

## Overview
This document outlines the specifications for refactoring the MOCardView component to support dual-mode display with flip animation for detailed views.

## 1. Card Display Modes

### 1.1 Front Face Modes
The card front face will support two display modes:

#### Mode 1: Image View
- **Primary Content**: Item's primary image (if available)
- **Card Border**: Status-based coloring (see Color Scheme section)
- **Overlay Content**: 
  - MO number (top-left, semi-transparent background)
  - Status badge (bottom-left)
  - Priority badge (bottom-right)
- **Fallback**: If no image available, show placeholder with item icon

#### Mode 2: Data View
- **Primary Content**: Basic manufacturing order information
  - MO number (header)
  - Item number and name
  - Quantity progress bar
  - Due date
  - Current step (if routed)
- **Card Styling**: Status-based border and background colors (see Color Scheme section)
- **Footer Content**:
  - Status badge (bottom-left)
  - Priority badge (bottom-right)

### 1.2 Mode Control
- Parent component controls the display mode via prop
- All cards in the grid switch modes simultaneously
- Mode toggle button in parent component header
- Smooth fade transition between modes (~300ms)

## 2. Card Interaction & Flip Animation

### 2.1 Click Behavior
- Clicking anywhere on the card triggers flip to back side
- Exception: Action buttons on front face have their own click handlers

### 2.2 Flip Animation
- **Animation Type**: 3D rotation on Y-axis (180°)
- **Duration**: 600ms with ease-in-out timing
- **Perspective**: 1200px for realistic 3D effect
- **Combined Effects**:
  - Rotation: rotateY(180deg)
  - Scale: Enlarge to ~1.6x during flip
  - Position: Center on screen

### 2.3 Back Side Display
- **Size**: 80% of viewport (max-width: 800px)
- **Position**: Fixed, centered on screen
- **Z-index**: High value to appear above other content
- **Background Overlay**: Semi-transparent black (rgba(0,0,0,0.5))
- **Close Options**:
  - Click X button in header
  - Click outside card (on overlay)
  - ESC key press

## 3. Card Content Structure

### 3.1 Front Face Structure
```
┌─────────────────────────────┐
│ [Header]                    │
│ - MO Number                 │
│ - Quick Status Icon         │
│                             │
│ [Content Area]              │
│ - Mode 1: Item Image        │
│ - Mode 2: Basic Data        │
│                             │
│ [Action Area]               │
│ - Primary Action Button     │
│                             │
│ [Footer]                    │
│ [Status Badge] [Priority]   │
└─────────────────────────────┘
```

### 3.2 Back Face Structure
```
┌─────────────────────────────┐
│ [Header Bar]                │
│ - MO Number                 │
│ - Item Name                 │
│ - Close Button (X)          │
├─────────────────────────────┤
│ [Scrollable Content Area]   │
│                             │
│ [Item Image Section]        │
│ - Primary Image             │
│ - Thumbnail Gallery         │
│                             │
│ [Status Overview]           │
│ - Status Badge              │
│ - Priority Badge            │
│ - Progress Bar              │
│                             │
│ [Details Grid]              │
│ - Quantity Info             │
│ - Dates (Start/Due)         │
│ - Assigned Resources        │
│ - Location/Work Cell        │
│                             │
│ [Route Information]         │
│ - Current Step              │
│ - Previous/Next Steps       │
│ - Step Progress             │
│                             │
│ [Action Buttons Section]    │
│ - Primary Actions           │
│ - Secondary Actions         │
│                             │
│ [History/Notes]             │
│ - Recent Activities         │
│ - Notes/Comments            │
└─────────────────────────────┘
```

## 4. Available Actions

### 4.1 Front Face Actions (Context-Sensitive)
Based on MO status:
- **Released**: "Start" button (green)
- **In Progress**: "Report" button (blue)
- **On Hold**: "Resume" button (orange)
- **Other statuses**: No primary action

### 4.2 Back Face Actions
#### Primary Actions (Always Visible)
- Start/Resume Production
- Report Production
- Complete Order
- View Details (opens full MO page)

#### Secondary Actions (Dropdown/Expanded Section)
- Put on Hold
- Cancel Order
- Initiate Rework
- Report Quality Issue
- Add Note/Comment
- Print Work Instructions
- View/Download Documents
- Assign Resources
- Change Priority

## 5. Technical Implementation

### 5.1 Component Props
```typescript
interface MOCardViewProps {
  orders: ManufacturingOrder[];
  viewMode: 'image' | 'data';  // NEW: Controlled by parent
  onOrderClick: (order: ManufacturingOrder) => void;
  onAction: (action: string, order: ManufacturingOrder) => void;
}
```

### 5.2 State Management
- `flippedCardId`: Track which card is currently flipped (null if none)
- Animation states handled via CSS classes
- Overlay visibility tied to flippedCardId

### 5.3 CSS Architecture
- Use CSS transforms for flip animation
- Preserve-3d for proper 3D rendering
- Backface-visibility: hidden for clean flip
- Fixed positioning for expanded back face
- Z-index layering for overlay and card

### 5.4 Animation Classes
```css
.card-container {
  perspective: 1200px;
}

.card-flipper {
  transition: all 0.6s ease-in-out;
  transform-style: preserve-3d;
}

.card-flipped {
  transform: rotateY(180deg) scale(1.6);
  position: fixed;
  /* centering logic */
}

.mode-transition {
  transition: opacity 0.3s ease-in-out;
}
```

## 6. Accessibility Considerations

- Keyboard navigation support
- ESC key to close flipped card
- Focus management when flipping
- ARIA labels for screen readers
- Reduced motion support for animations

## 7. Performance Considerations

- Lazy load images
- Use thumbnail images on front face
- Load full details only when card is flipped
- Debounce rapid flip actions
- CSS-only animations (no JS animation loops)

## 8. Responsive Design

### Desktop (lg+)
- Grid: 3-4 cards per row
- Flipped card: 80% viewport, max 800px

### Tablet (md)
- Grid: 2 cards per row
- Flipped card: 90% viewport

### Mobile (sm)
- Grid: 1 card per row
- Flipped card: 95% viewport
- Simplified action buttons

## 9. Error States

- Handle missing images gracefully
- Show appropriate messages for action failures
- Maintain card state if action fails
- Provide retry options where applicable

## 10. Color Scheme

### 10.1 Status-Based Card Styling
Cards will have different border and background colors based on MO status:

| Status | Border Color | Background Color | CSS Classes |
|--------|--------------|------------------|-------------|
| Draft | Gray 200 | Gray 50 @ 30% | `border-gray-200 bg-gray-50/30` |
| Planned | Blue 200 | Blue 50 @ 30% | `border-yellow-200 bg-yellow-50/30` |
| Released | Blue 300 | Blue 50 @ 50% | `border-blue-300 bg-blue-50/50` |
| In Progress | Green 300 | Green 50 @ 30% | `border-amber-300 bg-amber-50/30` |
| On Hold | Orange 300 | Orange 50 @ 30% | `border-orange-300 bg-orange-50/30` |
| Completed | Green 400 | Green 50 @ 30% | `border-green-400 bg-green-50/30` |
| Cancelled | Red 300 | Red 50 @ 30% | `border-red-300 bg-red-50/30` |

### 10.2 Application Rules
- **Image Mode**: Only border color is applied (2px border)
- **Data Mode**: Both border and background colors are applied
- **Overdue Orders**: Additional orange-500 border override when overdue
- **Hover State**: Increase shadow without changing colors
- **Flipped State**: Maintain border color on back side

## 11. Future Enhancements

- Drag-and-drop for status changes
- Bulk selection mode
- Customizable card layouts
- Quick edit mode without full flip
- Keyboard shortcuts for common actions
