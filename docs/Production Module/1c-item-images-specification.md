# Item Images System Specification

## 1. Executive Summary

This document specifies the image management system for production items in the maintenance OS. The system will enable users to upload, manage, and display multiple images per item, with support for designating a primary image, carousel viewing, and bulk import capabilities.

## 2. System Overview

### 2.1 Purpose
The Item Images System aims to provide visual documentation and identification capabilities for production items by:
- Supporting multiple image uploads per item
- Enabling primary image designation
- Providing consistent image display across the application
- Supporting bulk image import during item import processes
- Enhancing item identification through visual representation

### 2.2 Scope
This specification covers:
- Image upload and management interface
- Primary image selection mechanism
- Image storage and retrieval
- Carousel display component
- Integration with item import process
- Security and performance considerations

## 3. Functional Requirements

### 3.1 Image Upload and Management

#### FR-001: Multiple Image Upload
- Users shall be able to upload multiple images for a single item
- Supported formats: JPG, JPEG, PNG, WebP, HEIC
- Maximum file size per image: 500KB
- Maximum number of images per item: 5
- Upload interface shall support:
  - Drag and drop functionality
  - File browser selection
  - Multiple file selection in single operation
  - Upload progress indicators
  - Error handling for invalid formats/sizes
- Automatic image optimization:
  - Images larger than 500KB will be automatically resized and converted to JPEG
  - System will progressively reduce image dimensions while maintaining aspect ratio
  - JPEG quality will be adjusted (starting at 85%) to achieve target file size
  - Users will be notified when automatic optimization occurs
  - Original image will be processed before storage (no original preserved if over 500KB)

#### FR-002: Image Metadata
Each uploaded image shall store:
- Original filename
- Upload timestamp
- Uploaded by (user ID)
- File size
- Image dimensions (width x height)
- MIME type
- Is primary flag
- Display order
- Caption (optional)

#### FR-003: Primary Image Selection
- Each item must have at most one primary image
- Users can designate any uploaded image as primary
- If no primary is selected, the first uploaded image becomes primary by default
- Primary image change shall be tracked in audit logs
- UI shall clearly indicate which image is primary

#### FR-004: Image Management Actions
Users shall be able to:
- Reorder images via drag and drop
- Delete individual images (with confirmation)
- Edit image metadata (alt text, caption)
- Download original image
- View image in full resolution
- Replace an existing image while maintaining its position

### 3.2 Display Requirements

#### FR-005: Item Show Page Integration
The item show page shall include an images tab containing:
- Image upload area (when in edit mode)
- Grid view of all uploaded images
- Primary image indicator
- Image actions (set as primary, delete, edit metadata)
- Bulk actions (delete multiple)
- Image count indicator

#### FR-006: Image Preview Component
A reusable image preview component shall:
- Display the primary image by default
- Show image count badge if multiple images exist
- Support click to open carousel view
- Handle missing images gracefully
- Support lazy loading for performance
- Be responsive across devices

#### FR-007: Image Carousel Component
The carousel component shall:
- Use shadcn/ui carousel as base
- Display images in order (primary first)
- Support keyboard navigation (arrow keys)
- Support touch/swipe on mobile devices
- Show image counter (e.g., "3 of 7")
- Include zoom functionality
- Display image metadata (caption, upload info)
- Support fullscreen mode
- Include thumbnail navigation strip

### 3.3 Import Integration

#### FR-008: Image Import During Item Import
The item import process shall support:
- Reference to external image URLs in CSV
- Batch download of images from URLs
- Local directory path for bulk image files
- Image filename matching patterns
- Automatic primary image designation rules
- Import validation and error reporting

#### FR-009: Import Image Mapping
Import shall support multiple mapping strategies:
1. **URL Column**: CSV contains image URLs in dedicated columns
2. **Filename Pattern**: Images in local directory matched by item number
3. **Manifest File**: Separate JSON/CSV file mapping items to images
4. **ZIP Archive**: Upload ZIP containing images with naming convention

#### FR-010: Import Error Handling
The system shall:
- Continue import if image downloads fail
- Log all image import errors
- Provide detailed error report
- Support retry mechanism for failed images
- Validate image formats before processing

## 4. Non-Functional Requirements

### 4.1 Performance

#### NFR-001: Upload Performance
- Single image upload: < 3 seconds (excluding network time)
- Batch upload of 10 images: < 10 seconds
- Image processing (thumbnail generation): < 2 seconds per image

#### NFR-002: Display Performance
- Primary image load time: < 1 second
- Carousel initialization: < 500ms
- Image lazy loading with intersection observer
- Thumbnail generation for grid views

#### NFR-003: Storage Optimization
- Automatic image optimization on upload:
  - Images > 500KB are resized and converted to JPEG before storage
  - Progressive resizing algorithm to meet 500KB limit
  - JPEG quality optimization (85% to 60% range)
- Multiple size variants generation:
  - Thumbnail: 150x150px
  - Small: 400x400px
  - Medium: 800x800px
  - Large: 1200x1200px (max)
  - Original: only preserved if ≤ 500KB
- WebP format conversion for web display variants
- CDN integration for fast delivery

### 4.2 Security

#### NFR-004: Access Control
- Image upload requires item update permission
- Image deletion requires item update permission
- Image viewing inherits item view permission
- Direct image URL access validates permissions

#### NFR-005: Security Measures
- Virus scanning on upload
- EXIF data sanitization
- Prevention of malicious file uploads
- Secure file storage with encrypted filenames
- Rate limiting on upload endpoints

### 4.3 Usability

#### NFR-006: User Experience
- Intuitive drag-and-drop interface
- Clear visual feedback during upload
- Responsive design for all devices
- Keyboard accessible interface
- ARIA labels for accessibility
- Automatic optimization notifications:
  - Toast notification when image is being resized
  - Final file size shown after optimization
  - Option to view optimization details

#### NFR-007: Image Quality
- Automatic orientation correction
- HEIC to JPEG conversion for compatibility
- Preservation of original files (only if ≤ 500KB)
- Progressive resizing for files > 500KB:
  - Maintains aspect ratio
  - Reduces dimensions in 10% increments
  - Adjusts JPEG quality from 85% down to 60%
  - Stops when file size ≤ 500KB
- Quality settings configurable per deployment

## 5. Technical Architecture

### 5.1 Database Schema

#### Item Images Table
```
item_images
- id (UUID)
- item_id (foreign key)
- filename (original filename)
- storage_path (S3/local path)
- mime_type
- file_size
- width
- height
- is_primary (boolean)
- display_order (integer)
- alt_text (nullable)
- caption (nullable)
- metadata (JSON - EXIF data, etc.)
- uploaded_by (user_id)
- created_at
- updated_at
```

#### Image Variants Table
```
item_image_variants
- id
- item_image_id (foreign key)
- variant_type (thumbnail|small|medium|large)
- storage_path
- width
- height
- file_size
- created_at
```

### 5.2 Storage Strategy

#### Storage Options
1. **S3 Compatible Storage** (Recommended)
   - Scalable and cost-effective
   - Built-in CDN capabilities
   - Versioning support
   - Lifecycle policies for optimization

2. **Local Storage** (Development/Small Deployments)
   - Simple implementation
   - Direct file system access
   - Limited scalability

#### Storage Structure
```
/items/{item_id}/
  /original/
    - {image_uuid}.{ext}
  /variants/
    /thumbnail/
      - {image_uuid}.webp
    /small/
      - {image_uuid}.webp
    /medium/
      - {image_uuid}.webp
    /large/
      - {image_uuid}.webp
```

### 5.3 Component Architecture

#### ItemImageUploader Component
- Handles file selection and upload
- Validates file types and sizes
- Shows upload progress
- Manages upload queue
- Emits events for parent components

#### ItemImageGrid Component
- Displays all item images in grid layout
- Supports selection mode
- Drag and drop reordering
- Batch operations toolbar
- Responsive grid sizing

#### ItemImageCarousel Component
- Wraps shadcn carousel
- Adds item-specific features
- Handles missing images
- Supports zoom and fullscreen
- Keyboard navigation

#### ItemImagePreview Component
- Compact preview for lists/cards
- Shows primary image
- Image count indicator
- Hover effects
- Click to open carousel

## 6. API Endpoints

### 6.1 Image Management Endpoints

#### Upload Images
`POST /api/production/items/{id}/images`
- Accepts multipart/form-data
- Returns uploaded image details
- Supports batch upload

#### List Images
`GET /api/production/items/{id}/images`
- Returns paginated image list
- Includes variant URLs
- Sortable by display_order

#### Update Image
`PATCH /api/production/items/{id}/images/{imageId}`
- Update metadata, order, primary status
- Returns updated image

#### Delete Image
`DELETE /api/production/items/{id}/images/{imageId}`
- Soft delete with cleanup job
- Returns success status

#### Reorder Images
`POST /api/production/items/{id}/images/reorder`
- Accepts array of image IDs in new order
- Updates display_order field

### 6.2 Import Endpoints

#### Import Images from URLs
`POST /api/production/items/import/images`
- Accepts CSV with URLs
- Queues background job
- Returns job ID for tracking

#### Import Status
`GET /api/production/items/import/images/{jobId}/status`
- Returns import progress
- Lists successful and failed imports

## 7. User Interface Specifications

### 7.1 Item Show Page - Images Tab

#### Layout
- Upload area at top (edit mode only)
- Image grid below
- Primary image larger or highlighted
- Action buttons on hover
- Bulk selection checkbox mode

#### Mobile Considerations
- Stack layout on small screens
- Touch-friendly controls
- Swipe gestures in carousel
- Optimized image loading

### 7.2 Image Upload Interface

#### Features
- Drag and drop zone with visual feedback
- File browser button
- Upload queue with progress bars
- Error messages inline
- Success confirmations
- Cancel upload capability

### 7.3 Carousel Interface

#### Controls
- Previous/Next arrows
- Dot indicators
- Thumbnail strip (collapsible)
- Zoom button
- Fullscreen button
- Download button
- Close button

## 8. Import Specification Details

### 8.1 CSV Format for Image Import

#### Option 1: URL Columns
```csv
item_number,name,description,image_url_1,image_url_2,image_url_3,primary_image_index
ITEM-001,Widget A,Description,https://...,https://...,https://...,1
```

#### Option 2: Image Manifest
```csv
item_number,image_url,is_primary,display_order,alt_text
ITEM-001,https://...,true,1,Front view
ITEM-001,https://...,false,2,Side view
```

### 8.2 Local File Import

#### Naming Convention
- `{item_number}_01.jpg` - First image (primary)
- `{item_number}_02.jpg` - Second image
- `{item_number}_desc.jpg` - Descriptive suffix

#### Batch Processing
- Process in chunks of 100 items
- Progress tracking via job queue
- Email notification on completion
- Detailed import report generation

## 9. Migration and Rollout

### 9.1 Existing Data
- Migration plan for existing item thumbnails
- Backwards compatibility during transition
- Gradual rollout strategy

### 9.2 Feature Flags
- `item_images_enabled` - Main feature toggle
- `item_images_import` - Import functionality
- `item_images_carousel` - Carousel component

## 10. Security Considerations

### 10.1 File Upload Security
- File type validation (magic bytes)
- Maximum file size enforcement
- Malware scanning integration
- XSS prevention in metadata

### 10.2 Access Control
- URL signing for private images
- Permission checks on all endpoints
- Audit logging for all changes
- Rate limiting per user/IP

## 11. Performance Optimization

### 11.1 Image Processing
- Queue-based processing
- Lazy variant generation
- Progressive image loading
- Browser caching headers

### 11.2 CDN Integration
- CloudFront or similar CDN
- Geographic distribution
- Cache invalidation strategy
- Bandwidth optimization

## 12. Monitoring and Analytics

### 12.1 Metrics to Track
- Upload success/failure rates
- Average image file sizes
- Processing times
- Storage usage by item
- Most viewed images

### 12.2 Error Tracking
- Failed upload reasons
- Processing errors
- Missing image requests
- Performance bottlenecks

## 13. Future Enhancements

### 13.1 Phase 2 Features
- AI-based image tagging
- Automatic background removal
- 360-degree image support
- Video support
- Image comparison tools

### 13.2 Integration Opportunities
- CAD file thumbnail extraction
- QR code overlay generation
- Automatic technical drawing detection
- Integration with external DAM systems

## 14. Acceptance Criteria

### 14.1 Core Functionality
- [ ] Users can upload multiple images per item
- [ ] Users can designate primary image
- [ ] Images display in carousel component
- [ ] Images appear on item show page
- [ ] Import process handles images

### 14.2 Performance
- [ ] Upload completes within specified times
- [ ] Images load quickly on all devices
- [ ] System handles 20 images per item

### 14.3 Security
- [ ] Only authorized users can upload
- [ ] File type validation works correctly
- [ ] No security vulnerabilities in upload

### 14.4 Usability
- [ ] Interface is intuitive
- [ ] Works on mobile devices
- [ ] Accessible via keyboard
- [ ] Clear error messages