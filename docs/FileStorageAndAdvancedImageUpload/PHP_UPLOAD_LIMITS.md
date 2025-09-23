# PHP Upload Limits Configuration

## Issue: Maximum 20 Files Upload Limitation

The Laravel application is currently limited to uploading a maximum of 20 files in a single request due to PHP's default configuration.

### Current PHP Configuration
```
max_file_uploads = 20      # Maximum number of files that can be uploaded via a single request
post_max_size = 8M         # Maximum size of POST data that PHP will accept
upload_max_filesize = 2M   # Maximum allowed size for uploaded files
```

### Solutions

#### 1. Update PHP Configuration (Recommended for Production)

Edit your PHP configuration file (`php.ini`):

```ini
; Increase the maximum number of files per request
max_file_uploads = 100

; Increase POST size to handle multiple files
post_max_size = 128M

; Increase individual file size limit
upload_max_filesize = 50M
```

Location of php.ini varies by system:
- macOS (Homebrew): `/usr/local/etc/php/8.x/php.ini`
- Ubuntu/Debian: `/etc/php/8.x/apache2/php.ini` or `/etc/php/8.x/fpm/php.ini`
- CentOS/RHEL: `/etc/php.ini`

After making changes, restart your web server:
```bash
# For Apache
sudo service apache2 restart

# For PHP-FPM
sudo service php8.x-fpm restart

# For Laravel Valet
valet restart
```

#### 2. Override in .htaccess (Apache only)

Add to your `public/.htaccess` file:
```apache
php_value max_file_uploads 100
php_value post_max_size 128M
php_value upload_max_filesize 50M
```

#### 3. Batch Processing Alternative

If you cannot modify PHP configuration, implement batch processing in the frontend:

```javascript
// Process files in batches of 20
const BATCH_SIZE = 20;
const fileBatches = [];

for (let i = 0; i < files.length; i += BATCH_SIZE) {
    fileBatches.push(files.slice(i, i + BATCH_SIZE));
}

// Upload each batch sequentially
for (const batch of fileBatches) {
    await uploadBatch(batch);
}
```

### Impact on Item Image Import

The current item image import feature is affected by this limitation. When importing images for multiple items:

1. **Current Behavior**: Only the first 20 images will be uploaded, regardless of how many are selected
2. **User Experience**: No error message is shown, making it appear as if the import was successful
3. **Data Loss Risk**: Users may think all images were imported when only 20 were processed

### Recommendations

1. **Immediate**: Add validation in the frontend to warn users when selecting more than 20 files
2. **Short-term**: Implement batch processing for large imports
3. **Long-term**: Update server PHP configuration to increase limits

### Verification

To check your current PHP limits:
```bash
php -i | grep -E "max_file_uploads|post_max_size|upload_max_filesize"
```

Or create a PHP info file:
```php
<?php phpinfo(); ?>
```

### Security Considerations

When increasing these limits, consider:
- Server memory usage
- Request timeout settings
- Potential DoS attack vectors
- Disk space availability

Balance user needs with server resources and security requirements.
