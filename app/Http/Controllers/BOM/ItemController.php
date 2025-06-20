<?php

namespace App\Http\Controllers\BOM;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ItemController extends Controller
{
    public function bomConfig(Request $request)
    {
        return Inertia::render('items/bom-config', [
            'data' => [
                'data' => [],
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 8,
                'total' => 0,
            ],
            'filters' => [
                'search' => $request->input('search', ''),
                'sort' => $request->input('sort', 'name'),
                'direction' => $request->input('direction', 'asc'),
                'per_page' => $request->input('per_page', 8),
            ],
        ]);
    }
}
