/**
 * Media utility functions for working with Spatie Media Library
 */

export interface Media {
    id: number;
    uuid: string;
    collection_name: string;
    name: string;
    file_name: string;
    mime_type: string;
    disk: string;
    size: number;
    custom_properties: Record<string, any>;
    conversions?: Record<string, boolean>;
    url?: string;
    thumb_url?: string;
    preview_url?: string;
    responsive_images?: {
        [key: string]: {
            urls: string[];
            base64svg: string;
        };
    };
}

/**
 * Get the URL for a media file
 */
export function getMediaUrl(media: Media): string {
    return `/api/media/${media.id}`;
}

/**
 * Get the URL for a media conversion
 */
export function getConversionUrl(media: Media, conversion: string): string {
    return `/api/media/${media.id}/conversions/${conversion}`;
}

/**
 * Get the download URL for a media file
 */
export function getDownloadUrl(media: Media): string {
    return `/api/media/${media.id}/download`;
}

/**
 * Get responsive image srcset
 */
export function getResponsiveSrcSet(media: Media): string | null {
    if (!media.responsive_images?.media_library_original) {
        return null;
    }

    return media.responsive_images.media_library_original.urls.join(', ');
}

/**
 * Get the best available image URL
 */
export function getBestImageUrl(media: Media, preferredConversion?: string): string {
    if (preferredConversion && media.conversions?.[preferredConversion]) {
        return getConversionUrl(media, preferredConversion);
    }

    // Try common conversions in order of preference
    const conversions = ['preview', 'medium', 'thumb'];
    for (const conversion of conversions) {
        if (media.conversions?.[conversion]) {
            return getConversionUrl(media, conversion);
        }
    }

    // Fall back to original
    return getMediaUrl(media);
}

/**
 * Check if media is an image
 */
export function isImage(media: Media): boolean {
    return media.mime_type.startsWith('image/');
}

/**
 * Check if media is a document
 */
export function isDocument(media: Media): boolean {
    const documentMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
    ];

    return documentMimeTypes.includes(media.mime_type);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get file extension from media
 */
export function getFileExtension(media: Media): string {
    const parts = media.file_name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get appropriate icon for file type
 */
export function getFileIcon(media: Media): string {
    const extension = getFileExtension(media);

    // Map extensions to Lucide icon names
    const iconMap: Record<string, string> = {
        // Images
        jpg: 'Image',
        jpeg: 'Image',
        png: 'Image',
        gif: 'Image',
        webp: 'Image',
        svg: 'Image',

        // Documents
        pdf: 'FileText',
        doc: 'FileText',
        docx: 'FileText',

        // Spreadsheets
        xls: 'Table',
        xlsx: 'Table',
        csv: 'Table',

        // Archives
        zip: 'Archive',
        rar: 'Archive',
        '7z': 'Archive',

        // Default
        default: 'File',
    };

    return iconMap[extension] || iconMap.default;
}

/**
 * Build FormData for media upload
 */
export function buildMediaFormData(
    file: File,
    collection: string,
    customProperties?: Record<string, any>
): FormData {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection', collection);

    if (customProperties) {
        Object.entries(customProperties).forEach(([key, value]) => {
            formData.append(`custom_properties[${key}]`, String(value));
        });
    }

    return formData;
}

/**
 * Check if file type is allowed for collection
 */
export function isFileTypeAllowed(file: File, allowedMimeTypes: string[]): boolean {
    return allowedMimeTypes.some(mimeType => {
        if (mimeType.includes('*')) {
            const [type] = mimeType.split('/');
            return file.type.startsWith(`${type}/`);
        }
        return file.type === mimeType;
    });
}

/**
 * Get allowed mime types for collection
 */
export function getAllowedMimeTypesForCollection(collection: string): string[] {
    const collectionMimeTypes: Record<string, string[]> = {
        images: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
        photos: ['image/jpeg', 'image/png'],
        documents: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        attachments: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        'completion-photos': ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
        reports: ['application/pdf'],
        templates: ['application/pdf'],
        'generated-tags': ['application/pdf', 'image/png'],
    };

    return collectionMimeTypes[collection] || ['*/*'];
}
