# Window.location Audit Report

## Summary
All 9 remaining `window.location` usages in the codebase are justified and cannot be replaced with Inertia router.

## Breakdown by File

### 1-2. `resources/js/utils/route.ts` (2 usages)
**Lines:** 43, 45  
**Code:**
```typescript
// Note: window.location.origin is acceptable here as this is a utility function
// that builds absolute URLs for various purposes
const url = new URL(window.location.origin);
```
**Justification:** This is a utility function that builds absolute URLs. It needs the origin to construct proper URLs and is not related to navigation.

### 3-5. `resources/js/utils/download.ts` (3 usages)
**Lines:** 17, 19, 20  
**Code:**
```typescript
// Note: window.location.origin is required here for security checks in file downloads
const urlObj = new URL(url, window.location.origin);
if (urlObj.origin !== window.location.origin) {
```
**Justification:** Required for security checks to determine if a download is cross-origin. This is necessary for proper handling of file downloads and cannot be replaced with Inertia.

### 6-7. `resources/js/components/camera-capture.tsx` (2 usages)
**Lines:** 27, 28  
**Code:**
```typescript
// Note: window.location is required here for security checks - camera access requires HTTPS
if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
```
**Justification:** Browser security requirement - camera API only works on HTTPS or localhost. This check prevents runtime errors and provides a helpful error message.

### 8-9. `resources/js/pages/audit-logs/index.tsx` (2 usages)
**Lines:** 131, 132  
**Code:**
```typescript
// Using window.location.href for file download - Inertia router doesn't handle file downloads
window.location.href = route('audit-logs.export', localFilters);
```
**Justification:** File download endpoint. Inertia router cannot handle file downloads, so direct navigation is required.

## Conclusion
All remaining `window.location` usages are:
- ✅ Properly documented with explanatory comments
- ✅ Used for legitimate purposes that cannot be handled by Inertia
- ✅ Following security best practices

No further action is required.