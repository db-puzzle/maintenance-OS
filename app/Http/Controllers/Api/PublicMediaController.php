<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\Request;

class PublicMediaController extends Controller
{
    /**
     * Show public media.
     */
    public function show(Request $request, Media $media)
    {
        // Check if media is in a public collection
        $publicCollections = ['images', 'public-documents', 'avatars', 'templates', 'preview'];

        if (! in_array($media->collection_name, $publicCollections)) {
            abort(404);
        }

        // For local development, redirect to the media URL
        // In production, this would typically be handled by CDN
        return redirect($media->getUrl());
    }

    /**
     * Show media conversion.
     */
    public function conversion(Request $request, Media $media, string $conversion)
    {
        // Check if media is in a public collection
        $publicCollections = ['images', 'public-documents', 'avatars', 'templates', 'preview'];

        if (! in_array($media->collection_name, $publicCollections)) {
            abort(404);
        }

        // Check if conversion exists
        if (! $media->hasGeneratedConversion($conversion)) {
            abort(404);
        }

        // Redirect to the conversion URL
        return redirect($media->getUrl($conversion));
    }
}
