#!/bin/bash

echo "=== Fixing Critical Issues ==="
echo

# 1. Fix npm security vulnerability
echo "1. Fixing npm security vulnerability..."
npm audit fix
echo

# 2. Show merge conflicts for manual resolution
echo "2. Merge conflicts found in:"
echo "   - resources/js/types/maintenance.ts (lines 257-275)"
echo "   - resources/js/types/production.ts (lines 362-377)"
echo
echo "Please manually resolve these merge conflicts before proceeding."
echo

# 3. Create a backup of files with React hooks violations
echo "3. Creating backups of files with React hooks violations..."
cp resources/js/Pages/work-orders/show.tsx resources/js/Pages/work-orders/show.tsx.backup
echo "   - Backed up work-orders/show.tsx"
echo
echo "Please fix conditional hook calls at:"
echo "   - Line 129: Move useMemo outside of conditional"
echo "   - Line 145: Move useMemo outside of conditional"
echo "   - Line 296: Add missing dependencies to useMemo"
echo

# 4. Summary
echo "=== Summary ==="
echo "✓ npm audit fix has been run"
echo "⚠ Merge conflicts need manual resolution"
echo "⚠ React hooks violations need manual fixes"
echo
echo "After fixing these critical issues, run:"
echo "  npm run types  # Check TypeScript compilation"
echo "  npm run lint   # Check ESLint errors"