import axios, { CancelTokenSource } from 'axios';
import { ImportFile } from '../types';
import { calculateFileHash } from '@/utils/format';

interface UploadCallbacks {
    onProgress: (progress: number) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
}

interface QueueItem {
    file: ImportFile;
    callbacks: UploadCallbacks;
    cancelToken: CancelTokenSource;
    status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
}

export class UploadQueue {
    private queue: QueueItem[] = [];
    private activeUploads: Map<string, QueueItem> = new Map();
    private isPaused = false;
    private sessionId: string | null = null;

    private onAllComplete: (() => void) | null = null;

    constructor(
        private concurrentUploads: number = 3,
        private chunkSize: number = 5 * 1024 * 1024 // 5MB
    ) {
    }

    setSessionId(sessionId: string) {
        this.sessionId = sessionId;
    }

    on(event: string, callback: () => void) {
        if (event === 'allComplete') {
            this.onAllComplete = callback;
        }
    }

    addFile(file: ImportFile, callbacks: UploadCallbacks) {
        // Check if file is already in queue
        const existingItem = this.queue.find(item => item.file.filename === file.filename);
        if (existingItem) {
            return;
        }

        const cancelToken = axios.CancelToken.source();
        const queueItem: QueueItem = {
            file,
            callbacks,
            cancelToken,
            status: 'pending',
        };
        this.queue.push(queueItem);
    }

    start() {
        this.isPaused = false;
        this.processQueue();
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        this.processQueue();
    }

    cancelAll() {
        this.isPaused = true;

        // Cancel active uploads
        this.activeUploads.forEach(item => {
            item.cancelToken.cancel('Upload cancelled by user');
            item.status = 'cancelled';
        });

        // Mark pending items as cancelled
        this.queue.forEach(item => {
            if (item.status === 'pending') {
                item.status = 'cancelled';
            }
        });

        this.activeUploads.clear();
    }

    private async processQueue() {
        if (this.isPaused) {
            return;
        }

        while (this.activeUploads.size < this.concurrentUploads && this.queue.length > 0) {
            const nextItem = this.queue.find(item => item.status === 'pending');
            if (!nextItem) {
                break;
            }

            nextItem.status = 'uploading';
            this.activeUploads.set(nextItem.file.filename, nextItem);

            this.uploadFile(nextItem).then(() => {
                this.activeUploads.delete(nextItem.file.filename);
                this.processQueue();
            }).catch((error) => {
                console.error('[UploadQueue] Upload failed', {
                    filename: nextItem.file.filename,
                    error: error.message
                });
                this.activeUploads.delete(nextItem.file.filename);
                this.processQueue();
            });
        }

        // Check if all uploads are complete
        if (this.activeUploads.size === 0 && !this.queue.some(item => item.status === 'pending')) {
            if (this.onAllComplete) {
                this.onAllComplete();
            }
        }
    }

    private async uploadFile(item: QueueItem) {
        try {
            const { file, callbacks } = item;

            // Calculate file hash
            const fileHash = await calculateFileHash(file.file);

            // For small files, upload directly
            if (file.size < this.chunkSize) {
                await this.uploadDirect(item, fileHash);
            } else {
                // For large files, use chunked upload
                await this.uploadChunked(item, fileHash);
            }

            item.status = 'completed';
            callbacks.onComplete();

        } catch (error) {
            console.error('[UploadQueue] Upload file error', {
                filename: item.file.filename,
                error: error instanceof Error ? error.message : String(error),
                isCancelled: axios.isCancel(error),
            });
            if (axios.isCancel(error)) {
                item.status = 'cancelled';
            } else {
                item.status = 'failed';
                item.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    private async uploadDirect(item: QueueItem, fileHash: string) {
        const { file, callbacks, cancelToken } = item;

        // Start chunked upload session
        const startResponse = await axios.post(
            route('production.items.images.import.start-chunked-upload'),
            {
                sessionId: this.sessionId,
                filename: file.filename,
                fileSize: file.size,
                totalChunks: 1,
                fileHash,
            },
            { cancelToken: cancelToken.token }
        );

        const { uploadId } = startResponse.data;

        // Upload the single chunk
        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', '0');
        formData.append('chunk', file.file);

        await axios.post(
            route('production.items.images.import.upload-chunk'),
            formData,
            {
                cancelToken: cancelToken.token,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = (progressEvent.loaded / progressEvent.total) * 100;
                        callbacks.onProgress(progress);
                    }
                },
            }
        );
    }

    private async uploadChunked(item: QueueItem, fileHash: string) {
        const { file, callbacks, cancelToken } = item;

        const totalChunks = Math.ceil(file.size / this.chunkSize);

        // Start chunked upload session
        const startResponse = await axios.post(
            route('production.items.images.import.start-chunked-upload'),
            {
                sessionId: this.sessionId,
                filename: file.filename,
                fileSize: file.size,
                totalChunks,
                fileHash,
            },
            { cancelToken: cancelToken.token }
        );

        const { uploadId } = startResponse.data;

        // Upload chunks
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            if (item.status === 'cancelled') break;

            const start = chunkIndex * this.chunkSize;
            const end = Math.min(start + this.chunkSize, file.size);
            const chunk = file.file.slice(start, end);

            const formData = new FormData();
            formData.append('uploadId', uploadId);
            formData.append('chunkIndex', chunkIndex.toString());
            formData.append('chunk', chunk);

            await axios.post(
                route('production.items.images.import.upload-chunk'),
                formData,
                {
                    cancelToken: cancelToken.token,
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const chunkProgress = (progressEvent.loaded / progressEvent.total);
                            const overallProgress = ((chunkIndex + chunkProgress) / totalChunks) * 100;
                            callbacks.onProgress(overallProgress);
                        }
                    },
                }
            );
        }
    }
}
