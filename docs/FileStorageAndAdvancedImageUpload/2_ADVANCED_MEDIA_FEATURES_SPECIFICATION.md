# Advanced Media Features Specification

## World-Class Upload Experience and Display Performance

This document provides detailed specifications for implementing advanced media handling features that deliver exceptional user experience and performance. It builds upon the base File Storage Specification to create a best-in-class media management system.

## Table of Contents

1. [Overview](#overview)
2. [Upload Experience Features](#upload-experience-features)
3. [Display Performance Optimization](#display-performance-optimization)
4. [Progressive Enhancement Strategy](#progressive-enhancement-strategy)
5. [Implementation Phases](#implementation-phases)
6. [Performance Metrics](#performance-metrics)
7. [Browser Compatibility](#browser-compatibility)

## Overview

### Goals
- **Upload Experience**: Match or exceed the usability of leading platforms (Google Photos, Dropbox, etc.)
- **Display Performance**: Achieve instant perceived load times with progressive enhancement
- **Accessibility**: WCAG 2.1 AA compliance with enhanced keyboard and screen reader support
- **Resilience**: Graceful degradation and offline capabilities

### Key Innovations
1. **Resumable Uploads**: Never lose progress on large files
2. **Client-side Optimization**: Reduce bandwidth and server load
3. **Smart Duplicate Detection**: Prevent redundant uploads
4. **Progressive Image Loading**: BlurHash placeholders with lazy loading
5. **Adaptive Quality**: Device and network-aware image delivery

## Upload Experience Features

### 1. Drag-and-Drop Excellence

#### Enhanced Drop Zones
```tsx
// components/media/AdvancedDropZone.tsx
import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, FileText, Film, Music, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AdvancedDropZoneProps {
  onDrop: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  currentFiles?: number;
}

export function AdvancedDropZone({
  onDrop,
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
    'application/pdf': ['.pdf'],
  },
  maxSize = 50 * 1024 * 1024,
  maxFiles = 100,
  disabled = false,
  currentFiles = 0,
}: AdvancedDropZoneProps) {
  const [dragDepth, setDragDepth] = useState(0);
  const dragCounter = useRef(0);
  
  const handleDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setDragDepth(0);
    dragCounter.current = 0;
    
    if (rejectedFiles.length > 0) {
      // Show detailed rejection reasons
      handleRejections(rejectedFiles);
    }
    
    if (acceptedFiles.length > 0) {
      onDrop(acceptedFiles);
    }
  }, [onDrop]);
  
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: handleDrop,
    accept,
    maxSize,
    maxFiles: maxFiles - currentFiles,
    disabled,
    multiple: true,
    onDragEnter: () => {
      dragCounter.current++;
      setDragDepth(dragCounter.current);
    },
    onDragLeave: () => {
      dragCounter.current--;
      setDragDepth(Math.max(0, dragCounter.current));
    },
  });
  
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type === 'application/pdf') return FileText;
    if (type.startsWith('video/')) return Film;
    if (type.startsWith('audio/')) return Music;
    return Archive;
  };
  
  return (
    <motion.div
      {...getRootProps()}
      className={cn(
        'relative overflow-hidden rounded-xl border-2 border-dashed p-8',
        'transition-all duration-300 cursor-pointer',
        isDragActive && !isDragReject && 'border-primary bg-primary/5 scale-[1.02]',
        isDragReject && 'border-red-500 bg-red-50 dark:bg-red-900/20',
        disabled && 'opacity-50 cursor-not-allowed',
        !isDragActive && !disabled && 'hover:border-gray-400 hover:bg-gray-50/50'
      )}
      animate={{
        scale: dragDepth > 0 ? 1.02 : 1,
      }}
    >
      <input {...getInputProps()} />
      
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full bg-grid-pattern" />
      </div>
      
      {/* Drop indicator overlay */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Upload className="mx-auto h-16 w-16 text-primary" />
              </motion.div>
              <p className="mt-4 text-lg font-medium">
                {isDragReject ? 'Invalid files' : 'Drop files here'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content */}
      <div className="relative z-0 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
          <Upload className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </div>
        
        <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
          Drop files here or click to browse
        </p>
        
        <p className="mt-2 text-xs text-gray-500">
          {Object.entries(accept).map(([type, exts]) => (
            <span key={type} className="inline-flex items-center gap-1 mx-1">
              {React.createElement(getFileIcon(type), { className: 'h-3 w-3' })}
              {exts.join(', ')}
            </span>
          ))}
        </p>
        
        <p className="mt-1 text-xs text-gray-500">
          Up to {maxFiles - currentFiles} files, {Math.round(maxSize / 1024 / 1024)}MB each
        </p>
      </div>
    </motion.div>
  );
}
```

### 2. Resumable Chunk Upload System

#### Upload Manager Service
```typescript
// services/upload/UploadManager.ts
import { EventEmitter } from 'events';
import SparkMD5 from 'spark-md5';
import pLimit from 'p-limit';

export interface ChunkUploadConfig {
  chunkSize: number; // Default 5MB
  maxConcurrent: number; // Default 3
  retryAttempts: number; // Default 3
  retryDelay: number; // Default 1000ms
  hashWorkerPath: string;
  optimizeWorkerPath: string;
}

export class UploadManager extends EventEmitter {
  private uploads = new Map<string, Upload>();
  private workers = new Map<string, Worker>();
  private config: ChunkUploadConfig;
  private limiter: any;

  constructor(config: Partial<ChunkUploadConfig> = {}) {
    super();
    this.config = {
      chunkSize: 5 * 1024 * 1024,
      maxConcurrent: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      hashWorkerPath: '/workers/hash.worker.js',
      optimizeWorkerPath: '/workers/optimize.worker.js',
      ...config,
    };
    
    this.limiter = pLimit(this.config.maxConcurrent);
    this.restoreState();
  }

  async upload(
    file: File,
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
    const upload = new Upload(uploadId, file, {
      ...options,
      chunkSize: this.config.chunkSize,
    });

    this.uploads.set(uploadId, upload);
    
    // Start processing pipeline
    try {
      // 1. Calculate hash for deduplication
      await this.calculateHash(upload);
      
      // 2. Check for duplicates
      const duplicate = await this.checkDuplicate(upload.hash!);
      if (duplicate && !options.allowDuplicates) {
        this.emit('duplicate', { upload, duplicate });
        return uploadId;
      }
      
      // 3. Optimize if needed
      if (options.optimize && file.type.startsWith('image/')) {
        await this.optimizeImage(upload);
      }
      
      // 4. Start chunked upload
      await this.uploadChunks(upload);
      
      return uploadId;
    } catch (error) {
      upload.status = 'error';
      upload.error = error.message;
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
          if (e.data.error) {
            reject(new Error(e.data.error));
          } else {
            upload.hash = e.data.hash;
            this.emit('hash-calculated', { upload });
            resolve();
          }
          worker.removeEventListener('message', handleMessage);
        }
      };
      
      worker.addEventListener('message', handleMessage);
    });
  }

  private async uploadChunks(upload: Upload): Promise<void> {
    const chunks = Math.ceil(upload.file.size / this.config.chunkSize);
    upload.totalChunks = chunks;
    
    // Resume from last successful chunk
    const startChunk = upload.completedChunks;
    
    // Create chunk upload promises
    const chunkPromises = [];
    for (let i = startChunk; i < chunks; i++) {
      chunkPromises.push(
        this.limiter(() => this.uploadChunk(upload, i))
      );
    }
    
    // Upload chunks with concurrency limit
    await Promise.all(chunkPromises);
    
    // Finalize upload
    await this.finalizeUpload(upload);
  }

  private async uploadChunk(
    upload: Upload,
    chunkIndex: number,
    attempt: number = 1
  ): Promise<void> {
    const start = chunkIndex * this.config.chunkSize;
    const end = Math.min(start + this.config.chunkSize, upload.file.size);
    const chunk = upload.file.slice(start, end);
    
    try {
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('upload_id', upload.id);
      formData.append('chunk_index', chunkIndex.toString());
      formData.append('total_chunks', upload.totalChunks.toString());
      formData.append('file_hash', upload.hash!);
      
      const response = await fetch('/api/media/upload/chunk', {
        method: 'POST',
        body: formData,
        signal: upload.abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Chunk upload failed: ${response.statusText}`);
      }
      
      upload.completedChunks++;
      upload.uploadedBytes += chunk.size;
      
      // Update progress
      const progress = (upload.uploadedBytes / upload.file.size) * 100;
      upload.progress = progress;
      
      this.emit('progress', { upload, progress });
      this.saveState();
      
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.uploadChunk(upload, chunkIndex, attempt + 1);
      }
      
      throw error;
    }
  }

  pause(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;
    
    upload.status = 'paused';
    upload.abortController.abort();
    this.saveState();
    this.emit('paused', { upload });
  }

  async resume(uploadId: string): Promise<string> {
    const upload = this.uploads.get(uploadId);
    if (!upload) throw new Error('Upload not found');
    
    upload.status = 'uploading';
    upload.abortController = new AbortController();
    
    await this.uploadChunks(upload);
    return uploadId;
  }

  private saveState(): void {
    const state = Array.from(this.uploads.values())
      .filter(u => ['uploading', 'paused'].includes(u.status))
      .map(u => u.toJSON());
    
    localStorage.setItem('upload_manager_state', JSON.stringify(state));
  }

  private restoreState(): void {
    try {
      const saved = localStorage.getItem('upload_manager_state');
      if (!saved) return;
      
      const state = JSON.parse(saved);
      // Restore paused uploads
      state.forEach((data: any) => {
        if (data.status === 'paused') {
          const upload = Upload.fromJSON(data);
          this.uploads.set(upload.id, upload);
          this.emit('restored', { upload });
        }
      });
    } catch (error) {
      console.error('Failed to restore upload state:', error);
    }
  }

  private getWorker(type: 'hash' | 'optimize'): Worker {
    if (!this.workers.has(type)) {
      const path = type === 'hash' 
        ? this.config.hashWorkerPath 
        : this.config.optimizeWorkerPath;
      
      this.workers.set(type, new Worker(path));
    }
    
    return this.workers.get(type)!;
  }
}
```

#### Backend Chunk Handler
```php
// app/Http/Controllers/Api/ChunkedUploadController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use App\Services\MediaService;

class ChunkedUploadController extends Controller
{
    private MediaService $mediaService;
    
    public function __construct(MediaService $mediaService)
    {
        $this->mediaService = $mediaService;
    }
    
    public function uploadChunk(Request $request)
    {
        $request->validate([
            'chunk' => 'required|file',
            'upload_id' => 'required|string',
            'chunk_index' => 'required|integer|min:0',
            'total_chunks' => 'required|integer|min:1',
            'file_hash' => 'required|string',
        ]);
        
        $uploadId = $request->input('upload_id');
        $chunkIndex = $request->input('chunk_index');
        $totalChunks = $request->input('total_chunks');
        $fileHash = $request->input('file_hash');
        
        // Store chunk temporarily
        $chunkPath = "chunks/{$uploadId}/{$chunkIndex}";
        Storage::disk('local')->put($chunkPath, $request->file('chunk')->get());
        
        // Track upload progress
        $uploadKey = "upload:{$uploadId}";
        $uploadData = Cache::get($uploadKey, [
            'chunks' => [],
            'total_chunks' => $totalChunks,
            'file_hash' => $fileHash,
            'user_id' => auth()->id(),
            'started_at' => now(),
        ]);
        
        $uploadData['chunks'][] = $chunkIndex;
        $uploadData['updated_at'] = now();
        
        // Extend cache TTL
        Cache::put($uploadKey, $uploadData, now()->addHours(24));
        
        // Check if all chunks are uploaded
        if (count($uploadData['chunks']) === $totalChunks) {
            dispatch(new AssembleChunkedUpload($uploadId));
        }
        
        return response()->json([
            'success' => true,
            'chunk_index' => $chunkIndex,
            'total_uploaded' => count($uploadData['chunks']),
            'total_chunks' => $totalChunks,
        ]);
    }
    
    public function finalizeUpload(Request $request)
    {
        $request->validate([
            'upload_id' => 'required|string',
            'filename' => 'required|string',
            'mime_type' => 'required|string',
            'model_type' => 'required|string',
            'model_id' => 'required',
            'collection' => 'required|string',
        ]);
        
        $uploadId = $request->input('upload_id');
        $uploadData = Cache::get("upload:{$uploadId}");
        
        if (!$uploadData || $uploadData['user_id'] !== auth()->id()) {
            return response()->json(['error' => 'Invalid upload'], 403);
        }
        
        // Verify all chunks are present
        if (count($uploadData['chunks']) !== $uploadData['total_chunks']) {
            return response()->json([
                'error' => 'Missing chunks',
                'uploaded' => count($uploadData['chunks']),
                'expected' => $uploadData['total_chunks'],
            ], 400);
        }
        
        // Assemble file from chunks
        $assembledPath = $this->assembleChunks($uploadId, $uploadData);
        
        // Create media record
        $model = $this->findModel($request->input('model_type'), $request->input('model_id'));
        
        $media = $model->addMedia($assembledPath)
            ->withCustomProperties([
                'uploaded_by' => auth()->id(),
                'upload_method' => 'chunked',
                'file_hash' => $uploadData['file_hash'],
            ])
            ->usingName($request->input('filename'))
            ->toMediaCollection($request->input('collection'));
        
        // Cleanup chunks
        Storage::disk('local')->deleteDirectory("chunks/{$uploadId}");
        Cache::forget("upload:{$uploadId}");
        
        return response()->json([
            'success' => true,
            'media' => new MediaResource($media),
        ]);
    }
    
    private function assembleChunks(string $uploadId, array $uploadData): string
    {
        $tempPath = storage_path("app/temp/{$uploadId}_assembled");
        $handle = fopen($tempPath, 'wb');
        
        // Sort chunks to ensure correct order
        sort($uploadData['chunks']);
        
        foreach ($uploadData['chunks'] as $chunkIndex) {
            $chunkPath = "chunks/{$uploadId}/{$chunkIndex}";
            $chunkContent = Storage::disk('local')->get($chunkPath);
            fwrite($handle, $chunkContent);
        }
        
        fclose($handle);
        
        // Verify file hash
        $actualHash = md5_file($tempPath);
        if ($actualHash !== $uploadData['file_hash']) {
            unlink($tempPath);
            throw new \Exception('File integrity check failed');
        }
        
        return $tempPath;
    }
}
```

### 3. Smart Duplicate Detection

#### Visual Similarity Detection
```typescript
// services/upload/DuplicateDetector.ts
import { ImageHasher } from './ImageHasher';
import { hammingDistance } from '@/utils/algorithms';

export class DuplicateDetector {
  private imageHasher: ImageHasher;
  
  constructor() {
    this.imageHasher = new ImageHasher();
  }
  
  async checkForDuplicates(file: File): Promise<DuplicateCheckResult> {
    const checks = await Promise.all([
      this.checkFileHash(file),
      this.checkVisualSimilarity(file),
      this.checkMetadata(file),
    ]);
    
    return this.consolidateResults(checks);
  }
  
  private async checkFileHash(file: File): Promise<HashMatch[]> {
    const hash = await this.calculateFileHash(file);
    
    const response = await fetch('/api/media/check-hash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash, type: 'md5' }),
    });
    
    return response.json();
  }
  
  private async checkVisualSimilarity(file: File): Promise<SimilarityMatch[]> {
    if (!file.type.startsWith('image/')) {
      return [];
    }
    
    // Generate perceptual hash
    const pHash = await this.imageHasher.generatePHash(file);
    
    const response = await fetch('/api/media/check-similarity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        hash: pHash,
        threshold: 5, // Hamming distance threshold
      }),
    });
    
    const candidates = await response.json();
    
    // Calculate similarity scores
    return candidates.map(candidate => ({
      ...candidate,
      similarity: 1 - (hammingDistance(pHash, candidate.phash) / 64),
    }));
  }
  
  private async checkMetadata(file: File): Promise<MetadataMatch[]> {
    const metadata = await this.extractMetadata(file);
    
    if (!metadata.originalDate || !metadata.cameraModel) {
      return [];
    }
    
    const response = await fetch('/api/media/check-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: metadata.originalDate,
        camera: metadata.cameraModel,
        size: file.size,
        tolerance: 60, // seconds
      }),
    });
    
    return response.json();
  }
  
  private consolidateResults(checks: any[]): DuplicateCheckResult {
    const [hashMatches, visualMatches, metadataMatches] = checks;
    
    // Exact duplicates (same hash)
    if (hashMatches.length > 0) {
      return {
        isDuplicate: true,
        confidence: 1.0,
        type: 'exact',
        matches: hashMatches,
      };
    }
    
    // Visual duplicates (similar appearance)
    const highConfidenceVisual = visualMatches.filter(m => m.similarity > 0.95);
    if (highConfidenceVisual.length > 0) {
      return {
        isDuplicate: true,
        confidence: highConfidenceVisual[0].similarity,
        type: 'visual',
        matches: highConfidenceVisual,
      };
    }
    
    // Possible duplicates (metadata + visual similarity)
    const possibleDuplicates = this.crossReferenceMatches(
      visualMatches,
      metadataMatches
    );
    
    if (possibleDuplicates.length > 0) {
      return {
        isDuplicate: 'possible',
        confidence: possibleDuplicates[0].confidence,
        type: 'similar',
        matches: possibleDuplicates,
      };
    }
    
    return {
      isDuplicate: false,
      confidence: 0,
      type: 'none',
      matches: [],
    };
  }
}
```

#### Duplicate Resolution UI
```tsx
// components/media/DuplicateResolver.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ComparisonViewer } from './ComparisonViewer';

interface DuplicateResolverProps {
  file: File;
  duplicateCheck: DuplicateCheckResult;
  onResolve: (action: DuplicateAction) => void;
  onCancel: () => void;
}

export function DuplicateResolver({
  file,
  duplicateCheck,
  onResolve,
  onCancel,
}: DuplicateResolverProps) {
  const [selectedAction, setSelectedAction] = useState<DuplicateAction>('skip');
  const [selectedMatch, setSelectedMatch] = useState(duplicateCheck.matches[0]);
  
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.95) return <Badge variant="destructive">Exact Match</Badge>;
    if (confidence >= 0.85) return <Badge variant="warning">Very Similar</Badge>;
    return <Badge variant="secondary">Similar</Badge>;
  };
  
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Duplicate Detected
            {getConfidenceBadge(duplicateCheck.confidence)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Visual Comparison */}
          <ComparisonViewer
            newFile={file}
            existingMedia={selectedMatch}
            showDifferences={duplicateCheck.type === 'visual'}
          />
          
          {/* Metadata Comparison */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">New File</h4>
              <dl className="space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name:</dt>
                  <dd className="font-mono">{file.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Size:</dt>
                  <dd>{formatBytes(file.size)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Modified:</dt>
                  <dd>{new Date(file.lastModified).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Existing File</h4>
              <dl className="space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name:</dt>
                  <dd className="font-mono">{selectedMatch.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Size:</dt>
                  <dd>{selectedMatch.human_readable_size}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Uploaded:</dt>
                  <dd>{new Date(selectedMatch.created_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
          
          {/* Multiple matches */}
          {duplicateCheck.matches.length > 1 && (
            <div>
              <h4 className="font-medium mb-2">Multiple Matches Found</h4>
              <div className="grid grid-cols-4 gap-2">
                {duplicateCheck.matches.map((match, idx) => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(match)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2',
                      selectedMatch.id === match.id
                        ? 'border-primary'
                        : 'border-transparent'
                    )}
                  >
                    <img
                      src={match.thumbnail_url}
                      alt={match.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                      {(match.similarity * 100).toFixed(0)}% match
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Action Selection */}
          <div>
            <h4 className="font-medium mb-3">Choose Action</h4>
            <RadioGroup value={selectedAction} onValueChange={setSelectedAction}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="skip" id="skip" />
                  <div className="flex-1">
                    <Label htmlFor="skip" className="font-medium">
                      Skip Upload
                    </Label>
                    <p className="text-sm text-gray-500">
                      Don't upload this file, keep the existing one
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="replace" id="replace" />
                  <div className="flex-1">
                    <Label htmlFor="replace" className="font-medium">
                      Replace Existing
                    </Label>
                    <p className="text-sm text-gray-500">
                      Upload this file and replace the existing one
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="keep-both" id="keep-both" />
                  <div className="flex-1">
                    <Label htmlFor="keep-both" className="font-medium">
                      Keep Both
                    </Label>
                    <p className="text-sm text-gray-500">
                      Upload as a new file alongside the existing one
                    </p>
                  </div>
                </div>
                
                {duplicateCheck.type === 'visual' && (
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="create-version" id="create-version" />
                    <div className="flex-1">
                      <Label htmlFor="create-version" className="font-medium">
                        Create Version
                      </Label>
                      <p className="text-sm text-gray-500">
                        Link this as a new version of the existing file
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onResolve(selectedAction)}>
            {selectedAction === 'skip' ? 'Skip' : 'Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Client-Side Image Optimization

#### Image Optimization Worker
```javascript
// public/workers/optimize.worker.js
self.importScripts('https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.0/dist/browser-image-compression.js');

self.addEventListener('message', async (event) => {
  const { id, file, options } = event.data;
  
  try {
    // Default optimization options
    const compressionOptions = {
      maxSizeMB: options.maxSizeMB || 2,
      maxWidthOrHeight: options.maxWidthOrHeight || 2048,
      useWebWorker: false, // We're already in a worker
      preserveExif: options.preserveExif !== false,
      
      // Advanced options
      fileType: options.outputFormat || file.type,
      quality: options.quality || 0.85,
      
      // Progress callback
      onProgress: (progress) => {
        self.postMessage({
          id,
          type: 'progress',
          progress: progress * 0.9, // Reserve 10% for final processing
        });
      },
    };
    
    // Perform optimization
    const optimizedBlob = await imageCompression(file, compressionOptions);
    
    // Auto-rotate based on EXIF if needed
    if (options.autoOrient) {
      const oriented = await autoOrient(optimizedBlob);
      optimizedBlob = oriented;
    }
    
    // Generate preview if requested
    let preview = null;
    if (options.generatePreview) {
      preview = await generatePreview(optimizedBlob, {
        maxSize: 200,
        format: 'webp',
      });
    }
    
    // Create optimized file
    const optimizedFile = new File([optimizedBlob], file.name, {
      type: optimizedBlob.type,
      lastModified: file.lastModified,
    });
    
    // Calculate compression ratio
    const compressionRatio = 1 - (optimizedFile.size / file.size);
    
    self.postMessage({
      id,
      type: 'complete',
      file: optimizedFile,
      preview,
      stats: {
        originalSize: file.size,
        optimizedSize: optimizedFile.size,
        compressionRatio,
        dimensions: await getImageDimensions(optimizedFile),
      },
    });
    
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error.message,
    });
  }
});

async function autoOrient(blob) {
  // Implementation of EXIF-based auto-orientation
  const arrayBuffer = await blob.arrayBuffer();
  const orientation = await getExifOrientation(arrayBuffer);
  
  if (orientation === 1) {
    return blob; // No rotation needed
  }
  
  // Apply rotation based on EXIF orientation
  const img = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  
  // Apply transformation based on orientation value
  applyOrientation(ctx, canvas, orientation);
  ctx.drawImage(img, 0, 0);
  
  return canvas.convertToBlob({ type: blob.type, quality: 0.95 });
}

async function generatePreview(blob, options) {
  const img = await createImageBitmap(blob);
  const aspectRatio = img.width / img.height;
  
  let width = options.maxSize;
  let height = options.maxSize;
  
  if (aspectRatio > 1) {
    height = width / aspectRatio;
  } else {
    width = height * aspectRatio;
  }
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(img, 0, 0, width, height);
  
  const previewBlob = await canvas.convertToBlob({
    type: `image/${options.format}`,
    quality: 0.8,
  });
  
  return URL.createObjectURL(previewBlob);
}
```

## Display Performance Optimization

### 1. Progressive Image Loading System

#### BlurHash Implementation
```typescript
// services/display/BlurHashService.ts
import { encode, decode } from 'blurhash';

export class BlurHashService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }
  
  async generateBlurHash(
    imageUrl: string,
    componentX: number = 4,
    componentY: number = 3
  ): Promise<string> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Resize for blurhash calculation (max 64x64)
        const width = 64;
        const height = Math.round(64 * (img.height / img.width));
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        this.ctx.drawImage(img, 0, 0, width, height);
        const imageData = this.ctx.getImageData(0, 0, width, height);
        
        const blurhash = encode(
          imageData.data,
          width,
          height,
          componentX,
          componentY
        );
        
        resolve(blurhash);
      };
      
      img.onerror = reject;
      img.src = imageUrl;
    });
  }
  
  decodeBlurHash(
    hash: string,
    width: number,
    height: number
  ): string {
    const pixels = decode(hash, width, height);
    const imageData = new ImageData(
      new Uint8ClampedArray(pixels),
      width,
      height
    );
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.putImageData(imageData, 0, 0);
    
    return this.canvas.toDataURL();
  }
}
```

#### Advanced Progressive Image Component
```tsx
// components/media/ProgressiveImage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Blurhash } from 'react-blurhash';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  blurhash?: string;
  dominantColor?: string;
  aspectRatio?: number;
  priority?: boolean;
  onLoad?: () => void;
  className?: string;
  containerClassName?: string;
}

export function ProgressiveImage({
  src,
  srcSet,
  sizes,
  alt,
  blurhash,
  dominantColor,
  aspectRatio,
  priority = false,
  onLoad,
  className,
  containerClassName,
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Intersection observer for lazy loading
  const { ref: inViewRef, inView } = useInView({
    triggerOnce: true,
    rootMargin: '50px',
    skip: priority,
  });
  
  // Preload for priority images
  useEffect(() => {
    if (priority && src) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      if (srcSet) link.imageSrcset = srcSet;
      if (sizes) link.imageSizes = sizes;
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [src, srcSet, sizes, priority]);
  
  // Load image when in view or priority
  const shouldLoad = priority || inView;
  
  useEffect(() => {
    if (!shouldLoad || !src) return;
    
    const img = new Image();
    if (srcSet) img.srcset = srcSet;
    if (sizes) img.sizes = sizes;
    
    const handleLoad = () => {
      setIsLoaded(true);
      setError(false);
      onLoad?.();
      
      // Report performance metrics
      if (window.performance && performance.mark) {
        performance.mark(`image-loaded-${src}`);
        performance.measure(
          `image-load-time-${src}`,
          'navigationStart',
          `image-loaded-${src}`
        );
      }
    };
    
    const handleError = () => {
      setError(true);
      console.error(`Failed to load image: ${src}`);
    };
    
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    img.src = src;
    
    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [shouldLoad, src, srcSet, sizes, onLoad]);
  
  // Generate placeholder styles
  const placeholderStyles = useMemo(() => ({
    backgroundColor: dominantColor || '#f3f4f6',
    aspectRatio: aspectRatio || 'auto',
  }), [dominantColor, aspectRatio]);
  
  return (
    <div
      ref={inViewRef}
      className={cn('relative overflow-hidden', containerClassName)}
      style={placeholderStyles}
    >
      <AnimatePresence mode="wait">
        {/* BlurHash placeholder */}
        {blurhash && !isLoaded && !error && (
          <motion.div
            key="blurhash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Blurhash
              hash={blurhash}
              width="100%"
              height="100%"
              resolutionX={32}
              resolutionY={32}
              punch={1}
            />
          </motion.div>
        )}
        
        {/* Loading skeleton */}
        {!blurhash && !isLoaded && !error && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        )}
        
        {/* Error state */}
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
          >
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Failed to load image</p>
            </div>
          </motion.div>
        )}
        
        {/* Actual image */}
        {shouldLoad && !error && (
          <motion.img
            key="image"
            ref={imgRef}
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className={cn('w-full h-full object-cover', className)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 2. Virtualized Gallery for Large Collections

#### High-Performance Virtual Grid
```tsx
// components/media/VirtualMediaGrid.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { VariableSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Media } from '@/types/media';
import { ProgressiveImage } from './ProgressiveImage';
import { useMediaSelection } from '@/hooks/useMediaSelection';

interface VirtualMediaGridProps {
  media: Media[];
  onItemClick?: (media: Media, index: number) => void;
  onSelectionChange?: (selected: Media[]) => void;
  selectable?: boolean;
  columnMinWidth?: number;
  gap?: number;
}

export function VirtualMediaGrid({
  media,
  onItemClick,
  onSelectionChange,
  selectable = false,
  columnMinWidth = 200,
  gap = 16,
}: VirtualMediaGridProps) {
  const gridRef = useRef<Grid>(null);
  const { selectedIds, toggleSelection, clearSelection } = useMediaSelection();
  const [columnCount, setColumnCount] = useState(4);
  
  // Calculate dynamic column count based on container width
  const calculateColumns = useCallback((width: number) => {
    const availableWidth = width - gap;
    const columns = Math.floor(availableWidth / (columnMinWidth + gap));
    return Math.max(1, columns);
  }, [columnMinWidth, gap]);
  
  // Calculate row heights based on media aspect ratios
  const getRowHeight = useCallback((rowIndex: number) => {
    const startIdx = rowIndex * columnCount;
    const rowItems = media.slice(startIdx, startIdx + columnCount);
    
    if (rowItems.length === 0) return 0;
    
    // Calculate height based on the tallest item in the row
    const columnWidth = (window.innerWidth - gap * (columnCount + 1)) / columnCount;
    const heights = rowItems.map(item => {
      const ratio = item.aspect_ratio || 1;
      return columnWidth / ratio;
    });
    
    return Math.max(...heights) + gap;
  }, [media, columnCount, gap]);
  
  // Calculate column widths
  const getColumnWidth = useCallback((columnIndex: number) => {
    const totalWidth = window.innerWidth;
    const availableWidth = totalWidth - gap * (columnCount + 1);
    return availableWidth / columnCount;
  }, [columnCount, gap]);
  
  // Memoized cell renderer
  const Cell = useMemo(() => {
    return React.memo(({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
      const index = rowIndex * columnCount + columnIndex;
      const item = media[index];
      
      if (!item) return null;
      
      const isSelected = selectedIds.has(item.id);
      const isPriority = index < columnCount * 2; // First two rows
      
      // Adjust style for gaps
      const adjustedStyle = {
        ...style,
        left: (style.left as number) + gap,
        top: (style.top as number) + gap,
        width: (style.width as number) - gap,
        height: (style.height as number) - gap,
      };
      
      return (
        <div style={adjustedStyle} className="relative group">
          <ProgressiveImage
            src={item.url}
            srcSet={`
              ${item.conversions?.thumb} 300w,
              ${item.conversions?.preview} 600w,
              ${item.conversions?.large} 1200w
            `}
            sizes={`(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw`}
            alt={item.name}
            blurhash={item.blurhash}
            dominantColor={item.dominant_color}
            aspectRatio={item.aspect_ratio}
            priority={isPriority}
            className={cn(
              'rounded-lg transition-all cursor-pointer',
              isSelected && 'ring-2 ring-primary ring-offset-2'
            )}
            containerClassName="w-full h-full"
            onLoad={() => {
              // Recalculate row height if needed
              if (gridRef.current) {
                gridRef.current.resetAfterRowIndex(rowIndex);
              }
            }}
          />
          
          {/* Selection checkbox */}
          {selectable && (
            <div
              className={cn(
                'absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity',
                isSelected && 'opacity-100'
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item)}
                className="w-5 h-5 rounded border-gray-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          
          {/* Item overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity rounded-lg"
            onClick={() => onItemClick?.(item, index)}
          />
        </div>
      );
    });
  }, [media, columnCount, gap, selectedIds, selectable, toggleSelection, onItemClick]);
  
  Cell.displayName = 'VirtualGridCell';
  
  const rowCount = Math.ceil(media.length / columnCount);
  
  return (
    <AutoSizer>
      {({ height, width }) => {
        const newColumnCount = calculateColumns(width);
        if (newColumnCount !== columnCount) {
          setColumnCount(newColumnCount);
        }
        
        return (
          <Grid
            ref={gridRef}
            columnCount={columnCount}
            columnWidth={getColumnWidth}
            height={height}
            rowCount={rowCount}
            rowHeight={getRowHeight}
            width={width}
            overscanRowCount={2}
            overscanColumnCount={1}
            itemData={media}
          >
            {Cell}
          </Grid>
        );
      }}
    </AutoSizer>
  );
}
```

### 3. Smart Preloading and Caching

#### Intelligent Preloader Service
```typescript
// services/display/MediaPreloader.ts
export class MediaPreloader {
  private preloadQueue: Set<string> = new Set();
  private loadedUrls: Set<string> = new Set();
  private observer: IntersectionObserver;
  private networkSpeed: 'slow' | 'medium' | 'fast' = 'medium';
  
  constructor() {
    this.detectNetworkSpeed();
    this.setupIntersectionObserver();
  }
  
  private detectNetworkSpeed() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;
      
      if (effectiveType === '4g') this.networkSpeed = 'fast';
      else if (effectiveType === '3g') this.networkSpeed = 'medium';
      else this.networkSpeed = 'slow';
      
      // Listen for changes
      connection.addEventListener('change', () => {
        this.detectNetworkSpeed();
      });
    }
  }
  
  private setupIntersectionObserver() {
    const rootMargin = this.getRootMargin();
    
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const urls = this.extractUrls(element);
            urls.forEach(url => this.queuePreload(url));
          }
        });
      },
      { rootMargin }
    );
  }
  
  private getRootMargin(): string {
    // Adjust preload distance based on network speed
    switch (this.networkSpeed) {
      case 'fast': return '200px';
      case 'medium': return '100px';
      case 'slow': return '50px';
    }
  }
  
  private extractUrls(element: HTMLElement): string[] {
    const urls: string[] = [];
    
    // Get main image URL
    const src = element.dataset.src;
    if (src) urls.push(src);
    
    // Get srcset URLs
    const srcset = element.dataset.srcset;
    if (srcset) {
      const srcsetUrls = srcset.split(',').map(s => s.trim().split(' ')[0]);
      urls.push(...srcsetUrls);
    }
    
    return urls;
  }
  
  private async queuePreload(url: string) {
    if (this.loadedUrls.has(url) || this.preloadQueue.has(url)) {
      return;
    }
    
    this.preloadQueue.add(url);
    
    // Limit concurrent preloads based on network speed
    const concurrentLimit = this.getConcurrentLimit();
    if (this.preloadQueue.size <= concurrentLimit) {
      await this.preloadImage(url);
    }
  }
  
  private getConcurrentLimit(): number {
    switch (this.networkSpeed) {
      case 'fast': return 6;
      case 'medium': return 3;
      case 'slow': return 1;
    }
  }
  
  private async preloadImage(url: string): Promise<void> {
    try {
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      
      this.loadedUrls.add(url);
      this.preloadQueue.delete(url);
      
      // Process next in queue
      const next = Array.from(this.preloadQueue)[0];
      if (next) {
        this.preloadImage(next);
      }
      
    } catch (error) {
      console.error(`Failed to preload: ${url}`);
      this.preloadQueue.delete(url);
    }
  }
  
  observe(element: HTMLElement) {
    this.observer.observe(element);
  }
  
  unobserve(element: HTMLElement) {
    this.observer.unobserve(element);
  }
  
  disconnect() {
    this.observer.disconnect();
  }
}
```

## Progressive Enhancement Strategy

### Feature Detection and Fallbacks

```typescript
// utils/media/featureDetection.ts
export const MediaFeatures = {
  supportsWebP: false,
  supportsAVIF: false,
  supportsLazyLoading: false,
  supportsIntersectionObserver: false,
  supportsWebWorkers: false,
  supportsOffscreenCanvas: false,
  supportsImageDecoding: false,
  supportsBlurhash: false,
};

// Detect features on load
export async function detectMediaFeatures() {
  // WebP support
  MediaFeatures.supportsWebP = await checkWebPSupport();
  
  // AVIF support
  MediaFeatures.supportsAVIF = await checkAVIFSupport();
  
  // Native lazy loading
  MediaFeatures.supportsLazyLoading = 'loading' in HTMLImageElement.prototype;
  
  // Intersection Observer
  MediaFeatures.supportsIntersectionObserver = 'IntersectionObserver' in window;
  
  // Web Workers
  MediaFeatures.supportsWebWorkers = 'Worker' in window;
  
  // OffscreenCanvas
  MediaFeatures.supportsOffscreenCanvas = 'OffscreenCanvas' in window;
  
  // Image decoding
  MediaFeatures.supportsImageDecoding = 'decode' in HTMLImageElement.prototype;
  
  // BlurHash (requires Canvas API)
  MediaFeatures.supportsBlurhash = 'getContext' in document.createElement('canvas');
  
  return MediaFeatures;
}

async function checkWebPSupport(): Promise<boolean> {
  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  return checkImageSupport(webpData);
}

async function checkAVIFSupport(): Promise<boolean> {
  const avifData = 'data:image/avif;base64,AAAAFGZ0eXBhdmlmAAAAAG1pZjEAAACgbWV0YQAAAAAAAAAVcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAC8AAAAGwAAACgpaW5mAAAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAVWlwcnAAAAAOcGl4aQAAAAADCAgIAAAAIG1kYXQSAAoIGAABH8SAAQ0QAAAAAAAAAAAAAAAAAAAAAA==';
  return checkImageSupport(avifData);
}

async function checkImageSupport(dataUri: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUri;
  });
}
```

### Progressive Enhancement Component

```tsx
// components/media/EnhancedMedia.tsx
import React, { useMemo } from 'react';
import { MediaFeatures } from '@/utils/media/featureDetection';
import { ProgressiveImage } from './ProgressiveImage';
import { BasicImage } from './BasicImage';
import { VirtualMediaGrid } from './VirtualMediaGrid';
import { SimpleMediaGrid } from './SimpleMediaGrid';

interface EnhancedMediaProps {
  media: Media | Media[];
  variant: 'single' | 'grid';
  [key: string]: any;
}

export function EnhancedMedia({ media, variant, ...props }: EnhancedMediaProps) {
  // Choose optimal component based on capabilities
  const Component = useMemo(() => {
    if (variant === 'single') {
      // Single image display
      if (MediaFeatures.supportsIntersectionObserver && MediaFeatures.supportsBlurhash) {
        return ProgressiveImage;
      }
      return BasicImage;
    } else {
      // Grid display
      if (MediaFeatures.supportsIntersectionObserver && window.innerWidth > 768) {
        return VirtualMediaGrid;
      }
      return SimpleMediaGrid;
    }
  }, [variant]);
  
  // Optimize props based on capabilities
  const optimizedProps = useMemo(() => {
    const baseProps = { ...props };
    
    // Disable features not supported
    if (!MediaFeatures.supportsLazyLoading) {
      delete baseProps.loading;
    }
    
    if (!MediaFeatures.supportsImageDecoding) {
      delete baseProps.decoding;
    }
    
    // Add fallbacks
    if (!MediaFeatures.supportsWebP && baseProps.srcSet) {
      baseProps.srcSet = baseProps.srcSet.replace(/\.webp/g, '.jpg');
    }
    
    return baseProps;
  }, [props]);
  
  return <Component media={media} {...optimizedProps} />;
}
```

## Implementation Phases

### Phase 1: Core Upload Infrastructure (Week 1-2)
1. Implement chunked upload backend
2. Create upload manager service
3. Add resumable upload UI
4. Implement basic duplicate detection

### Phase 2: Upload Enhancement (Week 3)
1. Add client-side image optimization
2. Implement smart duplicate detection
3. Create duplicate resolution UI
4. Add batch upload features

### Phase 3: Display Optimization (Week 4)
1. Implement BlurHash generation
2. Create progressive image component
3. Add virtualized grid
4. Implement preloading service

### Phase 4: Polish and Performance (Week 5)
1. Add feature detection
2. Implement progressive enhancement
3. Optimize for mobile
4. Add performance monitoring

## Performance Metrics

### Target Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Cumulative Layout Shift**: < 0.1
- **Upload Success Rate**: > 99.5%
- **Duplicate Detection Accuracy**: > 95%

### Monitoring Implementation

```typescript
// services/PerformanceMonitor.ts
export class MediaPerformanceMonitor {
  private metrics: Map<string, any> = new Map();
  
  trackImageLoad(url: string, startTime: number) {
    const duration = performance.now() - startTime;
    
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === url) {
            this.metrics.set(url, {
              duration,
              transferSize: entry.transferSize,
              decodedBodySize: entry.decodedBodySize,
              connectionTime: entry.connectEnd - entry.connectStart,
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
    
    // Report slow loads
    if (duration > 3000) {
      this.reportSlowLoad(url, duration);
    }
  }
  
  private reportSlowLoad(url: string, duration: number) {
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'slow_image_load', {
        event_category: 'Performance',
        event_label: url,
        value: Math.round(duration),
      });
    }
  }
}
```

## Browser Compatibility

### Minimum Requirements
- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

### Progressive Enhancement Support
- Chrome 60+: Basic functionality
- Firefox 60+: Basic functionality
- Safari 12+: Basic functionality
- Edge 18+: Basic functionality

### Polyfills Required
```javascript
// polyfills/media.js
// Intersection Observer
if (!('IntersectionObserver' in window)) {
  import('intersection-observer');
}

// Web Workers
if (!('Worker' in window)) {
  // Fallback to main thread processing
  window.Worker = class {
    postMessage() {}
    terminate() {}
  };
}

// Loading attribute
if (!('loading' in HTMLImageElement.prototype)) {
  // Use Intersection Observer fallback
  import('./lazyload-fallback');
}
```

## Conclusion

This specification provides a comprehensive guide for implementing world-class media upload and display features. The architecture emphasizes:

1. **User Experience**: Resumable uploads, smart duplicate detection, instant feedback
2. **Performance**: Progressive loading, virtualization, intelligent preloading
3. **Resilience**: Offline support, graceful degradation, error recovery
4. **Accessibility**: Keyboard navigation, screen reader support, reduced motion respect

By following this specification, the Maintenance OS will deliver a media experience that matches or exceeds leading platforms while maintaining excellent performance across all devices and network conditions.
