import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Media } from '@/types/media';

interface UseMediaOptions {
    modelType: string;
    modelId: string | number;
    collection?: string;
    autoLoad?: boolean;
}

export function useMedia({
    modelType,
    modelId,
    collection,
    autoLoad = true,
}: UseMediaOptions) {
    const [media, setMedia] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMedia = useCallback(async () => {
        if (!modelType || !modelId) return;

        setIsLoading(true);
        setError(null);

        try {
            // This would need a backend endpoint to fetch media for a model
            // For now, we'll use a placeholder
            const response = await axios.get(`/api/${modelType}/${modelId}/media`, {
                params: collection ? { collection } : undefined,
            });

            setMedia(response.data.data || []);
        } catch (err) {
            setError((err as { message?: string }).message || 'Failed to load media');
            console.error('Failed to load media:', err);
        } finally {
            setIsLoading(false);
        }
    }, [modelType, modelId, collection]);

    const addMedia = useCallback((newMedia: Media | Media[]) => {
        const mediaArray = Array.isArray(newMedia) ? newMedia : [newMedia];
        setMedia(prev => [...prev, ...mediaArray]);
    }, []);

    const removeMedia = useCallback((mediaId: string) => {
        setMedia(prev => prev.filter(m => m.id !== mediaId));
    }, []);

    const updateMedia = useCallback((mediaId: string, updates: Partial<Media>) => {
        setMedia(prev => prev.map(m =>
            m.id === mediaId ? { ...m, ...updates } : m
        ));
    }, []);

    const setPrimaryMedia = useCallback(async (mediaId: string) => {
        try {
            // This would need a backend endpoint
            await axios.post(`/api/media/secure/${mediaId}/set-primary`);

            // Update local state
            setMedia(prev => prev.map(m => ({
                ...m,
                is_primary: m.id === mediaId,
            })));
        } catch (err) {
            console.error('Failed to set primary media:', err);
            throw err;
        }
    }, []);

    useEffect(() => {
        if (autoLoad) {
            loadMedia();
        }
    }, [autoLoad, loadMedia]);

    return {
        media,
        isLoading,
        error,
        loadMedia,
        addMedia,
        removeMedia,
        updateMedia,
        setPrimaryMedia,
    };
}
