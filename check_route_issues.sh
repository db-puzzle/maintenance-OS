#!/bin/bash

echo "Comprehensive Route Issue Check"
echo "==============================="
echo ""

# First, check for routes that point to non-existent controller methods
echo "1. Routes with potentially missing controller methods:"
echo "----------------------------------------------------"
grep -r "Route::" routes --include="*.php" | while IFS= read -r line; do
    # Extract controller and method
    if [[ $line =~ \[([A-Za-z\\]+)::class,\ \'([a-zA-Z]+)\'\] ]]; then
        controller="${BASH_REMATCH[1]}"
        method="${BASH_REMATCH[2]}"
        
        # Convert namespace to file path
        controller_file="app/Http/Controllers/${controller//\\/\/}.php"
        
        # Check if method exists in controller
        if [ -f "$controller_file" ]; then
            if ! grep -q "public function $method" "$controller_file"; then
                echo "❌ Missing method: $controller::$method"
                echo "   Route definition: $line"
                echo ""
            fi
        fi
    fi
done

# Check for Inertia renders that don't have corresponding pages
echo ""
echo "2. Controllers rendering non-existent Inertia pages:"
echo "---------------------------------------------------"
grep -r "Inertia::render" app/Http/Controllers --include="*.php" | while IFS= read -r line; do
    if [[ $line =~ Inertia::render\([\'\"](.*?)[\'\"] ]]; then
        page="${BASH_REMATCH[1]}"
        page_file="resources/js/pages/${page}.tsx"
        
        if [ ! -f "$page_file" ]; then
            controller_file=$(echo "$line" | cut -d: -f1)
            controller_name=$(basename "$controller_file" .php)
            echo "❌ $controller_name renders missing page: $page"
            echo "   Expected file: $page_file"
            echo ""
        fi
    fi
done

# Check for frontend navigation to potentially problematic routes
echo ""
echo "3. Frontend navigation to work-order routes:"
echo "-------------------------------------------"
grep -r "router\.visit.*work-orders\." resources/js --include="*.tsx" --include="*.ts" | grep -v "// TODO" | head -20