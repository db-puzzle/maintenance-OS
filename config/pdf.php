<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default PDF Engine
    |--------------------------------------------------------------------------
    |
    | This option defines the default PDF engine that will be used to generate
    | PDFs. By default we'll use Browsershot, but you can also use DomPDF.
    |
    */
    'default' => env('PDF_ENGINE', 'browsershot'),

    /*
    |--------------------------------------------------------------------------
    | Browsershot Configuration
    |--------------------------------------------------------------------------
    |
    | These options are passed directly to Browsershot when generating PDFs.
    | You can specify the Chrome/Chromium executable path and other options.
    |
    */
    'browsershot' => [
        'chrome_path' => env('BROWSERSHOT_CHROME_PATH'),
        'node_path' => env('BROWSERSHOT_NODE_PATH'),
        'npm_path' => env('BROWSERSHOT_NPM_PATH'),
        'node_modules_path' => env('BROWSERSHOT_NODE_MODULES_PATH'),
        'timeout' => 60,
        'options' => [
            'args' => [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Required for Docker environments
                '--disable-gpu',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | DomPDF Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration options for DomPDF as a fallback PDF engine.
    |
    */
    'dompdf' => [
        'options' => [
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
        ],
    ],
];
