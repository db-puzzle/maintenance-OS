export interface ImportFile {
    file: File;
    filename: string;
    size: number;
    type: string;
    valid: boolean;
    errors: string[];
    itemCode: string | null;
    itemExists: boolean;
    itemName: string | null;
    hasExistingImage: boolean;
    hash?: string;
    preview?: string;
    status?: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
    progress?: number;
    uploadId?: string;
}

export interface ImportSession {
    sessionId: string;
    status: 'initialized' | 'validating' | 'uploading' | 'processing' | 'completed' | 'failed';
    files: ImportFile[];
    processed: number;
    total: number;
    summary?: ImportSummary;
    error?: string;
    created_at?: string;
    started_at?: string;
    completed_at?: string;
}

export interface ImportSummary {
    itemsAffected: number;
    imagesImported: number;
    imagesSkipped: number;
    imagesReplaced: number;
    duplicatesSkipped: number;
    errors: string[];
}

export interface ImportOptions {
    replaceExisting: boolean;
    skipDuplicates: boolean;
    generateBlurhash: boolean;
    quality: number;
    applyToAll: boolean;
}

export interface ChunkedUpload {
    uploadId: string;
    filename: string;
    fileSize: number;
    totalChunks: number;
    uploadedChunks: number;
    chunkSize: number;
}

export interface ValidationResult {
    validations: Array<{
        filename: string;
        valid: boolean;
        errors: string[];
        itemCode: string | null;
        itemExists: boolean;
        itemName: string | null;
        hasExistingImage: boolean;
    }>;
    summary: {
        total: number;
        valid: number;
        invalid: number;
        replacements: number;
    };
}
