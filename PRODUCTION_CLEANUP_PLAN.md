# Production Cleanup Plan

## Overview

This document outlines all the issues found during the comprehensive linting and analysis of the codebase, along with a prioritized action plan for resolving them before production deployment.

## Current Status

### Summary of Issues Found

1. **TypeScript Errors**: 156 problems (155 errors, 1 warning)
   - Merge conflicts: 2 files with unresolved merge conflicts
   - Type safety issues: 104 `@typescript-eslint/no-explicit-any` errors
   - Unused variables: 46 `@typescript-eslint/no-unused-vars` errors
   - React hooks violations: 2 errors + 1 warning

2. **Security Vulnerabilities**: 
   - 1 critical npm vulnerability in `form-data` package

3. **Missing PHP/Laravel Analysis**:
   - PHP runtime not available in current environment
   - Laravel Pint not installed
   - PHPStan not configured

## Detailed Issues Breakdown

### 1. Critical Issues (Must Fix Before Production)

#### 1.1 Merge Conflicts
**Files affected:**
- `/workspace/resources/js/types/maintenance.ts` (lines 257-275)
- `/workspace/resources/js/types/production.ts` (lines 362-377)

**Action:** Resolve merge conflicts immediately

#### 1.2 React Hooks Violations
**Files affected:**
- `/workspace/resources/js/Pages/work-orders/show.tsx`
  - Line 129: Conditional hook call
  - Line 145: Conditional hook call
  - Line 296: Missing dependencies warning

**Action:** Refactor to ensure hooks are called unconditionally

#### 1.3 Security Vulnerability
- **Package:** form-data 4.0.0 - 4.0.3
- **Severity:** Critical
- **Issue:** Uses unsafe random function for choosing boundary
- **Action:** Run `npm audit fix`

### 2. Type Safety Issues (High Priority)

#### 2.1 Explicit Any Types (104 occurrences)
**Most affected files:**
- `/workspace/resources/js/Pages/production/items/show.tsx` (42 instances)
- `/workspace/resources/js/components/AssetRoutinesTab.tsx` (19 instances)
- `/workspace/resources/js/Pages/production/shipments/create.tsx` (8 instances)

**Action:** Replace `any` types with proper type definitions

#### 2.2 Unused Variables (46 occurrences)
**Most affected files:**
- `/workspace/resources/js/Pages/production/routing/show.tsx` (5 unused vars)
- Various other files with 1-3 unused variables each

**Action:** Remove or prefix with underscore (_) if intentionally unused

### 3. Code Quality Issues (Medium Priority)

#### 3.1 ESLint Configuration
- Current config is properly set up with TypeScript and React rules
- Prettier integration is configured

**Action:** Continue using current configuration

#### 3.2 Missing Type Definitions
- Some components using implicit any types
- Missing proper interfaces for complex data structures

**Action:** Create comprehensive type definitions

## Action Plan

### Phase 1: Critical Fixes (Day 1)

1. **Resolve Merge Conflicts**
   ```bash
   # Fix merge conflicts in:
   # - resources/js/types/maintenance.ts
   # - resources/js/types/production.ts
   ```

2. **Fix Security Vulnerability**
   ```bash
   npm audit fix
   ```

3. **Fix React Hooks Violations**
   - Refactor conditional hooks in work-orders/show.tsx
   - Add missing dependencies to useMemo

### Phase 2: Type Safety (Days 2-3)

1. **Create Type Definition Files**
   - Create `types/api-responses.ts` for API response types
   - Create `types/form-data.ts` for form interfaces
   - Update existing types to remove `any`

2. **Fix TypeScript Errors**
   ```bash
   # Run TypeScript compiler to verify fixes
   npm run types
   ```

3. **Remove Unused Variables**
   ```bash
   # Run ESLint with autofix
   npm run lint
   ```

### Phase 3: PHP/Laravel Analysis (Day 4)

1. **Set Up PHP Analysis Tools**
   ```bash
   # Install Laravel Pint (already in composer.json)
   composer install
   
   # Install PHPStan
   composer require --dev phpstan/phpstan phpstan/phpstan-laravel
   ```

2. **Create PHPStan Configuration**
   ```yaml
   # phpstan.neon
   includes:
       - vendor/phpstan/phpstan-laravel/extension.neon
   parameters:
       level: 6
       paths:
           - app
           - database
   ```

3. **Run PHP Analysis**
   ```bash
   # Laravel Pint
   ./vendor/bin/pint
   
   # PHPStan
   ./vendor/bin/phpstan analyse
   ```

### Phase 4: Testing & Validation (Day 5)

1. **Run All Tests**
   ```bash
   # PHP tests
   php artisan test
   
   # TypeScript compilation
   npm run types
   
   # ESLint
   npm run lint
   ```

2. **Build for Production**
   ```bash
   npm run build
   ```

## Automation Scripts

### 1. Pre-commit Hook
Create `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm run types && npm run lint
```

### 2. CI/CD Pipeline
Add to your CI/CD configuration:
```yaml
- name: TypeScript Check
  run: npm run types
  
- name: ESLint Check
  run: npm run lint
  
- name: PHP Lint
  run: ./vendor/bin/pint --test
  
- name: PHPStan
  run: ./vendor/bin/phpstan analyse
```

## Monitoring & Maintenance

1. **Regular Audits**
   - Run `npm audit` weekly
   - Run PHPStan analysis before each release
   - Monitor TypeScript strict mode compliance

2. **Code Review Checklist**
   - No `any` types without justification
   - All variables used or prefixed with `_`
   - No merge conflicts
   - Hooks called unconditionally

## Success Criteria

- [ ] Zero merge conflicts
- [ ] Zero React hooks violations
- [ ] Zero security vulnerabilities
- [ ] Less than 10 `any` types (with justification)
- [ ] Zero unused variables
- [ ] All tests passing
- [ ] Successful production build

## Estimated Timeline

- **Total Duration:** 5 days
- **Critical fixes:** 1 day
- **Type safety improvements:** 2 days
- **PHP/Laravel analysis:** 1 day
- **Testing & validation:** 1 day

## Next Steps

1. Start with Phase 1 immediately
2. Set up automated checks in CI/CD
3. Schedule regular code quality reviews
4. Consider adding more strict TypeScript rules gradually