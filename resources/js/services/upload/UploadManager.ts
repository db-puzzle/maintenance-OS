import { EventEmitter } from 'events';
import pLimit from 'p-limit';
import axios, { AxiosProgressEvent, CancelTokenSource } from 'axios';
import {
    ChunkedUploadSession,
    DuplicateCheckResult,
    Media,
    UploadOptions,
    UploadStats,
} from '@/types/media';

export interface Upload {
    id: string;
    file: File;
    options: UploadOptions;
    status: 'pending' | 'hashing' | 'checking' | 'optimizing' | 'uploading' | 'paused' | 'completed' | 'error';
    progress: number;
    hash?: string;
    optimizedFile?: File;
    stats?: UploadStats;
    session?: ChunkedUploadSession;
    error?: string;
    cancelSource?: CancelTokenSource;
}

export class UploadManager extends EventEmitter {
    private uploads = new Map<string, Upload>();
    private workers = new Map<string, Worker>();
    private config: Required<UploadOptions>;
    private limiter: ReturnType<typeof pLimit>;

    constructor(config: UploadOptions = {}) {
        super();
        this.config = {
            checkDuplicates: true,
            allowDuplicates: false,
            optimize: true,
            optimizationOptions: {
                maxSizeMB: 2,
                maxWidthOrHeight: 2048,
                quality: 0.85,
                preserveExif: true,
                autoOrient: true,
                generatePreview: true,
            },
            chunkSize: 5 * 1024 * 1024, // 5MB
            maxConcurrent: 3,
            retryAttempts: 3,
            retryDelay: 1000,
            ...config,
        };

        this.limiter = pLimit(this.config.maxConcurrent);
        this.restoreState();
    }

    async upload(
        file: File,
        modelType: string,
        modelId: string | number,
        collection: string,
        options: UploadOptions = {}
    ): Promise<string> {
        const uploadId = this.generateUploadId(file);

        // Check for existing upload
        if (this.uploads.has(uploadId)) {
            const existing = this.uploads.get(uploadId)!;
            if (existing.status === 'paused') {
                return this.resume(uploadId);
            }
            return uploadId;
        }

        // Create new upload
        const upload: Upload = {
            id: uploadId,
            file,
            options: { ...this.config, ...options },
            status: 'pending',
            progress: 0,
            cancelSource: axios.CancelToken.source(),
        };

        this.uploads.set(uploadId, upload);
        this.emit('upload-added', upload);

        // Start processing pipeline
        try {
            // 1. Calculate hash
            upload.status = 'hashing';
            this.emit('status-changed', upload);
            await this.calculateHash(upload);

            // 2. Check for duplicates
            if (upload.options.checkDuplicates) {
                upload.status = 'checking';
                this.emit('status-changed', upload);
                const duplicate = await this.checkDuplicate(upload, modelType, modelId, collection);

                if (duplicate.isDuplicate && !upload.options.allowDuplicates) {
                    this.emit('duplicate', { upload, duplicate });
                    return uploadId;
                }
            }

            // 3. Optimize if needed
            if (upload.options.optimize && file.type.startsWith('image/')) {
                upload.status = 'optimizing';
                this.emit('status-changed', upload);
                await this.optimizeImage(upload);
            }

            // 4. Start upload
            upload.status = 'uploading';
            this.emit('status-changed', upload);

            // Use chunked upload for large files
            if ((upload.optimizedFile || file).size > this.config.chunkSize) {
                await this.uploadChunked(upload, modelType, modelId, collection);
            } else {
                await this.uploadDirect(upload, modelType, modelId, collection);
            }

            upload.status = 'completed';
            this.emit('status-changed', upload);
            this.emit('upload-complete', upload);

            return uploadId;
        } catch (error) {
            upload.status = 'error';
            upload.error = error instanceof Error ? error.message : String(error);
            this.emit('error', { upload, error });
            throw error;
        }
    }

    private async calculateHash(upload: Upload): Promise<void> {
        return new Promise((resolve, reject) => {
            const worker = this.getWorker('hash');

            worker.postMessage({
                id: upload.id,
                file: upload.file,
            });

            const handleMessage = (e: MessageEvent) => {
                if (e.data.id === upload.id) {
                    if (e.data.type === 'progress') {
                        upload.progress = e.data.progress * 0.2; // 20% of total progress
                        this.emit('progress', upload);
                    } else if (e.data.type === 'complete') {
                        upload.hash = e.data.hash;
                        this.emit('hash-calculated', upload);
                        worker.removeEventListener('message', handleMessage);
                        resolve();
                    } else if (e.data.type === 'error') {
                        worker.removeEventListener('message', handleMessage);
                        reject(new Error(e.data.error));
                    }
                }
            };

            worker.addEventListener('message', handleMessage);
        });
    }

    private async checkDuplicate(
        upload: Upload,
        modelType: string,
        modelId: string | number,
        collection: string
    ): Promise<DuplicateCheckResult> {
        try {
            const response = await axios.post(
                '/api/media/check-duplicate',
                {
                    file_hash: upload.hash,
                    filename: upload.file.name,
                    mime_type: upload.file.type,
                    size: upload.file.size,
                    model_type: modelType,
                    model_id: modelId,
                    collection,
                },
                { cancelToken: upload.cancelSource?.token }
            );

            return response.data;
        } catch (error) {
            console.error('Duplicate check failed:', error);
            return {
                isDuplicate: false,
                confidence: 0,
                type: 'none',
                matches: [],
            };
        }
    }

    private async optimizeImage(upload: Upload): Promise<void> {
        return new Promise((resolve, reject) => {
            const worker = this.getWorker('optimize');

            worker.postMessage({
                id: upload.id,
                file: upload.file,
                options: upload.options.optimizationOptions,
            });

            const handleMessage = (e: MessageEvent) => {
                if (e.data.id === upload.id) {
                    if (e.data.type === 'progress') {
                        upload.progress = 20 + e.data.progress * 0.2; // 20-40% of total progress
                        this.emit('progress', upload);
                    } else if (e.data.type === 'complete') {
                        upload.optimizedFile = e.data.file;
                        upload.stats = e.data.stats;
                        this.emit('optimized', upload);
                        worker.removeEventListener('message', handleMessage);
                        resolve();
                    } else if (e.data.type === 'error') {
                        worker.removeEventListener('message', handleMessage);
                        reject(new Error(e.data.error));
                    }
                }
            };

            worker.addEventListener('message', handleMessage);
        });
    }

    private async uploadDirect(
        upload: Upload,
        modelType: string,
        modelId: string | number,
        collection: string
    ): Promise<void> {
        const fileToUpload = upload.optimizedFile || upload.file;
        const formData = new FormData();

        formData.append('file', fileToUpload);
        formData.append('model_type', modelType);
        formData.append('model_id', String(modelId));
        formData.append('collection', collection);
        formData.append('file_hash', upload.hash!);

        if (upload.stats) {
            formData.append('original_size', String(upload.file.size));
        }

        const response = await axios.post('/api/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                const progress = progressEvent.total
                    ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    : 0;
                upload.progress = 40 + progress * 0.6; // 40-100% of total progress
                this.emit('progress', upload);
            },
            cancelToken: upload.cancelSource?.token,
        });

        const media: Media = response.data.media;
        this.emit('media-created', { upload, media });
    }

    private async uploadChunked(
        upload: Upload,
        modelType: string,
        modelId: string | number,
        collection: string
    ): Promise<void> {
        const fileToUpload = upload.optimizedFile || upload.file;

        // Initialize chunked upload
        const initResponse = await axios.post(
            '/api/media/upload/initialize',
            {
                filename: fileToUpload.name,
                mime_type: fileToUpload.type,
                total_size: fileToUpload.size,
                total_chunks: Math.ceil(fileToUpload.size / this.config.chunkSize),
                file_hash: upload.hash,
                model_type: modelType,
                model_id: modelId,
                collection,
            },
            { cancelToken: upload.cancelSource?.token }
        );

        upload.session = {
            uploadId: initResponse.data.upload_id,
            chunkSize: initResponse.data.chunk_size,
            totalChunks: Math.ceil(fileToUpload.size / this.config.chunkSize),
            uploadedChunks: [],
            missingChunks: [],
            progress: 0,
            status: 'uploading',
            expiresAt: initResponse.data.expires_at,
        };

        // Upload chunks
        await this.uploadChunks(upload, fileToUpload);

        // Save state for resumability
        this.saveState();
    }

    private async uploadChunks(upload: Upload, file: File): Promise<void> {
        if (!upload.session) {
            throw new Error('No upload session');
        }

        const chunks = upload.session.totalChunks;
        const startChunk = upload.session.uploadedChunks.length;

        // Create chunk upload promises
        const chunkPromises = [];
        for (let i = startChunk; i < chunks; i++) {
            chunkPromises.push(
                this.limiter(() => this.uploadChunk(upload, file, i))
            );
        }

        // Upload chunks with concurrency limit
        await Promise.all(chunkPromises);
    }

    private async uploadChunk(
        upload: Upload,
        file: File,
        chunkIndex: number,
        attempt: number = 1
    ): Promise<void> {
        if (!upload.session) {
            throw new Error('No upload session');
        }

        const start = chunkIndex * this.config.chunkSize;
        const end = Math.min(start + this.config.chunkSize, file.size);
        const chunk = file.slice(start, end);

        try {
            const formData = new FormData();
            formData.append('chunk', chunk);
            formData.append('upload_id', upload.session.uploadId);
            formData.append('chunk_index', String(chunkIndex));

            await axios.post('/api/media/upload/chunk', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                cancelToken: upload.cancelSource?.token,
            });

            upload.session.uploadedChunks.push(chunkIndex);
            upload.session.progress = (upload.session.uploadedChunks.length / upload.session.totalChunks) * 100;

            // Update overall progress
            upload.progress = 40 + upload.session.progress * 0.6; // 40-100% of total progress
            this.emit('progress', upload);
            this.saveState();
        } catch (error) {
            if (axios.isCancel(error as Error)) {
                throw error;
            }

            if (attempt < this.config.retryAttempts) {
                // Exponential backoff
                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.uploadChunk(upload, file, chunkIndex, attempt + 1);
            }

            throw error;
        }
    }

    pause(uploadId: string): void {
        const upload = this.uploads.get(uploadId);
        if (!upload) return;

        upload.status = 'paused';
        upload.cancelSource?.cancel('Upload paused');
        this.saveState();
        this.emit('paused', upload);
    }

    async resume(uploadId: string): Promise<string> {
        const upload = this.uploads.get(uploadId);
        if (!upload) throw new Error('Upload not found');

        upload.status = 'uploading';
        upload.cancelSource = axios.CancelToken.source();
        this.emit('resumed', upload);

        // Resume chunked upload
        if (upload.session) {
            const response = await axios.post(
                `/api/media/upload/resume/${upload.session.uploadId}`,
                {},
                { cancelToken: upload.cancelSource.token }
            );

            upload.session.missingChunks = response.data.missing_chunks;
            upload.session.expiresAt = response.data.expires_at;

            await this.uploadChunks(upload, upload.optimizedFile || upload.file);
        }

        return uploadId;
    }

    cancel(uploadId: string): void {
        const upload = this.uploads.get(uploadId);
        if (!upload) return;

        upload.cancelSource?.cancel('Upload cancelled');

        if (upload.session) {
            axios.delete(`/api/media/upload/cancel/${upload.session.uploadId}`).catch(() => {
                // Ignore errors
            });
        }

        this.uploads.delete(uploadId);
        this.saveState();
        this.emit('cancelled', upload);
    }

    private generateUploadId(file: File): string {
        return `${file.name}-${file.size}-${file.lastModified}`;
    }

    private getWorker(type: 'hash' | 'optimize'): Worker {
        if (!this.workers.has(type)) {
            const path = type === 'hash' ? '/workers/hash.worker.js' : '/workers/optimize.worker.js';
            this.workers.set(type, new Worker(path));
        }

        return this.workers.get(type)!;
    }

    private saveState(): void {
        const state = Array.from(this.uploads.values())
            .filter(u => ['uploading', 'paused'].includes(u.status))
            .map(u => ({
                id: u.id,
                file: {
                    name: u.file.name,
                    size: u.file.size,
                    type: u.file.type,
                    lastModified: u.file.lastModified,
                },
                options: u.options,
                status: u.status,
                progress: u.progress,
                hash: u.hash,
                session: u.session,
            }));

        localStorage.setItem('upload_manager_state', JSON.stringify(state));
    }

    private restoreState(): void {
        try {
            const saved = localStorage.getItem('upload_manager_state');
            if (!saved) return;

            const state = JSON.parse(saved);
            state.forEach((data: Record<string, unknown>) => {
                if (data.status === 'paused' && data.session) {
                    // Restore paused uploads
                    const fileData = data.file as { name: string; type: string; lastModified: number };
                    const upload: Upload = {
                        id: data.id as string,
                        file: new File([], fileData.name, {
                            type: fileData.type,
                            lastModified: fileData.lastModified,
                        }),
                        options: data.options as UploadOptions,
                        status: 'paused',
                        progress: data.progress as number,
                        hash: data.hash as string,
                        session: data.session as ChunkedUploadSession,
                    };
                    this.uploads.set(upload.id, upload);
                    this.emit('restored', upload);
                }
            });
        } catch (error) {
            console.error('Failed to restore upload state:', error);
        }
    }

    getUpload(uploadId: string): Upload | undefined {
        return this.uploads.get(uploadId);
    }

    getAllUploads(): Upload[] {
        return Array.from(this.uploads.values());
    }

    clearCompleted(): void {
        const completed = Array.from(this.uploads.values()).filter(u => u.status === 'completed');
        completed.forEach(u => this.uploads.delete(u.id));
        this.saveState();
    }
}
