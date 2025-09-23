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
            console.log('[UploadQueue] File already in queue, skipping', {
                filename: file.filename,
            });
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
        console.log('[UploadQueue] Starting queue processing', {
            queueLength: this.queue.length,
            sessionId: this.sessionId,
        });
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
            console.log('[UploadQueue] Queue is paused, skipping processing');
            return;
        }

        console.log('[UploadQueue] Processing queue', {
            activeUploads: this.activeUploads.size,
            maxConcurrent: this.concurrentUploads,
            pendingItems: this.queue.filter(item => item.status === 'pending').length,
        });

        while (this.activeUploads.size < this.concurrentUploads && this.queue.length > 0) {
            const nextItem = this.queue.find(item => item.status === 'pending');
            if (!nextItem) {
                console.log('[UploadQueue] No pending items found');
                break;
            }

            console.log('[UploadQueue] Starting upload for file', {
                filename: nextItem.file.filename,
                size: nextItem.file.size,
            });

            nextItem.status = 'uploading';
            this.activeUploads.set(nextItem.file.filename, nextItem);

            this.uploadFile(nextItem).then(() => {
                console.log('[UploadQueue] Upload completed', { filename: nextItem.file.filename });
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
            console.log('[UploadQueue] All uploads complete, calling onAllComplete callback');
            if (this.onAllComplete) {
                this.onAllComplete();
            }
        }
    }

    private async uploadFile(item: QueueItem) {
        try {
            const { file, callbacks } = item;

            console.log('[UploadQueue] Calculating file hash', { filename: file.filename });
            // Calculate file hash
            const fileHash = await calculateFileHash(file.file);
            console.log('[UploadQueue] File hash calculated', {
                filename: file.filename,
                hash: fileHash,
            });

            // For small files, upload directly
            if (file.size < this.chunkSize) {
                console.log('[UploadQueue] Using direct upload', {
                    filename: file.filename,
                    size: file.size,
                });
                await this.uploadDirect(item, fileHash);
            } else {
                // For large files, use chunked upload
                console.log('[UploadQueue] Using chunked upload', {
                    filename: file.filename,
                    size: file.size,
                    chunks: Math.ceil(file.size / this.chunkSize),
                });
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

        console.log('[UploadQueue] Starting chunked upload session', {
            filename: file.filename,
            sessionId: this.sessionId,
            fileSize: file.size,
        });

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
        console.log('[UploadQueue] Upload session started', {
            filename: file.filename,
            uploadId,
        });

        // Upload the single chunk
        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', '0');
        formData.append('chunk', file.file);

        console.log('[UploadQueue] Uploading single chunk', {
            filename: file.filename,
            uploadId,
            chunkIndex: 0,
        });

        const uploadResponse = await axios.post(
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

        console.log('[UploadQueue] Chunk upload response', {
            filename: file.filename,
            uploadId,
            response: uploadResponse.data,
        });
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

            console.log('[UploadQueue] Uploading chunk', {
                filename: file.filename,
                uploadId,
                chunkIndex,
                chunkStart: start,
                chunkEnd: end,
                chunkSize: chunk.size,
            });

            const chunkResponse = await axios.post(
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

            console.log('[UploadQueue] Chunk uploaded', {
                filename: file.filename,
                uploadId,
                chunkIndex,
                response: chunkResponse.data,
            });
        }
    }
}
