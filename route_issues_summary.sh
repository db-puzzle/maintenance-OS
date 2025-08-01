#!/bin/bash

echo "==================================="
echo "ROUTE ISSUES SUMMARY"
echo "==================================="
echo ""

echo "1. CRITICAL: Work-Order Related Missing Pages"
echo "---------------------------------------------"
grep -r "Inertia::render" app/Http/Controllers/WorkOrders --include="*.php" | while IFS= read -r line; do
    if [[ $line =~ Inertia::render\([\'\"](.*?)[\'\"] ]]; then
        page="${BASH_REMATCH[1]}"
        page_file="resources/js/pages/${page}.tsx"
        
        if [ ! -f "$page_file" ]; then
            echo "❌ Missing: $page_file"
            echo "   Used in: $(echo "$line" | cut -d: -f1)"
        fi
    fi
done

echo ""
echo "2. Frontend Navigation to Non-Existent Pages"
echo "--------------------------------------------"
echo "Work-order routes that may fail:"
grep -r "router\.visit.*work-orders\.(create|execute|validate|approve|planning)" resources/js --include="*.tsx" | grep -v "// TODO" | while read -r line; do
    echo "⚠️  $line"
done

echo ""
echo "3. Other High-Impact Missing Pages"
echo "----------------------------------"
echo "❌ Missing: resources/js/pages/Roles/* (4 pages)"
echo "❌ Missing: resources/js/pages/production/executions/* (3 pages)"
echo "❌ Missing: resources/js/pages/Production/QualityChecks/* (4 pages)"
echo "❌ Missing: resources/js/pages/Production/Steps/* (4 pages)"
echo "❌ Missing: resources/js/pages/Forms/* (4 pages)"

echo ""
echo "4. Recommendations"
echo "------------------"
echo "• For work-orders: Update controllers to use existing pages or create missing pages"
echo "• For production modules: Many pages are missing - prioritize based on usage"
echo "• Consider creating placeholder pages that redirect to appropriate locations"
echo "• Update frontend navigation to match actual available routes"

echo ""
echo "Total Missing Pages: 49"
echo "Critical Work-Order Pages: 4 (create, execute, approve, planning)"