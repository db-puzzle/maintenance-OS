import { Media } from '@/utils/media';

export function getMediaUrl(media: Media, conversion: string = ''): string {
    if (!media || !media.id) {
        return '';
    }
    if (conversion) {
        return route('api.media.show-conversion', { media: media.id, conversion });
    }
    return route('api.media.show', { media: media.id });
}

export function getMediaDownloadUrl(media: Media): string {
    if (!media || !media.id) {
        return '';
    }
    return route('api.media.download', { media: media.id });
}

export function getMediaPreviewUrl(media: Media): string {
    if (!media || !media.id) {
        return '';
    }
    // Default to 'preview' conversion for images, or original if not an image
    if (media.mime_type && media.mime_type.startsWith('image/')) {
        return getMediaUrl(media, 'preview');
    }
    return getMediaUrl(media);
}

export function getMediaThumbnailUrl(media: Media): string {
    if (!media || !media.id) {
        return '';
    }
    // Default to 'thumb' conversion for images, or original if not an image
    if (media.mime_type && media.mime_type.startsWith('image/')) {
        return getMediaUrl(media, 'thumb');
    }
    return getMediaUrl(media);
}
