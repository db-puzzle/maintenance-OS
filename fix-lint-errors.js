#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript files with errors
const getLintErrors = () => {
    try {
        const output = execSync('npx eslint . --ext .ts,.tsx,.js,.jsx --format json', {
            encoding: 'utf8',
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        return JSON.parse(output);
    } catch (error) {
        if (error.stdout) {
            return JSON.parse(error.stdout);
        }
        throw error;
    }
};

// Group errors by type
const groupErrors = (results) => {
    const grouped = {
        unusedVars: [],
        noExplicitAny: [],
        reactHooksExhaustiveDeps: [],
        banTsComment: [],
        other: []
    };

    results.forEach(file => {
        if (file.errorCount === 0 && file.warningCount === 0) return;

        file.messages.forEach(msg => {
            const error = {
                file: file.filePath,
                line: msg.line,
                column: msg.column,
                message: msg.message,
                ruleId: msg.ruleId,
                source: msg.source
            };

            if (msg.ruleId === '@typescript-eslint/no-unused-vars') {
                grouped.unusedVars.push(error);
            } else if (msg.ruleId === '@typescript-eslint/no-explicit-any') {
                grouped.noExplicitAny.push(error);
            } else if (msg.ruleId === 'react-hooks/exhaustive-deps') {
                grouped.reactHooksExhaustiveDeps.push(error);
            } else if (msg.ruleId === '@typescript-eslint/ban-ts-comment') {
                grouped.banTsComment.push(error);
            } else {
                grouped.other.push(error);
            }
        });
    });

    return grouped;
};

// Main execution
console.log('Analyzing lint errors...');
const results = getLintErrors();
const grouped = groupErrors(results);

console.log('\n=== Lint Error Summary ===');
console.log(`Unused variables/imports: ${grouped.unusedVars.length}`);
console.log(`Explicit any types: ${grouped.noExplicitAny.length}`);
console.log(`React hooks deps: ${grouped.reactHooksExhaustiveDeps.length}`);
console.log(`Ban TS comments: ${grouped.banTsComment.length}`);
console.log(`Other: ${grouped.other.length}`);

// Save detailed report
const report = {
    summary: {
        totalFiles: results.length,
        filesWithErrors: results.filter(f => f.errorCount > 0 || f.warningCount > 0).length,
        totalErrors: results.reduce((sum, f) => sum + f.errorCount, 0),
        totalWarnings: results.reduce((sum, f) => sum + f.warningCount, 0)
    },
    grouped,
    fileList: results.filter(f => f.errorCount > 0 || f.warningCount > 0).map(f => ({
        path: f.filePath,
        errors: f.errorCount,
        warnings: f.warningCount
    }))
};

fs.writeFileSync('lint-report.json', JSON.stringify(report, null, 2));
console.log('\nDetailed report saved to lint-report.json');

// Output files that need manual attention for 'any' types
console.log('\n=== Files with "any" types that need attention ===');
const anyFiles = new Set(grouped.noExplicitAny.map(e => e.file));
anyFiles.forEach(file => {
    const relPath = path.relative(process.cwd(), file);
    const count = grouped.noExplicitAny.filter(e => e.file === file).length;
    console.log(`  ${relPath}: ${count} occurrences`);
});
