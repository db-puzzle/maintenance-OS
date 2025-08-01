#!/bin/bash

echo "Checking for missing Inertia pages..."
echo "===================================="

# Get all Inertia::render paths
pages=$(grep -r "Inertia::render" app/Http/Controllers --include="*.php" | grep -oE "'[^']+'" | grep -v "Inertia::render" | sort | uniq)

missing_count=0
found_count=0

while IFS= read -r page; do
    # Remove quotes
    page_path=$(echo "$page" | sed "s/'//g")
    
    # Convert to file path
    file_path="resources/js/pages/${page_path}.tsx"
    
    if [ ! -f "$file_path" ]; then
        echo "❌ MISSING: $file_path (referenced as: $page)"
        ((missing_count++))
    else
        ((found_count++))
    fi
done <<< "$pages"

echo ""
echo "Summary:"
echo "--------"
echo "✅ Found: $found_count pages"
echo "❌ Missing: $missing_count pages"