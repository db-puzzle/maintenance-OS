#!/bin/bash

# Script to analyze frontend router navigation calls in the Laravel project
# Usage: ./check_frontend_routes.sh [filter]
# Example: ./check_frontend_routes.sh production

# Optional parameter to filter by route name
FILTER_ROUTE="$1"

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Checking frontend router navigation calls...${NC}"
echo "============================================"

if [ ! -z "$FILTER_ROUTE" ]; then
    echo -e "${YELLOW}Filtering for route: $FILTER_ROUTE${NC}"
    echo ""
fi

# Counter for summary
route_count=0
path_count=0
other_count=0

# Find all router.visit calls with route() function
echo -e "\n${GREEN}Routes using route() function:${NC}"
echo "------------------------------"
grep -r "router\.visit(route(" resources/js --include="*.tsx" --include="*.ts" | grep -v "node_modules" | while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    content=$(echo "$line" | cut -d: -f2-)
    
    # Extract route name - improved regex to capture full route name
    route_name=$(echo "$content" | grep -oE "route\(['\"]([^'\"]+)['\"]" | sed "s/route(['\"]//g" | sed "s/['\"]$//g")
    
    if [ ! -z "$route_name" ]; then
        # Apply filter if provided
        if [ -z "$FILTER_ROUTE" ] || [[ "$route_name" == *"$FILTER_ROUTE"* ]]; then
            ((route_count++))
            echo ""
            echo -e "📍 ${BLUE}File:${NC} $file"
            echo -e "   ${YELLOW}Route:${NC} $route_name"
            
            # Clean up the content for better display
            clean_content=$(echo "$content" | sed 's/^[[:space:]]*//' | fold -w 100 -s)
            echo "   Code:"
            echo "$clean_content" | sed 's/^/     /'
        fi
    fi
done

echo ""
echo ""
echo -e "${GREEN}Direct path navigation:${NC}"
echo "----------------------"
# Find all router.visit calls with direct paths
grep -r "router\.visit(['\"]/" resources/js --include="*.tsx" --include="*.ts" | grep -v "node_modules" | while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    content=$(echo "$line" | cut -d: -f2-)
    
    # Extract path - improved regex
    path=$(echo "$content" | grep -oE "router\.visit\(['\"][^'\"]+['\"]" | sed "s/router\.visit(['\"]//g" | sed "s/['\"]$//g")
    
    if [ ! -z "$path" ]; then
        # Apply filter if provided
        if [ -z "$FILTER_ROUTE" ] || [[ "$path" == *"$FILTER_ROUTE"* ]]; then
            ((path_count++))
            echo ""
            echo -e "📍 ${BLUE}File:${NC} $file"
            echo -e "   ${YELLOW}Path:${NC} $path"
            
            # Clean up the content for better display
            clean_content=$(echo "$content" | sed 's/^[[:space:]]*//' | fold -w 100 -s)
            echo "   Code:"
            echo "$clean_content" | sed 's/^/     /'
        fi
    fi
done

echo ""
echo ""
echo -e "${GREEN}Other navigation methods (router.get, router.post, etc.):${NC}"
echo "---------------------------------------------------------"
grep -rE "router\.(get|post|put|patch|delete|reload)\(" resources/js --include="*.tsx" --include="*.ts" | grep -v "node_modules" | while IFS= read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    content=$(echo "$line" | cut -d: -f2-)
    
    # Extract method and route
    method=$(echo "$content" | grep -oE "router\.(get|post|put|patch|delete|reload)" | sed 's/router\.//')
    
    if [ ! -z "$method" ]; then
        # Apply filter if provided (check in the content)
        if [ -z "$FILTER_ROUTE" ] || [[ "$content" == *"$FILTER_ROUTE"* ]]; then
            ((other_count++))
            echo ""
            echo -e "📍 ${BLUE}File:${NC} $file"
            echo -e "   ${YELLOW}Method:${NC} $method"
            
            # Clean up the content for better display
            clean_content=$(echo "$content" | sed 's/^[[:space:]]*//' | fold -w 100 -s)
            echo "   Code:"
            echo "$clean_content" | sed 's/^/     /'
        fi
    fi
done

# Calculate totals
total_route_calls=$(grep -r "router\.visit(route(" resources/js --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | tr -d ' ')
total_path_calls=$(grep -r "router\.visit(['\"]/" resources/js --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | tr -d ' ')
total_other_calls=$(grep -rE "router\.(get|post|put|patch|delete|reload)\(" resources/js --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | tr -d ' ')

echo ""
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "--------"
echo -e "Total router.visit(route()) calls: ${GREEN}$total_route_calls${NC}"
echo -e "Total router.visit() with direct paths: ${GREEN}$total_path_calls${NC}"
echo -e "Total other navigation methods: ${GREEN}$total_other_calls${NC}"
echo -e "Total navigation calls: ${YELLOW}$((total_route_calls + total_path_calls + total_other_calls))${NC}"
echo ""

# Add usage information
if [ -z "$FILTER_ROUTE" ]; then
    echo -e "${YELLOW}Tip:${NC} You can filter results by passing a route name as parameter"
    echo "Example: ./check_frontend_routes.sh production"
    echo ""
fi

# Check for potential issues
echo -e "${BLUE}Checking for potential issues...${NC}"
echo "--------------------------------"

# Check for hardcoded URLs
hardcoded_count=$(grep -r "router\.visit(['\"][^/]" resources/js --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "route(" | wc -l | tr -d ' ')
if [ "$hardcoded_count" -gt 0 ]; then
    echo -e "${RED}⚠️  Found $hardcoded_count potential hardcoded URLs (not using route() helper)${NC}"
fi

# Check for window.location usage
window_location_count=$(grep -r "window\.location" resources/js --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$window_location_count" -gt 0 ]; then
    echo -e "${RED}⚠️  Found $window_location_count uses of window.location (consider using Inertia router)${NC}"
fi

echo ""
echo "Done! 🎉"