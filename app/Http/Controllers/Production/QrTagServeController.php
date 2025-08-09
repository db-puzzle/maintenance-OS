<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class QrTagServeController extends Controller
{
    /**
     * Serve a QR tag PDF file
     * 
     * This ensures the file is served through authentication
     * and proper access controls.
     */
    public function serve(Request $request, string $path)
    {
        // Validate the path to prevent directory traversal
        if (strpos($path, '..') !== false || strpos($path, '/') === 0) {
            abort(404);
        }
        
        // Ensure the path is for QR tags
        if (!str_starts_with($path, 'qr-tags/')) {
            abort(404);
        }
        
        // Check if file exists
        if (!Storage::disk('local')->exists($path)) {
            abort(404);
        }
        
        // Get file content and mime type
        $file = Storage::disk('local')->get($path);
        $mimeType = Storage::disk('local')->mimeType($path);
        
        // Extract filename from path
        $filename = basename($path);
        
        // Return file as response
        return response($file, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', 'inline; filename="' . $filename . '"')
            ->header('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    }
}
