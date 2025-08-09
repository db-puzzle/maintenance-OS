# Item Picture Import Plan

## 1. Executive Summary

This plan specifies how to import item pictures in a way that seamlessly complements the existing Item import (structure-only) flow. Pictures can be imported:
- Separately via a dedicated wizard (bulk, multiple items)
- Concurrently as an optional step in the existing Item import wizard (bulk)
- Directly on a single Item page using the existing picture manager (single item)

Users will select a local folder whose files are matched to Items by filename conventions. The system enforces up to 5 pictures per item, optimizes images, and prevents unrelated uploads through a preflight validation step.

## 2. Goals and Non-Goals
- Goals:
  - Import pictures independently or alongside item import
  - Support folder selection and client-side pre-scan (no blind bulk upload)
  - Robust filename-to-item matching with flexible normalization
  - Enforce max 5 pictures per item with ordering
  - Inertia-only UX, shadcn components, background variant generation
  - Clear progress feedback (scanning and upload progress bars)
- Non-Goals:
  - General-purpose DAM features (beyond basic metadata, variants)
  - Server-side browsing of user file systems

## 3. User Flows

### 3.1 Separate Picture Import Wizard (Bulk)
1. Navigate: Items → Import Pictures
2. Choose Matching Key:
   - Item Number
3. Select Local Folder (supports directory upload via `webkitdirectory`; fallback: ZIP upload)
4. Preflight Scan (client-side):
   - Parse filenames and group by item
   - Show matched items with previews and counts
   - Show unmatched files and allow exclude-all (default)
   - Warn on >5 images per item and allow selecting which 5
   - Show a lightweight scan progress indicator if directory contains many files
5. Import:
   - Upload only matched and selected files
   - Show upload progress:
     - Overall progress bar (% of total bytes/files uploaded)
     - Per-file progress bars for current batch
     - Disable submit while uploading; provide cancel
   - Server optimizes originals (>500KB), stores, and queues variant generation
6. Results:
   - Summary page with counts: items affected, images imported, skipped, errors
   - Downloadable report (CSV/JSON) of unmatched and errors

### 3.2 Combined with Item Import Wizard (Bulk)
- Add optional "Attach Pictures" step after mapping preview:
  - Uses the same folder selection and preflight scan
  - Matching by Item Number based on mapped CSV columns
  - If new items are being created, match by the data in the CSV preview
  - Upload after items are persisted; defer if any item row failed creation
  - Show scan and upload progress bars as in the separate wizard

### 3.3 Single Item Import (Per-Item Picture Manager)
- On `Item` show page (Images tab), extend existing uploader to optionally accept a folder selection (client groups and orders files by `-1..-5` suffix)
- Respect existing limits and logic from `ItemImageController@store`:
  - Accepts up to 5 files per request (`images[]`), 10MB each; images optimized to ≤ 500KB stored original
  - If the item already has images, only allow up to the remaining slots (client and server enforce)
  - Primary assignment: if item has no primary, first uploaded is set as primary
- Show upload progress bar(s) using the existing pattern in `ItemImageUploader` (overall `Progress` bound to `useForm().progress.percentage`); optional per-file progress when uploading in small batches
- Maintain reordering, set-primary, and delete using the existing picture manager UI/actions

## 4. Filename Conventions and Matching

### 4.1 Supported Conventions
- By Item Name (requested default for naming):
  - `Item Name.jpg` → first picture
  - `Item Name-1.jpg`, `Item Name-2.jpg`, … up to `-5`
- By Item Number (recommended for reliability):
  - `ITEM-001.jpg`
  - `ITEM-001-1.jpg` … `ITEM-001-5.jpg`

Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`.

### 4.2 Normalization Rules
- Case-insensitive
- Trim whitespace
- Collapse spaces, underscores, and hyphens for matching baseline: e.g., `Widget A`, `widget-a`, `widget_a` → `widgeta`
- Remove diacritics/accents (e.g., `ação` → `acao`)
- Strip non-alphanumeric characters except the dash used as numeric suffix delimiter

### 4.3 Suffix and Ordering
- Base file without suffix (e.g., `Item Name.jpg`) counts as first image
- Explicit `-1..-5` suffixes define order; base without suffix is treated as `-1` unless both exist, then order by: `-1`, base, `-2..-5`
- If >5 matches, UI prompts to select top 5; default: lowest suffix numbers, then base

### 4.4 Conflict Handling
- Duplicate basenames with different extensions: prefer highest quality heuristic (webp > jpeg > png) unless user overrides
- Multiple items mapped to same filename (e.g., duplicate names):
  - If matching by Item Number, no conflict
  - If matching by Item Name and duplicates exist in DB or CSV, require disambiguation or switch to Item Number matching

## 5. Validation and Safeguards
- Client-side preflight filters out unmatched files by default
- Max 5 images per item enforced client- and server-side
  - Server additionally checks existing image count per item and skips extras beyond 5 total
- File type/magic bytes checked server-side
- Single file size limit 10MB (upload), optimized to ≤ 500KB stored original (as per image system spec)
- Virus scan hook (configurable)

## 6. UX Specification (Inertia + shadcn)
- Components used: `@/components/ui/*`, and existing in-project components
- Pages:
  - `resources/js/pages/production/items/import-pictures.tsx` (new wizard)
  - Extend `resources/js/pages/production/items/import.tsx` with a new optional step
  - Extend `ItemImageUploader` to optionally accept directory selection and auto-ordering for single-item flow
- Key UI elements:
  - Directory picker with drag-and-drop and `webkitdirectory` support; fallback ZIP input
  - Preflight table with:
    - Item identifier, matched count, preview thumbnails, selectable order, overflow warning
    - Unmatched files list with bulk exclude toggle (default excluded)
  - Progress indicators:
    - Scan progress (when scanning large folders)
    - Overall upload progress bar
    - Per-file progress bars for current batch
    - Status text (files uploaded/total, bytes uploaded/total)
    - Cancel upload action
  - Result summary with download of report

### 6.1 Progress Handling (Implementation Notes)
- Use Inertia `useForm` progress API for uploads (existing pattern in `ItemImageUploader`), displaying `Progress` with `progress.percentage`
- For bulk uploads with many files, upload in small batches (e.g., 5–10 files) to enable meaningful per-batch progress and avoid request limits
- Aggregate overall progress by total bytes when possible; fallback to count-based percentage when sizes are unknown
- Show a lightweight scan progress (counting files processed) during client-side preflight grouping
- Avoid tracking post-upload variant generation progress; display a non-blocking "Processing images in background" notice
- Ensure accessibility: ARIA labels for progress bars, readable status text

## 7. Backend Design

### 7.1 Reuse Existing Services & Controllers
- `App\Services\Production\ImageProcessingService` for optimization and variants
- `App\Http\Controllers\Production\ItemImageController` for per-item upload, metadata update, delete, reorder
- `App\Jobs\Production\GenerateImageVariants` for background variant creation
- `App\Http\Controllers\Production\ItemImageServeController` and routes for protected serving; `ItemImage` appends `url`, `thumbnail_url`, `medium_url`, `large_url`

### 7.2 New/Updated Endpoints (web, Inertia responses)
- Bulk wizard (avoid path conflict with per-item routes):
  - GET `production/items/images/import/wizard` → show wizard
  - POST `production/items/images/import/preflight` → optional server-side validation of manifest
  - POST `production/items/images/import` → upload files[] + manifest
- Per-item flow keeps existing:
  - POST `production/items/{item}/images` → handled by `ItemImageController@store`

### 7.3 Manifest Contract
Client sends a manifest describing the intended mapping and order:
```json
{
  "matching_key": "item_number",
  "items": [
    {
      "identifier": "ITEM-001",
      "item_id": "uuid-or-numeric",
      "images": [
        { "client_name": "Widget A.jpg", "order": 1, "is_primary": true },
        { "client_name": "Widget A-2.jpg", "order": 2 }
      ]
    }
  ]
}
```
Server trusts only order/is_primary; it validates file types, caps at 5 including existing images, and applies primary if none exists.

### 7.4 Import Logic (Shared)
- For each item:
  - Determine remaining slots: `max(0, 5 - existing_images_count)`; skip extras
  - For each image in order (respecting suffix order):
    - Validate and process via `ImageProcessingService::processItemImage`
    - Create `item_images` record with `display_order` and `is_primary`
    - Dispatch `GenerateImageVariants` job
  - If item has no primary, set first imported as primary

### 7.5 Error Reporting
- Collect per-file errors (invalid type, too large, not an image, processing failure)
- Collect per-item errors (item not found, >5 images when considering existing)
- Return aggregated errors to Inertia view and store downloadable report

## 8. Integration with Item Import
- Existing page `resources/js/pages/production/items/import.tsx` gains an optional step:
  - Toggle: "Attach pictures to these items"
  - Reuses directory selection + preflight
  - Matching key default: Item Number
  - Items created in the same run are available for mapping; upload after item creation transaction
- Service update: extend `ItemImportService` to accept an optional manifest for pictures and call the same shared import logic after item upsert

## 9. Security, Permissions, and Compliance
- Permissions required:
  - `production.items.import` to access wizard
  - `production.items.update` to attach images to items
- All times UTC and route model binding throughout
- No AJAX JSON endpoints; Inertia responses only [[memory:3313295]]
- Validate MIME signature (magic bytes), remove EXIF, scan for malware (hookable)
- Rate limit uploads and queue image processing

## 10. Performance and Reliability
- Upload batching per item; cap total concurrent uploads to avoid memory spikes
- Queue `GenerateImageVariants` per image; idempotency key on original path
- Optional resumable uploads (tus) in phase 2
- Storage structure and variant sizes as per `ImageProcessingService`

## 11. Edge Cases
- Duplicate Item Names: strongly recommend Item Number matching; block name-based matching if duplicates exist unless user selects a specific item mapping
- Special characters/accents: handled via normalization; log when normalization alters name
- Both base and `-1` provided: order as `-1`, base, `-2...`
- More than 5 images considering existing: prompt selection; server enforces cap
- Mixed extensions: pick highest-quality by default

## 12. Data Model and Migrations
- Reuse `item_images` and `item_image_variants` schema per existing Item Images spec; if already present, no changes
- If `items.primary_image_id` is not in the initial items migration, edit the existing migration (per project rule) to include it
- New tables, if needed, use new migrations; do not modify existing migrations of other tables

## 13. Testing and Acceptance Criteria
- Feature tests:
  - Bulk import pictures separately (happy path, unmatched skipped, >5 selection)
  - Combined import where items are created and pictures attached
  - Single-item import via picture manager with folder selection and ordering
  - Name vs number matching; duplicate name protection
  - Large image optimization and variant generation
  - Respect total ≤5 images when existing images are present
- Frontend tests:
  - Directory selection, preview, unmatched list, selection of top 5
  - Progress bars: scan progress, overall upload progress, per-file progress
  - Progress accessibility (ARIA), cancel behavior
  - Result summary
- Acceptance Criteria:
  - Users can import pictures separately (bulk), alongside item import (bulk), and on a single item
  - Unmatched files are not uploaded by default
  - Max 5 images per item enforced and ordered, considering existing images
  - Primary image set when none exists
  - Clear progress bars for scanning and uploads are displayed
  - All flows return Inertia responses and use shadcn components

## 14. Implementation Checklist
- Frontend
  - [ ] New page `import-pictures.tsx`
  - [ ] Extend item import wizard with optional pictures step
  - [ ] Extend per-item `ItemImageUploader` for optional folder selection and auto-ordering
  - [ ] Preflight matching, previews, unmatched handling
  - [ ] Progress bars: scan, overall upload, per-file; cancel action
- Backend
  - [ ] Routes and controller actions for bulk wizard and import
  - [ ] Shared import logic for separate, combined, and per-item flows
  - [ ] Error/report aggregation
  - [ ] Queue workers for variants
- Docs & Templates
  - [ ] Update public template guidance to include filename conventions
  - [ ] Add user guide with screenshots

## 15. Future Enhancements
- ZIP upload with server-side scan/unpack for environments without `webkitdirectory`
- Drag-to-reorder after import updates `display_order`
- AI tagging and duplicate detection

---

Appendix: Matching Pseudocode
```ts
function normalizeBase(name: string): string {
  return removeAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s-_]+/g, '');
}

function parseFile(fileName: string): { base: string; index: number } {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const name = fileName.slice(0, -(ext.length + 1));
  const m = name.match(/^(.*?)-(\d{1})$/);
  return m ? { base: normalizeBase(m[1]), index: parseInt(m[2], 10) } : { base: normalizeBase(name), index: 1 };
}
```
