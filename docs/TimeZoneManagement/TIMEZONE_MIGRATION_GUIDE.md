# Timezone System Migration Guide

## Overview

This guide outlines the steps to migrate from the current static timezone implementation to a dynamic country-based timezone selection system using PHP's `DateTimeZone::listIdentifiers`.

## Current Implementation vs New Implementation

### Current System
- **Static Data**: Hardcoded timezone list in `resources/js/constants/timezones.ts`
- **Limited Timezones**: Only ~50 timezones available
- **Region-based Grouping**: Timezones grouped by continent (Americas, Europe, Asia, etc.)
- **Frontend-only**: All timezone data stored in JavaScript
- **Manual Updates**: New timezones must be manually added to the code

### New System
- **Dynamic Data**: Uses PHP's `DateTimeZone::listIdentifiers` for real-time timezone data
- **Complete Coverage**: All ~400+ IANA timezones available
- **Country-based Selection**: Two-step selection (Country → Timezone)
- **Backend-driven**: Timezone data served via API endpoints
- **Auto-updated**: Always current with PHP's timezone database

## Migration Steps

### Step 1: Create Backend Services

#### 1.1 Create TimezoneService
Create `app/Services/TimezoneService.php`:

```php
<?php

namespace App\Services;

use DateTimeZone;
use Illuminate\Support\Facades\Cache;

class TimezoneService
{
    /**
     * Get all countries that have timezones
     */
    public static function getAllCountries(): array
    {
        // Cache for 24 hours
        return Cache::remember('timezone_countries', 86400, function () {
            $countries = [];
            
            // Get all timezone identifiers
            $timezones = DateTimeZone::listIdentifiers();
            
            foreach ($timezones as $timezone) {
                // Skip UTC and other non-country timezones
                if (strpos($timezone, '/') === false) {
                    continue;
                }
                
                // Try to determine country from timezone
                $countryCode = self::getCountryFromTimezone($timezone);
                if ($countryCode) {
                    $countries[$countryCode] = true;
                }
            }
            
            // Get proper country names and format
            $formattedCountries = [];
            foreach (array_keys($countries) as $code) {
                $timezones = self::getTimezonesForCountry($code);
                if (count($timezones) > 0) {
                    $formattedCountries[] = [
                        'code' => $code,
                        'name' => self::getCountryName($code),
                        'timezone_count' => count($timezones)
                    ];
                }
            }
            
            // Sort by country name
            usort($formattedCountries, function($a, $b) {
                return strcmp($a['name'], $b['name']);
            });
            
            return $formattedCountries;
        });
    }

    /**
     * Get timezones for a specific country
     */
    public static function getTimezonesForCountry(string $countryCode): array
    {
        $cacheKey = "timezone_country_{$countryCode}";
        
        return Cache::remember($cacheKey, 86400, function () use ($countryCode) {
            $timezones = DateTimeZone::listIdentifiers(
                DateTimeZone::PER_COUNTRY, 
                strtoupper($countryCode)
            );
            
            $formatted = [];
            foreach ($timezones as $timezone) {
                $formatted[] = [
                    'value' => $timezone,
                    'label' => self::formatTimezoneDisplay($timezone)
                ];
            }
            
            return $formatted;
        });
    }

    /**
     * Format timezone for display with UTC offset
     */
    public static function formatTimezoneDisplay(string $timezone): string
    {
        try {
            $dt = new \DateTime('now', new DateTimeZone($timezone));
            $offset = $dt->format('P'); // +05:30 format
            
            // Extract city name from timezone
            $parts = explode('/', $timezone);
            $city = str_replace('_', ' ', end($parts));
            
            return sprintf('%s (UTC%s)', $city, $offset);
        } catch (\Exception $e) {
            return $timezone;
        }
    }

    /**
     * Get country code from timezone (simplified version)
     */
    private static function getCountryFromTimezone(string $timezone): ?string
    {
        // This is a simplified mapping - in production, use a proper timezone-to-country database
        $regions = [
            'America/New_York' => 'US',
            'America/Chicago' => 'US',
            'America/Los_Angeles' => 'US',
            'America/Toronto' => 'CA',
            'Europe/London' => 'GB',
            'Europe/Paris' => 'FR',
            'Asia/Tokyo' => 'JP',
            'Australia/Sydney' => 'AU',
            // Add more mappings as needed
        ];
        
        // Try exact match first
        if (isset($regions[$timezone])) {
            return $regions[$timezone];
        }
        
        // Try to infer from timezone pattern
        if (preg_match('/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage)/', $timezone)) {
            return 'US';
        }
        if (preg_match('/^America\/(Toronto|Vancouver|Edmonton|Winnipeg)/', $timezone)) {
            return 'CA';
        }
        if (preg_match('/^Europe\/London/', $timezone)) {
            return 'GB';
        }
        
        return null;
    }

    /**
     * Get country name from country code
     */
    public static function getCountryName(string $countryCode): string
    {
        // In production, use a proper country database or package
        $countries = [
            'US' => 'United States',
            'CA' => 'Canada',
            'GB' => 'United Kingdom',
            'AU' => 'Australia',
            'NZ' => 'New Zealand',
            'BR' => 'Brazil',
            'MX' => 'Mexico',
            'AR' => 'Argentina',
            'CL' => 'Chile',
            'CO' => 'Colombia',
            'PE' => 'Peru',
            'FR' => 'France',
            'DE' => 'Germany',
            'IT' => 'Italy',
            'ES' => 'Spain',
            'PT' => 'Portugal',
            'NL' => 'Netherlands',
            'BE' => 'Belgium',
            'CH' => 'Switzerland',
            'AT' => 'Austria',
            'PL' => 'Poland',
            'RU' => 'Russia',
            'UA' => 'Ukraine',
            'TR' => 'Turkey',
            'IN' => 'India',
            'CN' => 'China',
            'JP' => 'Japan',
            'KR' => 'South Korea',
            'TH' => 'Thailand',
            'VN' => 'Vietnam',
            'PH' => 'Philippines',
            'ID' => 'Indonesia',
            'MY' => 'Malaysia',
            'SG' => 'Singapore',
            'ZA' => 'South Africa',
            'EG' => 'Egypt',
            'NG' => 'Nigeria',
            'KE' => 'Kenya',
        ];
        
        return $countries[$countryCode] ?? $countryCode;
    }
}
```

#### 1.2 Create API Controller
Create `app/Http/Controllers/Api/TimezoneController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TimezoneService;
use Illuminate\Http\JsonResponse;

class TimezoneController extends Controller
{
    /**
     * Get all countries with timezone information
     */
    public function countries(): JsonResponse
    {
        $countries = TimezoneService::getAllCountries();
        return response()->json($countries);
    }

    /**
     * Get timezones for a specific country
     */
    public function timezones(string $countryCode): JsonResponse
    {
        $timezones = TimezoneService::getTimezonesForCountry($countryCode);
        
        if (empty($timezones)) {
            return response()->json([
                'error' => 'No timezones found for this country'
            ], 404);
        }
        
        return response()->json($timezones);
    }

    /**
     * Get country code for a given timezone
     */
    public function detectCountry(string $timezone): JsonResponse
    {
        // This endpoint helps with auto-detection
        $countryCode = TimezoneService::getCountryFromTimezone($timezone);
        
        return response()->json([
            'country_code' => $countryCode,
            'timezone' => $timezone
        ]);
    }
}
```

### Step 2: Set Up Routes

#### 2.1 Create API Routes File
Create `routes/api.php`:

```php
<?php

use App\Http\Controllers\Api\TimezoneController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->group(function () {
    Route::prefix('timezones')->group(function () {
        Route::get('countries', [TimezoneController::class, 'countries']);
        Route::get('countries/{countryCode}', [TimezoneController::class, 'timezones']);
        Route::get('detect/{timezone}', [TimezoneController::class, 'detectCountry'])
            ->where('timezone', '.*'); // Allow slashes in timezone parameter
    });
});
```

#### 2.2 Register API Routes
Update `bootstrap/app.php` to include API routes:

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php', // Add this line
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // ... rest of configuration
```

### Step 3: Create Frontend Components

#### 3.1 Create CountryTimezoneSelect Component
Create `resources/js/components/CountryTimezoneSelect.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';

interface Country {
    code: string;
    name: string;
    timezone_count: number;
}

interface Timezone {
    value: string;
    label: string;
}

interface CountryTimezoneSelectProps {
    value: string;
    onChange: (timezone: string) => void;
    error?: string;
    label?: string;
    required?: boolean;
}

export function CountryTimezoneSelect({ 
    value, 
    onChange, 
    error, 
    label = "Timezone",
    required = false 
}: CountryTimezoneSelectProps) {
    const [countries, setCountries] = useState<Country[]>([]);
    const [timezones, setTimezones] = useState<Timezone[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [loadingCountries, setLoadingCountries] = useState(true);
    const [loadingTimezones, setLoadingTimezones] = useState(false);

    // Load countries on mount
    useEffect(() => {
        axios.get('/api/timezones/countries')
            .then(response => {
                setCountries(response.data);
                setLoadingCountries(false);
                
                // If a timezone is already selected, detect its country
                if (value) {
                    detectCountryFromTimezone(value);
                }
            })
            .catch(error => {
                console.error('Failed to load countries:', error);
                setLoadingCountries(false);
            });
    }, []);

    // Load timezones when country changes
    useEffect(() => {
        if (selectedCountry) {
            setLoadingTimezones(true);
            axios.get(`/api/timezones/countries/${selectedCountry}`)
                .then(response => {
                    setTimezones(response.data);
                    setLoadingTimezones(false);
                })
                .catch(error => {
                    console.error('Failed to load timezones:', error);
                    setLoadingTimezones(false);
                });
        } else {
            setTimezones([]);
        }
    }, [selectedCountry]);

    const detectCountryFromTimezone = async (timezone: string) => {
        try {
            const response = await axios.get(`/api/timezones/detect/${encodeURIComponent(timezone)}`);
            if (response.data.country_code) {
                setSelectedCountry(response.data.country_code);
            }
        } catch (error) {
            console.error('Failed to detect country:', error);
        }
    };

    const handleCountryChange = (countryCode: string) => {
        setSelectedCountry(countryCode);
        onChange(''); // Clear timezone selection when country changes
    };

    if (loadingCountries) {
        return (
            <div className="space-y-4">
                <div>
                    <Label>{label}</Label>
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="country">Country</Label>
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                    <SelectTrigger id="country">
                        <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                                {country.name} ({country.timezone_count} timezone{country.timezone_count > 1 ? 's' : ''})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label htmlFor="timezone">{label} {required && <span className="text-red-500">*</span>}</Label>
                <Select 
                    value={value} 
                    onValueChange={onChange}
                    disabled={!selectedCountry || loadingTimezones}
                >
                    <SelectTrigger id="timezone">
                        <SelectValue placeholder={loadingTimezones ? "Loading..." : "Select a timezone"} />
                    </SelectTrigger>
                    <SelectContent>
                        {timezones.map((timezone) => (
                            <SelectItem key={timezone.value} value={timezone.value}>
                                {timezone.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>
        </div>
    );
}
```

### Step 4: Update Existing Components

#### 4.1 Update Profile Settings Page
Modify `resources/js/pages/settings/profile.tsx`:

```typescript
// Replace the import
- import { TIMEZONE_GROUPS } from '@/constants/timezones';
+ import { CountryTimezoneSelect } from '@/components/CountryTimezoneSelect';

// Remove the getTimezoneLabel function

// Replace the timezone selector section (lines ~100-145) with:
<CountryTimezoneSelect
    value={data.timezone}
    onChange={(timezone) => setData('timezone', timezone)}
    error={errors.timezone}
    label="Timezone"
    required
/>
```

#### 4.2 Update TimezoneDetector Component
Update `resources/js/components/TimezoneDetector.tsx` to use the new display format:

```typescript
// Update the imports
- import { getCurrentTimeInTimezone, getTimezoneDisplayName } from '@/constants/timezones';
+ import { formatTimezoneForDisplay } from '@/utils/timezone';

// Add the utility function or create a new utils file
const formatTimezoneForDisplay = (timezone: string): string => {
    try {
        const date = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'long'
        });
        
        const parts = formatter.formatToParts(date);
        const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || timezone;
        
        return timeZoneName;
    } catch {
        return timezone;
    }
};

// Update display calls
- {getTimezoneDisplayName(currentTimezone)}
+ {formatTimezoneForDisplay(currentTimezone)}
```

### Step 5: Migration Strategy

#### 5.1 Backward Compatibility
Keep the old timezone constants file temporarily for:
- Existing data validation
- Fallback display names
- Gradual migration

#### 5.2 Data Migration Script
Create a command to validate existing timezone data:

```php
php artisan make:command ValidateTimezones

// In the command:
public function handle()
{
    $users = User::whereNotNull('timezone')->get();
    $invalid = [];
    
    foreach ($users as $user) {
        try {
            new DateTimeZone($user->timezone);
        } catch (\Exception $e) {
            $invalid[] = [
                'user_id' => $user->id,
                'timezone' => $user->timezone
            ];
        }
    }
    
    if (count($invalid) > 0) {
        $this->error('Found ' . count($invalid) . ' invalid timezones');
        $this->table(['User ID', 'Invalid Timezone'], $invalid);
    } else {
        $this->info('All timezones are valid!');
    }
}
```

### Step 6: Testing

#### 6.1 Create Feature Tests
Create `tests/Feature/TimezoneApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class TimezoneApiTest extends TestCase
{
    public function test_can_get_countries_list()
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)
            ->get('/api/timezones/countries');
        
        $response->assertOk()
            ->assertJsonStructure([
                '*' => ['code', 'name', 'timezone_count']
            ]);
    }
    
    public function test_can_get_country_timezones()
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)
            ->get('/api/timezones/countries/US');
        
        $response->assertOk()
            ->assertJsonStructure([
                '*' => ['value', 'label']
            ]);
    }
}
```

### Step 7: Deployment Checklist

1. **Cache Warming**
   ```bash
   php artisan tinker
   >>> \App\Services\TimezoneService::getAllCountries();
   ```

2. **Add to .env**
   ```
   TIMEZONE_CACHE_DURATION=86400
   ```

3. **Clear caches**
   ```bash
   php artisan cache:clear
   php artisan route:clear
   php artisan config:clear
   ```

4. **Run migrations** (if any)

5. **Update documentation**

### Step 8: Cleanup (After Successful Migration)

1. **Remove old timezone constants** (after verification period)
   - Delete `resources/js/constants/timezones.ts`
   - Remove imports from components

2. **Update any remaining references**
   - Search for `TIMEZONE_GROUPS` usage
   - Update shift creation forms
   - Update any other timezone selectors

3. **Add monitoring**
   - Log timezone selection changes
   - Monitor API endpoint performance
   - Track invalid timezone attempts

## Benefits of Migration

1. **Complete Timezone Coverage**: Access to all 400+ IANA timezones
2. **Always Up-to-date**: Automatically includes new timezones as they're added
3. **Better UX**: Country-based selection is more intuitive
4. **Reduced Bundle Size**: No need to ship timezone data to frontend
5. **Easier Maintenance**: No manual timezone list updates needed
6. **Better Internationalization**: Easy to add country name translations

## Rollback Plan

If issues arise:

1. **Keep old constants file** as backup
2. **Feature flag** the new selector:
   ```typescript
   const useNewTimezoneSelector = window.APP_FEATURES?.newTimezoneSelector ?? false;
   ```
3. **Database unchanged**: No schema changes required
4. **API optional**: Can disable API routes without affecting existing functionality

## Performance Considerations

1. **Caching**: All timezone data is cached for 24 hours
2. **Lazy Loading**: Timezones only loaded when country selected
3. **CDN**: Consider caching API responses at CDN level
4. **Database Indexes**: Ensure timezone column is indexed if filtering by it

## Security Considerations

1. **Authentication**: API endpoints require authentication
2. **Rate Limiting**: Consider adding rate limits to timezone API
3. **Input Validation**: Validate country codes and timezone identifiers
4. **CORS**: Ensure proper CORS headers if API is on different domain 