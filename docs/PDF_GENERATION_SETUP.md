# PDF Generation Setup Guide

## Overview

The system uses **DomPDF** for all PDF generation needs:
- QR tag generation (item and manufacturing order labels)
- Work order reports and exports
- Execution reports

## Why DomPDF?

- **No external dependencies**: Works out of the box on Laravel Cloud
- **Pure PHP solution**: No need for Chrome/Chromium installation
- **Reliable**: No complex browser automation
- **Lightweight**: Lower resource usage compared to headless browsers

## Configuration

The PDF configuration is located at `/config/pdf.php`. Key settings include:

```php
'dompdf' => [
    'options' => [
        'isRemoteEnabled' => true,        // Allow loading remote images
        'isHtml5ParserEnabled' => true,   // Better HTML5/CSS support
        'defaultPaperSize' => 'a4',       // Default paper size
        'dpi' => 96,                      // Resolution setting
    ],
],
```

## Custom Paper Sizes

The system uses custom paper sizes for QR tags:
- **Item Tags**: 100mm x 150mm (portrait)
- **Order Tags**: 150mm x 100mm (landscape)

## Usage Examples

### Generating QR Tags

```php
use App\Services\Production\QrTagPdfService;

// Generate item tag
$pdfUrl = $qrTagService->generateItemTag($item);

// Generate order tag
$pdfUrl = $qrTagService->generateOrderTag($order);

// Generate batch tags
$pdfUrl = $qrTagService->generateBatchTags($items, 'item');
```

### Generating Work Order Reports

```php
use App\Services\PDFGeneratorService;

// Generate execution report
$path = $pdfService->generateExecutionReport($execution, $options);

// Generate batch report
$path = $pdfService->generateBatchReport($workOrderIds, $metadata);
```

## Styling Considerations

When creating PDF templates, keep in mind DomPDF's CSS support:

### Supported CSS Features
- Basic selectors and properties
- Tables with borders and spacing
- Background colors
- Font styling (size, weight, color)
- Basic positioning
- Page breaks

### Limited/Unsupported Features
- Complex CSS Grid layouts (use tables instead)
- Advanced flexbox properties
- CSS animations/transitions
- Some pseudo-selectors
- Complex transforms

### Best Practices for PDF Templates

1. **Use inline styles** for critical styling
2. **Use tables** for layout instead of CSS Grid/Flexbox
3. **Embed images as base64** for reliability
4. **Test thoroughly** with actual data
5. **Keep styles simple** for best compatibility

## Troubleshooting

### Common Issues

1. **Images not showing**
   - Ensure `isRemoteEnabled` is true in config
   - Use absolute URLs or base64 encoded images
   - Check file permissions

2. **Layout issues**
   - Use tables for complex layouts
   - Avoid modern CSS features
   - Test with different content lengths

3. **Memory issues**
   - Optimize images before embedding
   - Process large batches in chunks
   - Increase PHP memory limit if needed

### Debug Mode

Enable debug output by adding to your `.env`:

```env
APP_DEBUG=true
```

Check Laravel logs at `storage/logs/laravel.log` for detailed error messages.

## Performance Optimization

1. **Image Optimization**
   - Resize images before embedding
   - Use appropriate formats (JPEG for photos, PNG for graphics)
   - Consider image compression

2. **Batch Processing**
   - Process large batches asynchronously using queues
   - Implement progress tracking for user feedback

3. **Caching**
   - Cache generated PDFs when appropriate
   - Implement cleanup routines for old files

## Related Files

- `/config/pdf.php` - PDF configuration
- `/app/Services/Production/QrTagPdfService.php` - QR tag PDF generation
- `/app/Services/PDFGeneratorService.php` - Work order PDF generation
- `/resources/views/pdf/` - PDF templates