export interface Media {
    id: string;
    name: string;
    file_name: string;
    mime_type: string;
    size: number;
    human_readable_size: string;
    collection: string;
    conversions?: {
        thumb?: string;
        preview?: string;
        large?: string;
    };
    url: string;
    is_image: boolean;
    is_document: boolean;
    is_primary: boolean;
    custom_properties: Record<string, unknown>;
    caption?: string;
    alt_text?: string;
    uploaded_by: number;
    uploaded_at: string;
    width?: number;
    height?: number;
    aspect_ratio?: number;
    dominant_color?: string;
    blurhash?: string;
}

export interface MediaCollection {
    name: string;
    media: Media[];
}

export interface MediaUploadOptions {
    modelType: string;
    modelId: string | number;
    collection: string;
    maxFiles?: number;
    maxSize?: number;
    acceptedTypes?: string[];
    checkDuplicates?: boolean;
    allowDuplicates?: boolean;
    onUploadComplete?: (media: Media[]) => void;
    onError?: (error: string) => void;
}

export interface UploadProgress {
    id: string | number;
    name: string;
    progress: number;
    status: 'waiting' | 'uploading' | 'complete' | 'error';
    error?: string;
    media?: Media;
}

export interface ChunkUploadConfig {
    chunkSize?: number;
    maxConcurrent?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

export interface DuplicateCheckResult {
    isDuplicate: boolean | 'possible';
    confidence: number;
    type: 'exact' | 'visual' | 'similar' | 'none';
    matches: Media[];
}

export interface ChunkedUploadSession {
    uploadId: string;
    chunkSize: number;
    totalChunks: number;
    uploadedChunks: number[];
    missingChunks: number[];
    progress: number;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
    expiresAt: string;
}

export interface UploadOptions {
    checkDuplicates?: boolean;
    allowDuplicates?: boolean;
    optimize?: boolean;
    optimizationOptions?: OptimizationOptions;
    chunkSize?: number;
    maxConcurrent?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

export interface OptimizationOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    quality?: number;
    outputFormat?: string;
    preserveExif?: boolean;
    autoOrient?: boolean;
    generatePreview?: boolean;
}

export interface UploadStats {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    dimensions?: {
        width: number;
        height: number;
    };
}

export interface DuplicateAction {
    action: 'skip' | 'replace' | 'keep-both' | 'create-version';
    originalMediaId?: string;
}
