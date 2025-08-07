#!/bin/bash

echo "Fixing unused imports and variables..."

# Files with many unused imports that can be cleaned up
FILES_TO_FIX=(
    "resources/js/components/app-sidebar.tsx"
    "resources/js/components/EditRoutineSheet.tsx"
    "resources/js/components/RuntimeHistory.tsx"
    "resources/js/components/production/CreateManufacturingOrderDialog.tsx"
    "resources/js/components/production/HierarchicalConfiguration.tsx"
    "resources/js/components/production/ManufacturingOrderRouteTab.tsx"
    "resources/js/components/production/RoutingStepsTab.tsx"
    "resources/js/components/work-orders/WorkOrderFormComponent.tsx"
    "resources/js/components/work-orders/tabs/WorkOrderDetailsTab.tsx"
    "resources/js/components/work-orders/tabs/WorkOrderPlanningTab.tsx"
    "resources/js/pages/production/items/show.tsx"
    "resources/js/pages/production/manufacturing-orders/show.tsx"
    "resources/js/pages/production/routing/show.tsx"
    "resources/js/pages/production/steps/execute.tsx"
    "resources/js/pages/work-orders/show.tsx"
    "resources/js/pages/users/show.tsx"
    "resources/js/components/users/UserFormComponent.tsx"
    "resources/js/pages/production/bom/show.tsx"
    "resources/js/pages/production/manufacturing-orders/create.tsx"
    "resources/js/pages/production/shipments/create.tsx"
    "resources/js/pages/production/shipments/show.tsx"
    "resources/js/pages/production/tracking/dashboard.tsx"
)

for FILE in "${FILES_TO_FIX[@]}"; do
    echo "Processing $FILE..."
    npx eslint "$FILE" --fix --quiet 2>/dev/null
done

echo "Running global ESLint fix..."
npx eslint resources/js --ext .ts,.tsx --fix --quiet

echo "Completed auto-fixing unused imports!"
