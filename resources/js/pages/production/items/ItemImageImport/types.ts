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

export interface ImportPhase {
    total: number;
    completed: number;
    failed?: number;
    in_progress?: number;
    progress: number;
    status?: string;
}

export interface ImportSession {
    sessionId: string;
    status: 'initialized' | 'validating' | 'uploading' | 'uploads_completed' | 'processing' | 'completed' | 'failed';
    files: ImportFile[];
    processed: number;
    total: number;
    summary?: ImportSummary;
    error?: string;
    created_at?: string;
    started_at?: string;
    completed_at?: string;
    phases?: {
        upload: ImportPhase;
        assembly: ImportPhase;
        processing: ImportPhase;
        metadata: ImportPhase;
    };
    metadata_jobs?: Array<{
        media_id: number;
        filename: string;
        has_blurhash: boolean;
        has_file_hash: boolean;
        completed: boolean;
    }>;
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
