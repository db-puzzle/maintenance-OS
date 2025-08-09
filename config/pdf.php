<?php

return [
    /*
    |--------------------------------------------------------------------------
    | DomPDF Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration options for DomPDF - the PDF generation engine used
    | throughout the application for generating QR tags, reports, and exports.
    |
    */
    'dompdf' => [
        'options' => [
            // Enable remote content (for loading images via URLs)
            'isRemoteEnabled' => true,
            
            // Enable HTML5 parser for better modern HTML/CSS support
            'isHtml5ParserEnabled' => true,
            
            // Enable inline PHP execution (use with caution)
            'isPhpEnabled' => false,
            
            // Default paper size
            'defaultPaperSize' => 'a4',
            
            // Default font
            'defaultFont' => 'sans-serif',
            
            // DPI setting
            'dpi' => 96,
            
            // Enable inline JavaScript (use with caution)
            'isJavascriptEnabled' => false,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Font Configuration
    |--------------------------------------------------------------------------
    |
    | Configure custom fonts for PDF generation if needed.
    |
    */
    'fonts' => [
        // Add custom fonts here if needed
        // 'font-name' => [
        //     'normal' => 'path/to/font-normal.ttf',
        //     'bold' => 'path/to/font-bold.ttf',
        //     'italic' => 'path/to/font-italic.ttf',
        //     'bold_italic' => 'path/to/font-bold-italic.ttf',
        // ],
    ],
];