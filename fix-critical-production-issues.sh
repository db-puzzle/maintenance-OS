#!/bin/bash

echo "====================================="
echo "Fix Critical Production Issues Script"
echo "====================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Fixing Route/Page Casing Issues...${NC}"
echo "   This will update all controller Inertia render calls from 'pages/' to 'Pages/'"
echo ""

# Fix route casing issues in controllers
find app/Http/Controllers -name "*.php" -type f -exec sed -i 's/inertia("pages\//inertia("Pages\//g' {} \;
find app/Http/Controllers -name "*.php" -type f -exec sed -i "s/inertia('pages\//inertia('Pages\//g" {} \;
find app/Http/Controllers -name "*.php" -type f -exec sed -i 's/Inertia::render("pages\//Inertia::render("Pages\//g' {} \;
find app/Http/Controllers -name "*.php" -type f -exec sed -i "s/Inertia::render('pages\//Inertia::render('Pages\//g" {} \;

echo -e "${GREEN}✓ Route casing fixes applied${NC}"
echo ""

echo -e "${YELLOW}2. Running ESLint auto-fix...${NC}"
npm run lint
echo ""

echo -e "${YELLOW}3. Checking TypeScript compilation...${NC}"
npx tsc --noEmit 2>&1 | head -20
echo ""

echo -e "${YELLOW}4. Production Build Test...${NC}"
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Production build successful${NC}"
else
    echo -e "${RED}✗ Production build failed${NC}"
fi
echo ""

echo -e "${YELLOW}Summary:${NC}"
echo "1. Route casing issues should be fixed"
echo "2. ESLint has auto-fixed what it can"
echo "3. TypeScript errors still need manual fixes (see report)"
echo "4. Build process tested"
echo ""
echo "Next steps:"
echo "- Fix remaining TypeScript compilation errors manually"
echo "- Review PRODUCTION_READINESS_REPORT_LATEST.md for detailed issues"
echo "- Run this script again after fixing TypeScript errors"
