# Item Image Import - Requirements Document

## Overview

This document outlines the requirements for an enhanced item image import system that removes the current 20-image limitation and provides a seamless experience for importing hundreds or thousands of images. Each item can have only one image associated with it.

## Current Limitations

- Hard limit of 20 images per import session
- No background processing capability
- Limited feedback on individual image status
- All-or-nothing upload approach
- Manual batching required for large imports

## Core Requirements

### 1. Unlimited File Selection

#### 1.1 File Input
- Remove the 20-file limitation from the UI
- Support selection of hundreds/thousands of images at once
- Accept multiple file formats: JPEG, PNG, WebP, HEIF
- Support drag-and-drop for files and folders
- Display total file count and cumulative size upon selection

#### 1.2 File Validation
- Client-side validation for:
  - File type (image formats only)
  - Individual file size limits (e.g., 50MB per file)
  - Total upload size warning (e.g., warn if > 1GB total)
- Show validation errors inline without blocking other valid files

### 2. Smart Item Matching System (Filename-Based Only)

#### 2.1 Automatic Matching
- Parse filenames to extract item codes (strict filename-based matching)
- Support multiple filename patterns:
  - `[ITEM_CODE].[ext]` (e.g., "ITEM-001.jpg")
  - `[ITEM_CODE]-[number].[ext]` treated as full item code (e.g., "ITEM-001-1.jpg" maps to item "ITEM-001-1", NOT "ITEM-001")
  - `[ITEM_CODE]-[description].[ext]` (e.g., "ITEM-001-front-view.jpg")
  - `[ITEM_CODE] [description].[ext]` (e.g., "ITEM-001 front view.jpg")
- Case-insensitive matching
- Handle special characters, spaces, and underscores
- No image content analysis - matching is purely based on filename
- One-to-one mapping: each item can only have one image

#### 2.2 Manual Mapping Interface
- Display grid/list view of all selected images with:
  - Image thumbnail
  - Filename
  - Detected item code (if any)
  - Match status (matched/unmatched/ambiguous)
- Allow manual item code assignment for unmatched images
- Bulk operations:
  - Apply naming pattern rules to selection
  - Remove images from import queue
- Duplicate handling:
  - Warn when multiple images match the same item code
  - Allow user to choose which image to use
  - Option to replace existing item image
- Conflict resolution options:
  - Individual Replace/Skip buttons per item
  - "Apply to all subsequent conflicts" checkbox
  - Global actions: "Replace all", "Skip all existing", "Ask for each"


### 3. Multi-Step Import Wizard

#### 3.1 Step 1: File Selection
- Drag-and-drop zone with visual feedback
- File browser with multi-select
- Display selected files in a grid with:
  - Thumbnail previews
  - File names
  - File sizes
  - Remove button per file
- Summary statistics:
  - Total files selected
  - Total size
  - Estimated upload time

#### 3.2 Step 2: Validation & Matching
- Automatic processing of filenames
- Display matching results:
  - Successfully matched: X images to X items (1:1 mapping)
  - Unmatched: Y images
  - Duplicate assignments: Z items with multiple images
- Options to:
  - Review matches
  - Fix unmatched items
  - Skip unmatched items
  - Cancel specific files

#### 3.3 Step 3: Review & Confirm
- Summary view showing:
  - Item code
  - Item name (fetched from database)
  - Current image (if exists) vs new image preview
  - Replace/Skip option for items with existing images
  - "Apply to all" checkbox to apply same action to all subsequent items with existing images
  - Duplicate detection based on image hash
- Final statistics:
  - Total images to upload
  - Items to be updated (new images)
  - Items to be replaced (existing images)
  - Duplicate images detected
  - Estimated processing time
- Configuration options:
  - Set image processing quality
  - Auto-rotate based on EXIF data
  - Generate multiple sizes (thumbnail, medium, large)
  - Enable/disable BlurHash generation
  - Skip duplicate images (based on hash)

#### 3.4 Step 4: Processing
- Real-time progress tracking:
  - Overall progress bar with percentage
  - Current file being processed
  - Upload speed
  - Time remaining estimate
- Individual image status cards showing:
  - Queued → Uploading → Processing → Complete/Failed
  - Thumbnail
  - Item assignment
  - File size
  - Error messages (if failed)
- Image replacement handling:
  - Automatic replacement of existing item images
  - Clear indication when an image is being replaced
  - Option to skip items that already have images
  - Remember user's "apply to all" preference during processing
  - Apply bulk action choices without interrupting the flow
- Controls:
  - Pause/Resume button
  - Cancel remaining uploads
  - Retry failed uploads

#### 3.5 Step 5: Results Summary
- Statistics:
  - Successfully uploaded: X images
  - Images replaced: Y images (items that had existing images)
  - Failed uploads: Z images
  - Processing time
  - Items updated
- Failed uploads section:
  - List of failed images with error reasons
  - Retry individual or bulk retry option
  - Download failed items list as CSV
- Success confirmation with options to:
  - Import more images
  - View updated items
  - Close wizard

### 4. Image Processing & Metadata

#### 4.1 Image Hash Generation
- Generate SHA-256 hash of image content for:
  - Duplicate detection across uploads
  - Preventing re-upload of same images
  - Content integrity verification
- Store hash in media metadata
- Index hashes for fast duplicate lookup

#### 4.2 BlurHash Generation
- Generate BlurHash for every uploaded image
- Key requirements:
  - Generate during initial image processing
  - Store in media custom properties
  - Include in API responses for progressive loading
  - Fallback to CSS blur for missing BlurHash
- Benefits:
  - Instant visual feedback
  - Color-accurate placeholders
  - No layout shift during image load
  - Improved perceived performance

#### 4.3 Image Variants
- Generate multiple sizes on upload:
  - Thumbnail (150x150)
  - Preview (600x600)
  - Original (preserved)
- Each variant includes:
  - Optimized file size
  - Preserved aspect ratio
  - EXIF orientation correction

### 5. Background Processing Architecture

#### 5.1 Client-Side Queuing
- Implement upload queue management
- Process images in configurable chunks (default: 5-10 concurrent)
- Maintain queue state in localStorage for recovery
- Use Web Workers for non-blocking operations

#### 5.2 Chunked Uploads
- Split large files into chunks for reliable upload
- Support resumable uploads using:
  - Unique upload session IDs
  - Chunk tracking
  - Automatic retry on failure
- Progress tracking per chunk

#### 5.3 Server-Side Processing
- Queue system for image processing tasks
- Asynchronous processing with job queues
- Real-time status updates via WebSocket/SSE
- Graceful handling of server limits
- Image metadata generation:
  - Calculate image hash for deduplication
  - Generate BlurHash for progressive loading
  - Extract EXIF data and dimensions
  - Store metadata in media properties

### 6. User Interface Components

#### 6.1 Main Import Interface
- Modern, clean design matching existing UI
- Responsive layout for different screen sizes
- Clear visual hierarchy and workflow indication
- Accessibility compliant (WCAG 2.1 AA)
- Progressive image loading:
  - Use ImageWithBlurEffect component for all image previews
  - Show BlurHash placeholders during loading
  - Smooth transitions from placeholder to actual image

#### 6.2 Progress Indicators
- Overall progress bar with:
  - Percentage complete
  - Files processed (X of Y)
  - Time elapsed and estimated remaining
- Individual file progress:
  - Mini progress bars
  - Status icons (queued, uploading, processing, done, error)
  - Retry buttons for failed items

#### 6.3 Image Preview Grid
- Responsive grid layout
- Lazy loading for performance
- Image thumbnails with:
  - BlurHash placeholder
  - Filename overlay
  - Item code badge
  - Status indicator
  - Select checkbox
  - Hash-based duplicate indicator
- Hover actions:
  - View full size
  - Edit item assignment
  - Remove from queue
- Progressive loading:
  - Display BlurHash immediately
  - Load thumbnail on viewport entry
  - Preload full image on hover

### 7. Error Handling & Recovery

#### 7.1 Client-Side Errors
- Network connectivity issues:
  - Auto-retry with exponential backoff
  - Pause queue on repeated failures
  - Clear user notification
- Browser limitations:
  - Memory warnings for large selections
  - Fallback for unsupported features
- File errors:
  - Corrupt file detection
  - Unsupported format warnings

#### 7.2 Server-Side Errors
- Clear error messages for:
  - Item not found
  - Item already has an image (when not replacing)
  - Storage quota exceeded
  - Processing failures
- Partial success handling:
  - Continue with successful uploads
  - Collect all errors for final report
  - Allow selective retry

#### 7.3 Recovery Mechanisms
- Session persistence:
  - Save upload state to localStorage
  - Resume interrupted sessions
  - Clear old sessions automatically
- Conflict resolution:
  - Handle multiple images for same item
  - Archive replaced images (optional)
  - User choice for image replacement
  - Clear indication when replacing existing images

### 8. Performance Requirements

#### 8.1 Client-Side Performance
- Handle 1000+ file selections without UI freezing
- Smooth scrolling in image grid with virtualization
- Responsive UI during uploads (non-blocking)
- Memory-efficient thumbnail generation
- Progressive image loading:
  - Display BlurHash placeholder immediately
  - Lazy load actual images as needed
  - Prevent layout shift with aspect ratio preservation

#### 8.2 Upload Performance
- Optimize images client-side before upload:
  - Resize if over maximum dimensions
  - Compress based on quality settings
  - Convert HEIF to JPEG if needed
- Parallel upload streams (5-10 concurrent)
- Bandwidth throttling options

#### 8.3 Server-Side Performance
- Process uploads asynchronously
- Implement rate limiting per user
- Database query optimization for bulk operations
- CDN integration for processed images
- Image processing optimizations:
  - Generate multiple image sizes (thumbnail, preview, original)
  - Calculate BlurHash during initial processing
  - Store hash for duplicate detection
  - Cache processed metadata

### 9. Integration Requirements

#### 9.1 Backend API
- RESTful endpoints for:
  - Upload session creation
  - Chunk upload handling
  - Status polling
  - Bulk item validation
- WebSocket/SSE for real-time updates
- Consistent error response format

#### 9.2 Database Updates
- Bulk update optimizations
- Transaction handling for consistency
- One image per item constraint enforcement
- Update item modification timestamps
- Handle image replacement transactions

#### 9.3 Existing System Integration
- Maintain compatibility with current single-image upload
- Use existing image processing pipeline
- Respect current permission system
- Integrate with existing notification system
- Enforce one-image-per-item business rule

### 10. Security Considerations

- File type validation (server-side)
- Virus scanning for uploaded files
- Rate limiting to prevent abuse
- Secure temporary file handling
- User permission validation per item
- Sanitize filenames to prevent path traversal
- Maximum total upload size per user/session

### 11. Technical Stack

- Frontend:
  - React with TypeScript
  - Inertia.js for server communication
  - Tailwind CSS for styling
  - Shadcn UI components
  - React Query for state management
  - Web Workers for background processing
  - ImageWithBlurEffect component for progressive loading

- Backend:
  - Laravel job queues for async processing
  - Redis for queue management
  - Intervention Image for processing
  - Laravel Media Library for storage
  - WebSockets/SSE for real-time updates
  - BlurHash PHP library for placeholder generation
  - Image hashing for duplicate detection

## Non-Functional Requirements

### User Experience
- Bulk action capabilities to reduce repetitive decisions
- "Apply to all" option for consistent handling of similar cases
- Smart defaults based on user's previous choices
- Minimal interruptions during bulk operations
- Clear feedback on applied bulk actions

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- Clear focus indicators
- Sufficient color contrast
- Alternative text for all images

### Browser Support
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Graceful degradation for older browsers

### Localization
- Support for multiple languages
- Translatable UI strings
- Locale-aware number/date formatting

### Monitoring & Analytics
- Track upload success/failure rates
- Monitor processing times
- User behavior analytics
- Error logging and alerting

## Future Enhancements

1. **AI-Powered Features**
   - Automatic image categorization
   - Quality assessment
   - Duplicate detection using perceptual hashing
   - Smart cropping suggestions

2. **Advanced Matching**
   - Enhanced filename pattern recognition
   - Fuzzy matching for similar item codes
   - Batch rename utilities

3. **Workflow Automation**
   - Import profiles/templates
   - Scheduled imports from cloud storage
   - Integration with external image sources
   - Bulk editing capabilities

4. **Enhanced Processing**
   - Custom watermarking
   - Automatic background removal
   - Image optimization presets
   - Format conversion options

## Success Metrics

- **Performance**: 95% of uploads complete successfully
- **Speed**: Process 100 images in under 5 minutes
- **Reliability**: 99.9% uptime for upload service
- **User Satisfaction**: Reduce support tickets related to image imports by 80%
- **Efficiency**: Reduce time spent on bulk imports by 90%

## Timeline Considerations

### Phase 1: Core Functionality (MVP)
- Unlimited file selection
- Basic matching interface
- Background processing
- Progress tracking

### Phase 2: Enhanced Features
- Advanced matching algorithms
- Resumable uploads
- Bulk operations
- Performance optimizations

### Phase 3: Advanced Capabilities
- AI/ML features
- External integrations
- Workflow automation
- Advanced analytics
