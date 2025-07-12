<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Work Order Generation Schedule
Schedule::command('work-orders:generate-from-routines')
    ->hourly()
    ->name('generate-work-orders')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/work-order-generation.log'));
