# Git Branching Strategy

## Overview

This document outlines the branching strategy for the Maintenance OS project. We use a three-branch strategy to manage code flow from development through staging to production.

## Branch Structure

### 1. **main** (Production)
- **Purpose**: Production-ready code only
- **Deploy to**: Production environment
- **Protected**: Yes - requires pull request reviews
- **Merges from**: staging branch only
- **Auto-deploy**: Yes, to production servers

### 2. **staging** (Pre-Production)
- **Purpose**: Pre-production testing and QA
- **Deploy to**: Staging environment
- **Protected**: Yes - requires pull request reviews
- **Merges from**: development branch only
- **Auto-deploy**: Yes, to staging servers

### 3. **development** (Active Development)
- **Purpose**: Integration branch for all development work
- **Deploy to**: Development environment
- **Protected**: Yes - requires pull request reviews
- **Merges from**: feature branches
- **Auto-deploy**: Yes, to development servers

## Workflow

### Feature Development

1. **Create feature branch from development**
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/your-feature-name
   ```

2. **Work on your feature**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request to development**
   - Target branch: development
   - Requires code review
   - Must pass all tests

### Release Process

1. **Development → Staging**
   - When features are ready for QA
   - Create PR from development to staging
   - Requires approval from team lead
   - Run full test suite

2. **Staging → Production (main)**
   - After QA approval
   - Create PR from staging to main
   - Requires approval from 2 reviewers
   - Tag release with version number

### Hotfix Process

1. **Create hotfix branch from main**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-fix
   ```

2. **Apply fix and create PRs**
   - PR to main (immediate production fix)
   - PR to staging (keep staging in sync)
   - PR to development (keep development in sync)

## Branch Naming Conventions

- **Features**: `feature/short-description`
- **Bugfixes**: `bugfix/issue-description`
- **Hotfixes**: `hotfix/critical-issue`
- **Chores**: `chore/task-description`

## Commit Message Format

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks

## Environment Variables

Each branch should have its own environment configuration:

### Development
- `.env.development`
- Database: development database
- Debug: enabled
- Mail: sandbox/development SMTP

### Staging
- `.env.staging`
- Database: staging database (copy of production)
- Debug: limited
- Mail: sandbox SMTP

### Production
- `.env.production`
- Database: production database
- Debug: disabled
- Mail: production SMTP

## CI/CD Pipeline

### Development Branch
- Run tests on every push
- Deploy to development server on merge

### Staging Branch
- Run full test suite
- Security scanning
- Deploy to staging server on merge

### Main Branch
- Run full test suite
- Security scanning
- Performance tests
- Deploy to production on merge
- Create release tag

## Branch Protection Rules

### Main Branch
- Require pull request reviews (2 approvals)
- Dismiss stale reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators in restrictions

### Staging Branch
- Require pull request reviews (1 approval)
- Require status checks to pass
- Require branches to be up to date

### Development Branch
- Require pull request reviews (1 approval)
- Require status checks to pass

## Quick Reference

```bash
# Start new feature
git checkout development
git pull origin development
git checkout -b feature/my-feature

# Push feature
git push origin feature/my-feature

# Update feature branch with latest development
git checkout feature/my-feature
git fetch origin
git rebase origin/development

# Create release
git checkout development
git pull origin development
# Create PR development → staging

# Deploy to production
git checkout staging
git pull origin staging
# Create PR staging → main
```

## Important Notes

1. **Never push directly to protected branches** (main, staging, development)
2. **Always create feature branches** from development
3. **Keep branches up to date** with their parent branch
4. **Delete feature branches** after merging
5. **Tag releases** when merging to main
6. **Document breaking changes** in PR descriptions
