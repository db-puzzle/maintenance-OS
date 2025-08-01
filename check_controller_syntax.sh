#!/bin/bash

echo "Checking for remaining syntax issues in controllers..."
echo "===================================================="

# Find all controllers with the 501 response
controllers=$(grep -l "501);" app/Http/Controllers -r --include="*.php")

error_count=0

for file in $controllers; do
    # Check if there's any non-whitespace character after 501); but before the closing brace
    if grep -A 5 "501);" "$file" | grep -v "501);" | grep -v "^[[:space:]]*}" | grep -v "^[[:space:]]*$" | grep -v "^[[:space:]]*//" | grep -v "^[[:space:]]*\*" | head -1 | grep -q "[^[:space:]]"; then
        echo "❌ Potential issue in: $file"
        echo "   Lines after 501);"
        grep -A 3 "501);" "$file" | tail -n 3
        echo ""
        ((error_count++))
    fi
done

if [ $error_count -eq 0 ]; then
    echo "✅ No syntax issues found!"
else
    echo "❌ Found $error_count files with potential syntax issues"
fi