# PDF Generation Setup Guide

## Overview

The system uses two PDF generation methods:
1. **Spatie Laravel PDF (Browsershot)** - Primary method for QR tag generation
2. **DomPDF** - Fallback method and used for work order reports

## Browsershot/Puppeteer Setup

### Common Issues

The error "Syntax error: Unterminated quoted string" typically indicates an architecture mismatch or corrupted Chrome installation.

### Solution 1: Install Chrome/Chromium

```bash
# For Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y chromium-browser

# For macOS
brew install --cask google-chrome
# or
brew install chromium
```

### Solution 2: Configure Chrome Path

Add these environment variables to your `.env` file:

```env
# For Linux
BROWSERSHOT_CHROME_PATH=/usr/bin/chromium-browser
# or
BROWSERSHOT_CHROME_PATH=/usr/bin/google-chrome

# For macOS
BROWSERSHOT_CHROME_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
# or
BROWSERSHOT_CHROME_PATH=/opt/homebrew/bin/chromium
```

### Solution 3: Use Docker-specific Configuration

If running in Docker, ensure your Dockerfile includes:

```dockerfile
# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils

# Set Chrome path for Docker
ENV BROWSERSHOT_CHROME_PATH=/usr/bin/chromium
```

### Solution 4: Switch to DomPDF Only

If Browsershot continues to fail, you can force the system to use DomPDF by setting:

```env
PDF_ENGINE=dompdf
```

## Fallback Mechanism

The `QrTagPdfService` automatically falls back to DomPDF if Browsershot fails. This ensures PDF generation continues working even if Chrome/Puppeteer has issues.

## Troubleshooting

1. **Check Chrome Installation**:
   ```bash
   # Find Chrome/Chromium executable
   which chromium-browser
   which google-chrome
   which chromium
   ```

2. **Test Browsershot Directly**:
   ```php
   use Spatie\Browsershot\Browsershot;
   
   Browsershot::url('https://example.com')
       ->setChromePath('/path/to/chrome')
       ->save('test.pdf');
   ```

3. **Check Logs**:
   - Laravel logs: `storage/logs/laravel.log`
   - Look for "Browsershot PDF generation failed" warnings

4. **Clear Puppeteer Cache**:
   ```bash
   rm -rf ~/.cache/puppeteer
   rm -rf /var/www/.cache/puppeteer
   ```

## Performance Considerations

- Browsershot produces higher quality PDFs but requires more resources
- DomPDF is faster but may not support all CSS features
- For high-volume PDF generation, consider using a queue worker

## Related Files

- `/config/pdf.php` - PDF configuration
- `/app/Services/Production/QrTagPdfService.php` - QR tag PDF generation
- `/app/Services/PDFGeneratorService.php` - Work order PDF generation
