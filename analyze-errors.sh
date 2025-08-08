#!/bin/bash

echo "=== Error Analysis Report ==="
echo "Generated at: $(date)"
echo

# TypeScript Errors
echo "## TypeScript Compilation Errors"
if [ -f typescript-errors.txt ]; then
    echo "### Merge Conflicts:"
    grep -c "Merge conflict marker" typescript-errors.txt || echo "0"
    echo
fi

# ESLint Errors
echo "## ESLint Errors Summary"
if [ -f eslint-errors.txt ]; then
    echo "### Total Errors:"
    grep -E "^[[:space:]]*[0-9]+:[0-9]+[[:space:]]+error" eslint-errors.txt | wc -l
    
    echo
    echo "### Error Types Breakdown:"
    grep -E "^[[:space:]]*[0-9]+:[0-9]+[[:space:]]+error" eslint-errors.txt | \
        sed -E 's/.*error[[:space:]]+(.*)$/\1/' | \
        sed -E 's/@typescript-eslint\///' | \
        awk '{print $NF}' | \
        sort | uniq -c | sort -rn
    
    echo
    echo "### Most Affected Files (Top 10):"
    grep -E "^/workspace" eslint-errors.txt | \
        sort | uniq -c | sort -rn | head -10
fi

# Security Vulnerabilities
echo
echo "## Security Vulnerabilities"
npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities | to_entries | .[] | "- \(.value) \(.key) severity vulnerabilities"' 2>/dev/null || echo "Unable to check"

echo
echo "## Recommendations Priority"
echo "1. Fix merge conflicts immediately"
echo "2. Run 'npm audit fix' for security"
echo "3. Fix React hooks violations"
echo "4. Replace 'any' types with proper types"
echo "5. Remove or rename unused variables"