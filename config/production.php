<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Production Module Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains configuration options for the production module.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Manual Production Reporting
    |--------------------------------------------------------------------------
    |
    | Allow manual production reporting on orders that have routes defined.
    | When false, orders with routes must use step execution for reporting.
    |
    */
    'allow_manual_with_route' => env('PRODUCTION_ALLOW_MANUAL_WITH_ROUTE', false),

    /*
    |--------------------------------------------------------------------------
    | Production Tracking Dashboard
    |--------------------------------------------------------------------------
    |
    | Auto-refresh interval for the production tracking dashboard in seconds.
    |
    */
    'tracking_dashboard_refresh_seconds' => env('PRODUCTION_TRACKING_REFRESH', 30),

    /*
    |--------------------------------------------------------------------------
    | QR Code Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for QR code generation and scanning.
    |
    */
    'qr_code' => [
        'size' => env('QR_CODE_SIZE', 300),
        'margin' => env('QR_CODE_MARGIN', 10),
        'error_correction' => env('QR_CODE_ERROR_CORRECTION', 'M'), // L, M, Q, H
    ],

    /*
    |--------------------------------------------------------------------------
    | Work Cell Configuration
    |--------------------------------------------------------------------------
    |
    | Default settings for work cells.
    |
    */
    'work_cell' => [
        'max_concurrent_operations' => env('WORK_CELL_MAX_CONCURRENT', 1),
        'default_capacity_percentage' => env('WORK_CELL_DEFAULT_CAPACITY', 100),
    ],

    /*
    |--------------------------------------------------------------------------
    | Manufacturing Step Configuration
    |--------------------------------------------------------------------------
    |
    | Default values for manufacturing steps.
    |
    */
    'step' => [
        'default_cycle_time_minutes' => env('STEP_DEFAULT_CYCLE_TIME', 30),
        'default_setup_time_minutes' => env('STEP_DEFAULT_SETUP_TIME', 10),
    ],
];
