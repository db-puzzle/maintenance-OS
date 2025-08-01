#!/bin/bash

echo "Checking Route to Controller Method Mappings"
echo "==========================================="
echo ""

# Parse route files and check if methods exist
find routes -name "*.php" -type f | while read -r route_file; do
    echo "Checking $route_file:"
    echo "-------------------"
    
    # Extract route definitions with controller and method
    grep -E "Route::(get|post|put|patch|delete|any)" "$route_file" | while IFS= read -r line; do
        # Skip commented lines
        if [[ $line =~ ^[[:space:]]*// ]]; then
            continue
        fi
        
        # Extract controller class and method
        if [[ $line =~ \[([A-Za-z0-9\\]+Controller)::class,[[:space:]]*['\"]([a-zA-Z0-9_]+)['\"] ]]; then
            controller="${BASH_REMATCH[1]}"
            method="${BASH_REMATCH[2]}"
            
            # Convert to file path
            controller_path="app/Http/Controllers/${controller//\\/\/}.php"
            
            if [ -f "$controller_path" ]; then
                # Check if method exists
                if ! grep -q "public function $method" "$controller_path"; then
                    echo "❌ Missing method: ${controller}::${method}"
                    echo "   Line: $line"
                fi
            else
                echo "❌ Controller file not found: $controller_path"
                echo "   Line: $line"
            fi
        fi
    done
    echo ""
done