<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class AssetHierarchyController extends Controller
{
    /**
     * Display the asset hierarchy navigation page.
     */
    public function index()
    {
        return Inertia::render('asset-hierarchy/index');
    }
}
