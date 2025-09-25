# Item Image Import - Similarity Search Feature Specification

## Overview
This document outlines the implementation of a similarity search feature for the Item Image Import module. The feature will help users find and match invalid image files to existing items in the database using intelligent pattern matching and similarity algorithms.

## Problem Statement
When importing images, filenames often don't exactly match item codes in the database due to:
- Additional suffixes (e.g., "-v2", "_final", "-new")
- Different separators (hyphens, underscores, spaces)
- Minor typos or variations
- Version indicators or other metadata in filenames

Currently, these files are marked as invalid, requiring manual intervention.

## Proposed Solution
Add an optional similarity search feature that:
1. Allows users to search for similar items after initial validation
2. Presents suggestions with confidence scores
3. Enables users to accept or reject matches
4. Updates the import session with accepted matches

## User Interface Design

### 1. Initial State
- Add "Find Similar Items" button next to "Baixar CSV" in the Invalid Files card header
- Button only appears when `invalidFiles.length > 0`
- Button includes a search icon and descriptive text

### 2. Loading State
- Show progress indicator while searching
- Display "Searching for similar items..." message
- Disable interaction with the button during search

### 3. Results Display
Each invalid file will show:
```
┌─────────────────────────────────────────────────────┐
│ 📷 [Image Preview]                                  │
│ Filename: ABC-123-v2.jpg                           │
│ Error: Item not found                              │
│                                                    │
│ 🔍 Suggested Matches:                              │
│ ┌─────────────────────────────────────────────┐   │
│ │ Item: ABC123                                │   │
│ │ Name: Widget Product Name                   │   │
│ │ Confidence: 85% ████████░░                  │   │
│ │ Match Type: Pattern                         │   │
│ │ [Use This Item] [View Item]                 │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
│ [Skip This File] [Enter Code Manually]             │
└─────────────────────────────────────────────────────┘
```

### 4. Visual Indicators
- **High Confidence (80-100%)**: Green badge/border
- **Medium Confidence (60-79%)**: Yellow badge/border  
- **Low Confidence (40-59%)**: Orange badge/border
- **Very Low (<40%)**: Red badge/border (not shown by default)

## Technical Implementation

### Frontend Components

#### 1. State Management
```typescript
interface SimilaritySearchState {
  isSearching: boolean;
  suggestions: Record<string, ItemSuggestion[]>;
  acceptedSuggestions: Record<string, string>; // filename -> itemCode
  searchError: string | null;
}

interface ItemSuggestion {
  item_code: string;
  item_name: string;
  similarity_score: number;
  match_type: 'exact' | 'pattern' | 'fuzzy' | 'prefix';
  match_details?: string; // e.g., "Removed suffix '-v2'"
}
```

#### 2. New Components
- `SimilaritySearchButton.tsx` - Trigger button component
- `ItemSuggestionCard.tsx` - Display individual suggestions
- `ManualItemEntry.tsx` - Modal for manual code entry

#### 3. API Integration
```typescript
// New API endpoint
POST /api/production/items/images/import/find-similar
Request: {
  session_id: string;
  filenames: string[];
  options?: {
    max_suggestions: number; // default: 3
    min_confidence: number; // default: 0.4
    search_strategy: 'fast' | 'thorough'; // default: 'fast'
  };
}

Response: {
  suggestions: Record<string, ItemSuggestion[]>;
  search_stats: {
    duration_ms: number;
    strategies_used: string[];
    items_searched: number;
  };
}
```

### Backend Implementation

#### 1. Search Service Architecture
```php
class ItemSimilaritySearchService
{
    public function findSimilarItems(array $filenames, array $options = []): array
    {
        // 1. Pattern extraction
        // 2. Progressive search strategies
        // 3. Scoring and ranking
        // 4. Result caching
    }
}
```

#### 2. Search Strategies (Progressive)
1. **Exact Match** - Direct code lookup
2. **Pattern Extraction** - Remove common suffixes/prefixes
3. **Normalized Match** - Remove special characters
4. **Prefix Search** - Match beginning of codes
5. **Fuzzy Search** - Database-specific similarity functions

#### 3. Performance Optimizations
- Batch processing of filenames
- Indexed searches only
- Result caching per session
- Configurable search depth
- Early termination on high-confidence matches

### Database Considerations

#### 1. Required Indexes
```sql
-- For PostgreSQL
CREATE INDEX idx_items_code_trgm ON items USING gin (code gin_trgm_ops);
CREATE INDEX idx_items_code_pattern ON items (UPPER(REPLACE(REPLACE(code, '-', ''), '_', '')));

-- For MySQL
CREATE INDEX idx_items_code ON items (code);
CREATE FULLTEXT INDEX idx_items_code_fulltext ON items (code);
```

#### 2. Query Strategy
- Use database-specific functions (PostgreSQL: similarity(), MySQL: MATCH...AGAINST)
- Limit results to top N matches
- Include relevance scoring in results

## User Workflow

### Success Path
1. User uploads images for import
2. Validation identifies invalid files
3. User clicks "Find Similar Items"
4. System presents suggestions
5. User reviews and accepts matches
6. System updates file mappings
7. User proceeds with import using accepted matches

### Edge Cases
1. **No matches found**: Show message, offer manual entry
2. **Multiple high-confidence matches**: Show all, let user choose
3. **Very large batch**: Implement pagination or progressive loading
4. **Timeout**: Show partial results, option to continue
5. **User rejects all**: Keep file as invalid, proceed normally

## Security Considerations
1. Rate limiting on similarity search endpoint
2. Maximum batch size enforcement
3. Timeout protection for long-running queries
4. Input sanitization for filenames
5. Permission checks for item visibility

## Performance Requirements
- Search should complete within 5 seconds for up to 100 files
- Results should be cached for the session duration
- UI should remain responsive during search
- Progressive loading for large result sets

## Future Enhancements
1. **Machine Learning**: Learn from user selections to improve future matches
2. **Bulk Actions**: Apply same match to similar filenames
3. **Custom Rules**: User-defined pattern matching rules
4. **History**: Remember previous matches for repeat imports
5. **Preview**: Show item details/images in suggestion cards

## Success Metrics
1. Reduction in manually rejected files
2. Increase in successful imports
3. Time saved per import session
4. User satisfaction scores
5. Match accuracy rates

## Implementation Phases

### Phase 1: Basic Similarity Search (MVP)
- Simple pattern extraction
- Basic UI for suggestions
- Accept/reject functionality

### Phase 2: Enhanced Matching
- Multiple search strategies
- Confidence scoring
- Manual entry option

### Phase 3: Advanced Features
- Bulk actions
- Learning system
- Performance optimizations

## Testing Strategy
1. Unit tests for pattern extraction
2. Integration tests for search strategies
3. Performance tests with large datasets
4. UI/UX testing with real users
5. A/B testing for match algorithms
