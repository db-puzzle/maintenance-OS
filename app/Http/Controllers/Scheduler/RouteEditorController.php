<?php

namespace App\Http\Controllers\Scheduler;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RouteEditorController extends Controller
{
    /**
     * Exibe a página do editor de rotas
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        return Inertia::render('scheduler/route-editor');
    }
} 