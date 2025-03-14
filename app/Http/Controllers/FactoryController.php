<?php

namespace App\Http\Controllers;

use App\Models\Factory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FactoryController extends Controller
{
    public function index()
    {
        $factories = Factory::all();
        return Inertia::render('Factories/Index', [
            'factories' => $factories
        ]);
    }
} 