#!/bin/bash

echo "Starting batch lint fixes..."

# First, let's fix all the @ts-ignore to @ts-expect-error
echo "Fixing @ts-ignore to @ts-expect-error..."
find resources/js -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/@ts-ignore/@ts-expect-error/g' {} \;

# Run ESLint auto-fix again to clean up what it can
echo "Running ESLint auto-fix..."
npx eslint resources/js --ext .ts,.tsx --fix --quiet

# Count remaining issues
echo "Counting remaining issues..."
npx eslint resources/js --ext .ts,.tsx --format compact | tail -1

echo "Batch fixes completed!"
