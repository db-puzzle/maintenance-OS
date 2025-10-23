# Manufacturing Order Status UI - Functional Specification

## 1. Overview

### 1.1 Purpose
This document specifies the requirements for a Manufacturing Order (MO) Status visualization interface within the MES system. The interface displays the hierarchical status of manufacturing orders and their production steps as color-coded step boxes with dependency connectors.

### 1.2 Scope
The UI provides a read-only snapshot view of production status across parent and child manufacturing orders, showing step-by-step progress and dependencies through connected step boxes with clear visual state indicators.

## 2. Data Model

### 2.1 Manufacturing Order Structure
- **Parent MO**: Top-level manufacturing order that can contain multiple child MOs
- **Child MO**: Manufacturing order that belongs to a parent MO
- **Multi-level Hierarchy**: Child MOs can have their own children (unlimited depth)
- **Route Steps**: Sequential production steps within each MO (no parallel steps within a single MO)

### 2.2 Step Information
- **Step Name**: Descriptive name from database (displayed on top line of step box)
- **Workcell Name**: Associated workcell identifier from database (displayed on bottom line of step box)
- **Step Sequence**: Sequential ordering within each MO

### 2.3 Dependencies
- **Intra-MO Dependencies**: Each step depends on the completion of the previous step within the same MO
- **Inter-MO Dependencies**: The first step of a parent MO depends on the completion of the last step of its child MOs
- **No Cross-MO Step Dependencies**: Steps cannot depend on steps from sibling or unrelated MOs

## 3. Visual Design Specifications

### 3.1 Step Box Design
Each production step is represented by a rounded rectangular box containing:
- **Top Line**: Step Name (from database)
- **Bottom Line**: Workcell Name (from database)
- **Consistent Size**: All boxes maintain uniform dimensions regardless of content
- **Text Cropping**: Long names are truncated with character limits to fit box constraints

### 3.2 Step Status Color Coding
Step status is indicated through background color of the step box:

| State | Background Color | Description |
|-------|-----------------|-------------|
| Not Ready | Gray | Dependencies not met |
| Ready | Light Blue | Ready to start, dependencies met |
| In Progress | Medium Blue | Currently being executed |
| Complete | Light Green | Successfully completed |
| On Hold | Light Yellow | Temporarily paused |
| Cancelled | Light Red | Terminated/cancelled |

### 3.3 Text and Border Specifications
- **Text Color**: Black for all states (ensuring readability)
- **Border**: Standard border style for all boxes
- **Font**: Consistent font size and style across all step boxes
- **Text Alignment**: Centered within each box

### 3.4 Layout Structure
```
MOX [Number]    [Step Box] → [Step Box] → [Step Box]
MOX [Child]     [Step Box] → [Step Box] ↗
```

### 3.5 Connection Lines
- **Horizontal Lines**: Connect sequential steps within the same MO (left to right flow)
- **Dependency Lines**: Connect final step of child MO to first step of parent MO
  - Exit from right side of child MO's final step
  - Enter from bottom side of parent MO's first step
- **Line Style**: Uniform thickness and style for all connection types
- **No Visual Differentiation**: All connection lines use identical styling

## 4. Hierarchy and Display Rules

### 4.1 MO Positioning and Layout
- **Child MO Alignment**: Child MO steps remain inline with their MO identifier labels
- **Parent MO Positioning**: Parent MO steps are shifted right to accommodate dependency connector lines
- **Hierarchical Indentation**: Multi-level children maintain appropriate indentation levels
- **Dependency Visualization**: Parent MO first step positioned after final step of child MOs to show dependency flow

### 4.2 Step Box Positioning
- **Sequential Flow**: Steps within each MO flow left to right
- **No Parallel Steps**: No parallel steps are allowed within a single MO
- **Consistent Spacing**: Uniform spacing between step boxes within each MO
- **Alignment**: Step boxes align horizontally within their respective MO rows

### 4.3 Connection Line Routing
- **Intra-MO Connections**: Horizontal lines connect sequential steps within the same MO
- **Inter-MO Dependencies**: Dependency lines route as follows:
  - Exit from right edge of child MO's final step
  - Connect to bottom edge of parent MO's first step
  - Lines may route around other elements to avoid overlap
- **Visual Flow**: Connection pattern clearly demonstrates production sequence and blocking dependencies

### 4.4 Text Content Management
- **Step Names**: Display step names from database on top line of each box
- **Workcell Names**: Display workcell names from database on bottom line of each box
- **Character Limits**: Implement character limits to ensure text fits within box dimensions
- **Text Truncation**: Crop text with ellipsis (...) when content exceeds available space

## 5. User Interface Requirements

### 5.1 Display Elements
- **MO Identifier**: Clearly labeled MO numbers (e.g., "MOX 123")
- **Step Boxes**: Rounded rectangular boxes containing step and workcell information
- **Step Content**: Two-line text format with step name (top) and workcell name (bottom)
- **Status Indication**: Background color coding to show current step status
- **Connection Lines**: Dependency flow visualization between steps and MOs

### 5.2 Interactions
- **Read-Only Interface**: No editing capabilities required
- **No Hover Actions**: No tooltip or popup information on hover
- **No Click Actions**: No detailed views or drill-down functionality
- **Refresh Button**: Manual refresh capability to update current status

### 5.3 Navigation
- **Static View**: Single screen display of all relevant MOs
- **No Filtering**: Display all MOs and steps without filter options
- **No Grouping**: No categorization or grouping features required

### 5.4 Visual Consistency
- **Uniform Box Sizes**: All step boxes maintain consistent dimensions
- **Standard Fonts**: Consistent typography across all interface elements
- **Color Standards**: Standardized color palette for status indication
- **Line Consistency**: Uniform line thickness and styling for all connections

## 6. Technical Requirements

### 6.1 Performance Specifications
- **Scale**: Support up to 1,000 steps simultaneously
- **Response Time**: Initial load should complete within 3 seconds
- **Memory Usage**: Optimize for large dataset visualization

### 6.2 Data Refresh
- **Manual Refresh**: Refresh button to reload current status
- **No Auto-Refresh**: Real-time updates not required
- **Data Consistency**: Ensure step states reflect current MES system status

### 6.3 Rendering Requirements
- **Responsive Layout**: Adapt to different screen sizes while maintaining step box readability
- **Visual Clarity**: Ensure step boxes and connection lines remain clear at scale
- **Performance Optimization**: Efficient rendering for large datasets with 1,000+ step boxes
- **Text Rendering**: Optimize text truncation and two-line formatting within boxes
- **Color Management**: Consistent color rendering across different displays and browsers

## 7. Business Rules

### 7.1 State Transitions
- Steps can only progress forward in sequence
- A step cannot be "Ready" until all dependencies are met
- Parent MO steps cannot start until all child MO final steps are complete

### 7.2 Dependency Logic
- **Sequential Dependency**: Step N+1 depends on Step N within the same MO
- **Hierarchical Dependency**: Parent MO Step 1 depends on all child MO final steps
- **No Circular Dependencies**: System must prevent circular dependency chains

### 7.3 Status Propagation
- Child MO completion status affects parent MO readiness
- Hold or cancellation states may impact dependent steps
- Status changes should be reflected immediately upon refresh

## 8. Data Integration

### 8.1 MES System Integration
- Interface consumes real-time data from existing MES system
- Data structure should align with current MO and routing tables
- No data modification capabilities required from this interface

### 8.2 Required Data Elements
- **MO Information**: MO identification and hierarchy relationships
- **Step Details**: Step names from route definitions in database
- **Workcell Information**: Workcell names associated with each step
- **Route Definitions**: Step sequences and order within each MO
- **Status Data**: Current status of each production step
- **Dependency Mappings**: Relationships between MOs and steps

### 8.3 Data Quality Requirements
- **Text Length Handling**: System should accommodate variable length step and workcell names
- **Character Encoding**: Support for special characters in step and workcell names
- **Data Consistency**: Ensure step and workcell names match current database values
- **Status Synchronization**: Real-time accuracy of step status information

## 9. Future Considerations

### 9.1 Potential Enhancements
- Tooltip information on hover (step details, timing, operators, progress percentage)
- Click-through to detailed step information or workcell dashboard
- Filter and search capabilities by step name, workcell, or status
- Auto-refresh options with configurable intervals
- Export functionality for status reports
- Step box resizing options for different screen sizes
- Additional visual indicators within step boxes (progress bars, icons)

### 9.2 Scalability
- Design should accommodate future expansion beyond 1,000 steps
- Architecture should support additional MO relationship types
- Interface should be extensible for additional step states
- Step box design should accommodate longer text fields if needed
- Connection line routing should scale efficiently with complex hierarchies

## 10. Acceptance Criteria

### 10.1 Visual Requirements
- [ ] All step boxes display with correct background colors indicating current status
- [ ] Step names and workcell names display correctly on two lines within each box
- [ ] Text truncation works properly for long step or workcell names
- [ ] All step boxes maintain consistent size regardless of content length
- [ ] Connection lines accurately represent dependencies and flow correctly
- [ ] Hierarchical structure is clearly visible and intuitive
- [ ] Interface remains readable with up to 1,000 steps

### 10.2 Layout Requirements
- [ ] Child MO steps align properly with their MO identifier labels
- [ ] Parent MO steps are positioned correctly (shifted right) to show dependencies
- [ ] Connection lines route properly from right edge of final child steps to bottom edge of parent first steps
- [ ] No visual overlap between step boxes or connection lines
- [ ] Consistent spacing maintained between all elements

### 10.3 Functional Requirements
- [ ] Read-only interface prevents accidental modifications
- [ ] Refresh button successfully updates all displayed data
- [ ] Step statuses accurately reflect current MES system status
- [ ] Dependency relationships are correctly visualized
- [ ] Color coding accurately represents all six status states

### 10.4 Performance Requirements
- [ ] Initial load completes within 3 seconds for maximum dataset
- [ ] Interface remains responsive during data refresh
- [ ] Visual elements render correctly across different screen sizes
- [ ] Memory usage remains within acceptable limits for large datasets
- [ ] Text rendering performs efficiently with character limits and truncation

---

**Document Version**: 1.0  
**Last Updated**: October 22, 2025  
**Status**: Draft for Review