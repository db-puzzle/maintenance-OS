<?php

namespace Tests\Unit\Models\AssetHierarchy;

use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Shift;
use App\Models\AssetHierarchy\ShiftSchedule;
use App\Models\AssetHierarchy\ShiftTime;
use Carbon\Carbon;
use Tests\Unit\ModelTestCase;

class ShiftTest extends ModelTestCase
{

    public function test_shift_can_be_created_with_factory()
    {
        $shift = Shift::factory()->create();

        $this->assertDatabaseHas('shifts', [
            'id' => $shift->id,
            'name' => $shift->name,
        ]);
        $this->assertNotNull($shift->name);
        $this->assertNotNull($shift->timezone);
        
        // Check that schedules and times were created
        $shift->load('schedules.shiftTimes'); // Eager load to avoid lazy loading
        $this->assertCount(5, $shift->schedules); // Monday to Friday by default
        foreach ($shift->schedules as $schedule) {
            $this->assertCount(1, $schedule->shiftTimes);
        }
    }

    public function test_shift_has_many_schedules()
    {
        $shift = Shift::factory()->create();
        
        $this->assertGreaterThan(0, $shift->schedules->count());
        $this->assertInstanceOf(ShiftSchedule::class, $shift->schedules->first());
    }

    public function test_shift_has_many_assets()
    {
        $shift = Shift::factory()->create();
        $assets = Asset::factory()->count(3)->create([
            'shift_id' => $shift->id,
        ]);

        $this->assertCount(3, $shift->assets);
        $this->assertTrue($shift->assets->contains($assets->first()));
    }

    public function test_shift_asset_count_attribute()
    {
        $shift = Shift::factory()->create();
        
        $this->assertEquals(0, $shift->asset_count);

        // Create assets for this shift
        $plant = \App\Models\AssetHierarchy\Plant::factory()->withShift($shift)->create();
        $area = \App\Models\AssetHierarchy\Area::factory()->forPlant($plant)->create();
        $sector = \App\Models\AssetHierarchy\Sector::factory()->forArea($area)->create();
        
        \App\Models\AssetHierarchy\Asset::factory()->count(5)->forPlantHierarchy($plant, $area, $sector)->create();

        $shift->refresh();
        $this->assertEquals(5, $shift->asset_count);
    }

    public function test_shift_full_week_factory_state()
    {
        $shift = Shift::factory()->fullWeek()->create();

        $this->assertCount(7, $shift->schedules); // All days of the week
        
        $weekdays = $shift->schedules->pluck('weekday')->toArray();
        $this->assertContains('Saturday', $weekdays);
        $this->assertContains('Sunday', $weekdays);
    }

    public function test_shift_brazil_factory_state()
    {
        $shift = Shift::factory()->brazil()->create();

        $this->assertEquals('America/Sao_Paulo', $shift->timezone);
    }

    public function test_shift_local_time_to_utc()
    {
        $shift = Shift::factory()->create([
            'timezone' => 'America/Sao_Paulo',
        ]);

        $localTime = '08:00';
        $date = '2024-01-15';
        $utcTime = $shift->localTimeToUTC($localTime, $date);

        $this->assertInstanceOf(Carbon::class, $utcTime);
        $this->assertEquals('UTC', $utcTime->timezone->getName());
        
        // São Paulo is UTC-3 in January, so 08:00 local = 11:00 UTC
        $this->assertEquals('11:00', $utcTime->format('H:i'));
    }

    public function test_shift_utc_to_local_time()
    {
        $shift = Shift::factory()->create([
            'timezone' => 'America/Sao_Paulo',
        ]);

        $utcTime = Carbon::parse('2024-01-15 11:00:00', 'UTC');
        $localTime = $shift->utcToLocalTime($utcTime);

        $this->assertInstanceOf(Carbon::class, $localTime);
        $this->assertEquals('America/Sao_Paulo', $localTime->timezone->getName());
        $this->assertEquals('08:00', $localTime->format('H:i'));
    }

    public function test_shift_get_shift_times_for_date_in_utc()
    {
        $shift = Shift::factory()->create([
            'timezone' => 'America/Sao_Paulo',
        ]);
        
        // Get Monday schedule
        $mondaySchedule = $shift->schedules->where('weekday', 'Monday')->first();
        $shiftTimes = $shift->getShiftTimesForDateInUTC('2024-01-15', 'Monday');

        $this->assertIsArray($shiftTimes);
        $this->assertCount(1, $shiftTimes); // One shift time by default
        
        $shiftTime = $shiftTimes[0];
        $this->assertArrayHasKey('start', $shiftTime);
        $this->assertArrayHasKey('end', $shiftTime);
        $this->assertArrayHasKey('breaks', $shiftTime);
        $this->assertInstanceOf(Carbon::class, $shiftTime['start']);
        $this->assertInstanceOf(Carbon::class, $shiftTime['end']);
    }

    public function test_shift_calculate_totals()
    {
        $shift = Shift::factory()->create();
        $shift->load('schedules.shiftTimes.breaks'); // Eager load to avoid lazy loading
        $totals = $shift->calculateTotals();

        $this->assertIsArray($totals);
        $this->assertArrayHasKey('work_hours', $totals);
        $this->assertArrayHasKey('work_minutes', $totals);
        $this->assertArrayHasKey('break_hours', $totals);
        $this->assertArrayHasKey('break_minutes', $totals);
        
        // Default shift is 8 hours with 1 hour break = 7 hours work per day
        // 5 days * 7 hours = 35 hours
        $this->assertEquals(35, $totals['work_hours']);
    }

    public function test_shift_fillable_attributes()
    {
        $data = [
            'name' => 'Test Shift',
            'timezone' => 'Europe/London',
        ];

        $shift = Shift::create($data);

        $this->assertDatabaseHas('shifts', $data);
        $this->assertEquals('Test Shift', $shift->name);
        $this->assertEquals('Europe/London', $shift->timezone);
    }

    public function test_shift_handles_overnight_shifts()
    {
        $shift = Shift::factory()->create();
        $shift->load('schedules'); // Eager load
        $schedule = $shift->schedules->first();
        
        // Create a night shift (22:00 to 06:00)
        $schedule->shiftTimes()->delete();
        ShiftTime::factory()->night()->create([
            'shift_schedule_id' => $schedule->id,
        ]);

        $shiftTimes = $shift->getShiftTimesForDateInUTC('2024-01-15', $schedule->weekday);
        
        $this->assertCount(1, $shiftTimes);
        $shiftTime = $shiftTimes[0];
        
        // End time should be after the start time
        $this->assertTrue($shiftTime['end']->greaterThan($shiftTime['start']));
    }
} 