import React, { useState } from 'react';
import { Media } from '@/types/media';
import { Media as UtilMedia } from '@/utils/media';
import { MediaUploader } from './MediaUploader';
import { MediaGallery } from './MediaGallery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMedia } from '@/hooks/useMedia';

interface MediaManagerProps {
    modelType: string;
    modelId: string | number;
    collections?: {
        name: string;
        label: string;
        accept?: string[];
        maxFiles?: number;
    }[];
    canDelete?: boolean;
    canUpload?: boolean;
    onMediaClick?: (media: Media) => void;
    className?: string;
}

export function MediaManager({
    modelType,
    modelId,
    collections = [{ name: 'default', label: 'Files' }],
    canDelete = true,
    canUpload = true,
    onMediaClick,
    className,
}: MediaManagerProps) {
    const [activeCollection, setActiveCollection] = useState(collections[0].name);

    const {
        media,
        isLoading,
        error,
        addMedia,
        removeMedia,
    } = useMedia({
        modelType,
        modelId,
        autoLoad: true,
    });

    const handleUploadComplete = (uploadedMedia: Media[]) => {
        addMedia(uploadedMedia);
    };

    const handleDelete = (deletedMedia: Media) => {
        removeMedia(deletedMedia.id);
    };

    if (collections.length === 1) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>{collections[0].label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {canUpload && (
                        <MediaUploader
                            modelType={modelType}
                            modelId={typeof modelId === 'string' ? parseInt(modelId, 10) : modelId}
                            collection={collections[0].name}
                            allowedMimeTypes={collections[0].accept}
                            maxFiles={collections[0].maxFiles}
                            onUploadComplete={() => handleUploadComplete([])}
                        />
                    )}

                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                            <p className="mt-2 text-sm text-gray-500">Loading media...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">
                            <p>Error: {error}</p>
                        </div>
                    ) : (
                        <MediaGallery
                            media={media as unknown as UtilMedia[]}
                            modelType={modelType}
                            modelId={typeof modelId === 'string' ? parseInt(modelId, 10) : modelId}
                            canDelete={canDelete}
                        />
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Media Files</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeCollection} onValueChange={setActiveCollection}>
                    <TabsList className="mb-4">
                        {collections.map(collection => (
                            <TabsTrigger key={collection.name} value={collection.name}>
                                {collection.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {collections.map(collection => (
                        <TabsContent key={collection.name} value={collection.name} className="space-y-6">
                            {canUpload && (
                                <MediaUploader
                                    modelType={modelType}
                                    modelId={typeof modelId === 'string' ? parseInt(modelId, 10) : modelId}
                                    collection={collection.name}
                                    allowedMimeTypes={collection.accept}
                                    maxFiles={collection.maxFiles}
                                    onUploadComplete={() => handleUploadComplete([])}
                                />
                            )}

                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                                    <p className="mt-2 text-sm text-gray-500">Loading media...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8 text-red-500">
                                    <p>Error: {error}</p>
                                </div>
                            ) : (
                                <MediaGallery
                                    media={media as unknown as UtilMedia[]}
                                    modelType={modelType}
                                    modelId={typeof modelId === 'string' ? parseInt(modelId, 10) : modelId}
                                    canDelete={canDelete}
                                />
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
}
