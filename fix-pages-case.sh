#!/bin/bash

# Fix Git case sensitivity issue for Pages -> pages
# This script will rename all files tracked as Pages/* to pages/*

echo "Starting to fix case sensitivity issue..."
echo "Converting all 'Pages' paths to 'pages' in Git..."

# Get all files that are tracked with uppercase Pages
git ls-files | grep "resources/js/Pages/" > uppercase_files.txt

# Count files to process
total_files=$(wc -l < uppercase_files.txt)
echo "Found $total_files files to rename"

# Process each file
while IFS= read -r file; do
    # Calculate the new lowercase path
    new_file=$(echo "$file" | sed 's|resources/js/Pages/|resources/js/pages/|')
    
    # Use git mv to rename in Git (forces the case change)
    echo "Renaming: $file -> $new_file"
    git mv "$file" "$new_file" 2>/dev/null || git mv -f "$file" "$new_file"
done < uppercase_files.txt

# Clean up
rm uppercase_files.txt

echo "Done! All Pages files have been renamed to pages."
echo ""
echo "Summary of changes:"
echo "- Uppercase Pages files: $(git ls-files | grep -c "resources/js/Pages/")"
echo "- Lowercase pages files: $(git ls-files | grep -c "resources/js/pages/")"
