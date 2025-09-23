/* global self, importScripts */
self.importScripts('https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js');

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
        const optimizedBlob = await self.imageCompression(file, compressionOptions);

        // Auto-rotate based on EXIF if needed
        let finalBlob = optimizedBlob;
        if (options.autoOrient) {
            finalBlob = await autoOrient(optimizedBlob);
        }

        // Generate preview if requested
        let preview = null;
        if (options.generatePreview) {
            preview = await generatePreview(finalBlob, {
                maxSize: 200,
                format: 'webp',
            });
        }

        // Create optimized file
        const optimizedFile = new File([finalBlob], file.name, {
            type: finalBlob.type,
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
    try {
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
        applyOrientation(ctx, canvas, orientation, img.width, img.height);
        ctx.drawImage(img, 0, 0);

        return canvas.convertToBlob({ type: blob.type, quality: 0.95 });
    } catch (error) {
        console.error('Auto-orient failed:', error);
        return blob; // Return original on error
    }
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

    const canvas = new OffscreenCanvas(Math.round(width), Math.round(height));
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0, width, height);

    const previewBlob = await canvas.convertToBlob({
        type: `image/${options.format}`,
        quality: 0.8,
    });

    // Convert to base64 data URL
    const reader = new FileReader();
    return new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(previewBlob);
    });
}

async function getImageDimensions(file) {
    try {
        const img = await createImageBitmap(file);
        return {
            width: img.width,
            height: img.height,
        };
    } catch (error) {
        return null;
    }
}

function getExifOrientation(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    if (view.getUint16(0, false) !== 0xFFD8) {
        return 1; // Not a JPEG
    }

    const length = view.byteLength;
    let offset = 2;

    while (offset < length) {
        if (view.getUint16(offset, false) === 0xFFE1) {
            if (view.getUint32(offset + 4, false) === 0x45786966) { // "Exif"
                const tiffOffset = offset + 10;
                const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
                const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian) + tiffOffset;
                const tags = view.getUint16(ifdOffset, littleEndian);

                for (let i = 0; i < tags; i++) {
                    const tagOffset = ifdOffset + 2 + (i * 12);
                    if (view.getUint16(tagOffset, littleEndian) === 0x0112) { // Orientation tag
                        return view.getUint16(tagOffset + 8, littleEndian);
                    }
                }
            }
        }
        offset += 2 + view.getUint16(offset + 2, false);
    }

    return 1; // Default orientation
}

function applyOrientation(ctx, canvas, orientation, width, height) {
    switch (orientation) {
        case 2: // Flip horizontal
            ctx.transform(-1, 0, 0, 1, width, 0);
            break;
        case 3: // Rotate 180
            ctx.transform(-1, 0, 0, -1, width, height);
            break;
        case 4: // Flip vertical
            ctx.transform(1, 0, 0, -1, 0, height);
            break;
        case 5: // Flip vertical + rotate 90 CW
            canvas.width = height;
            canvas.height = width;
            ctx.transform(0, 1, 1, 0, 0, 0);
            break;
        case 6: // Rotate 90 CW
            canvas.width = height;
            canvas.height = width;
            ctx.transform(0, 1, -1, 0, height, 0);
            break;
        case 7: // Flip horizontal + rotate 90 CW
            canvas.width = height;
            canvas.height = width;
            ctx.transform(0, -1, -1, 0, height, width);
            break;
        case 8: // Rotate 270 CW
            canvas.width = height;
            canvas.height = width;
            ctx.transform(0, -1, 1, 0, 0, width);
            break;
    }
}
