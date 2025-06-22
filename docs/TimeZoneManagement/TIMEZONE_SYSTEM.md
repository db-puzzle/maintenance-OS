# Timezone System Documentation

## Overview

The maintenance OS application implements a sophisticated timezone handling system that ensures accurate time display and storage across different geographical locations. The system uses a multi-layered approach combining UTC storage, user preferences, automatic timezone detection, and a country-based timezone selection interface.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [User Timezone Management](#user-timezone-management)
4. [Country-Based Timezone Selection](#country-based-timezone-selection)
5. [Automatic Timezone Detection](#automatic-timezone-detection)
6. [Timezone Conversion Strategy](#timezone-conversion-strategy)
7. [Shift Timezone Handling](#shift-timezone-handling)
8. [Implementation Details](#implementation-details)
9. [API Endpoints](#api-endpoints)
10. [Frontend Components](#frontend-components)
11. [Best Practices](#best-practices)

## Architecture Overview

The timezone system follows these core principles:

- **UTC Storage**: All timestamps are stored in UTC in the database
- **User Preferences**: Each user has a configurable timezone preference
- **Country-Based Selection**: Users select their country first, then their specific timezone
- **Automatic Detection**: Browser timezone is detected and users are prompted when mismatches occur
- **Shift Independence**: Shifts maintain their own timezone for facility-specific scheduling

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Database      │     │    Backend      │     │    Frontend     │
│   (UTC Only)    │ <-> │  (PHP/Laravel)  │ <-> │  (React/Inertia)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                         │
        │                       │                         │
        └───────────────────────┴─────────────────────────┘
                    All times converted at boundaries
```

## Database Schema

### Users Table

```sql
-- Column definition in migration
$table->string('timezone', 50)->default('UTC');
```

- Stores IANA timezone identifiers (e.g., 'America/New_York', 'Europe/London')
- Default value: 'UTC'
- Maximum length: 50 characters

### Shifts Table

```sql
-- Column definition in migration
$table->string('timezone')->default('UTC');
```

- Independent timezone for shift scheduling
- Allows facilities to operate in their local timezone
- Default value: 'UTC'

## User Timezone Management

### Registration Flow

1. **Automatic Detection**: When users register, their browser timezone is automatically detected:
   ```javascript
   const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
   ```

2. **Form Submission**: The detected timezone is included in the registration form:
   ```javascript
   // In resources/js/pages/auth/register.tsx
   useEffect(() => {
       const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
       if (browserTimezone) {
           setData('timezone', browserTimezone);
       }
   }, [setData]);
   ```

3. **Backend Processing**: The timezone is validated and stored:
   ```php
   // In RegisteredUserController
   $user = User::create([
       'name' => $request->name,
       'email' => $request->email,
       'password' => Hash::make($request->password),
       'timezone' => $request->timezone ?? 'UTC',
   ]);
   ```

### Profile Settings

Users can update their timezone through the profile settings page using a dual-dropdown interface:

1. **Country Selection**: Users first select their country from a dropdown
2. **Timezone Selection**: Based on the country, available timezones are populated
3. **Validation**: Server-side validation ensures only valid IANA timezones are accepted
4. **Update Process**: Changes trigger a page reload to apply the new timezone

## Country-Based Timezone Selection

### Backend Implementation

The system leverages PHP's built-in `DateTimeZone::listIdentifiers` to generate timezone lists by country:

#### Timezone Service

```php
<?php

namespace App\Services;

use DateTimeZone;

class TimezoneService
{
    /**
     * Get list of all countries with their timezones
     *
     * @return array
     */
    public static function getCountriesWithTimezones(): array
    {
        $countries = [];
        $regionCodes = [
            DateTimeZone::AFRICA,
            DateTimeZone::AMERICA,
            DateTimeZone::ANTARCTICA,
            DateTimeZone::ASIA,
            DateTimeZone::ATLANTIC,
            DateTimeZone::AUSTRALIA,
            DateTimeZone::EUROPE,
            DateTimeZone::INDIAN,
            DateTimeZone::PACIFIC,
        ];

        // Get all timezone identifiers
        foreach ($regionCodes as $region) {
            $timezones = DateTimeZone::listIdentifiers($region);
            foreach ($timezones as $timezone) {
                // Extract country code from timezone identifier
                $country = self::getCountryFromTimezone($timezone);
                if ($country) {
                    if (!isset($countries[$country])) {
                        $countries[$country] = [];
                    }
                    $countries[$country][] = $timezone;
                }
            }
        }

        return $countries;
    }

    /**
     * Get timezones for a specific country
     *
     * @param string $countryCode Two-letter country code (e.g., 'US', 'CA')
     * @return array
     */
    public static function getTimezonesForCountry(string $countryCode): array
    {
        return DateTimeZone::listIdentifiers(
            DateTimeZone::PER_COUNTRY, 
            strtoupper($countryCode)
        );
    }

    /**
     * Get country name from country code
     *
     * @param string $countryCode
     * @return string
     */
    public static function getCountryName(string $countryCode): string
    {
        // This would typically use a country database or service
        // For now, we'll use a simple mapping
        $countries = [
            'US' => 'United States',
            'CA' => 'Canada',
            'GB' => 'United Kingdom',
            'AU' => 'Australia',
            'BR' => 'Brazil',
            'CN' => 'China',
            'DE' => 'Germany',
            'FR' => 'France',
            'IN' => 'India',
            'JP' => 'Japan',
            'MX' => 'Mexico',
            'RU' => 'Russia',
            // Add more as needed
        ];

        return $countries[$countryCode] ?? $countryCode;
    }

    /**
     * Extract country code from timezone identifier
     *
     * @param string $timezone
     * @return string|null
     */
    private static function getCountryFromTimezone(string $timezone): ?string
    {
        // Map of timezone prefixes to country codes
        $timezoneCountryMap = [
            'America/New_York' => 'US',
            'America/Chicago' => 'US',
            'America/Los_Angeles' => 'US',
            'America/Toronto' => 'CA',
            'Europe/London' => 'GB',
            'Europe/Paris' => 'FR',
            'Europe/Berlin' => 'DE',
            'Asia/Tokyo' => 'JP',
            'Asia/Shanghai' => 'CN',
            'Asia/Kolkata' => 'IN',
            'Australia/Sydney' => 'AU',
            'America/Sao_Paulo' => 'BR',
            // This would be more comprehensive in production
        ];

        // For a more complete solution, you might use a timezone database
        // or parse the timezone identifier more intelligently
        
        return $timezoneCountryMap[$timezone] ?? null;
    }

    /**
     * Format timezone for display
     *
     * @param string $timezone
     * @return string
     */
    public static function formatTimezoneDisplay(string $timezone): string
    {
        $dt = new \DateTime('now', new DateTimeZone($timezone));
        $offset = $dt->format('P'); // +05:30 format
        
        // Extract city name from timezone
        $parts = explode('/', $timezone);
        $city = str_replace('_', ' ', end($parts));
        
        return sprintf('%s (UTC%s)', $city, $offset);
    }
}
```

#### API Controller

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TimezoneService;
use Illuminate\Http\Request;

class TimezoneController extends Controller
{
    /**
     * Get all countries with their timezones
     */
    public function countries()
    {
        $countriesWithTimezones = TimezoneService::getCountriesWithTimezones();
        
        $formattedCountries = [];
        foreach ($countriesWithTimezones as $code => $timezones) {
            $formattedCountries[] = [
                'code' => $code,
                'name' => TimezoneService::getCountryName($code),
                'timezone_count' => count($timezones),
            ];
        }
        
        // Sort by country name
        usort($formattedCountries, function($a, $b) {
            return strcmp($a['name'], $b['name']);
        });
        
        return response()->json($formattedCountries);
    }

    /**
     * Get timezones for a specific country
     */
    public function timezones($countryCode)
    {
        $timezones = TimezoneService::getTimezonesForCountry($countryCode);
        
        $formattedTimezones = [];
        foreach ($timezones as $timezone) {
            $formattedTimezones[] = [
                'value' => $timezone,
                'label' => TimezoneService::formatTimezoneDisplay($timezone),
            ];
        }
        
        return response()->json($formattedTimezones);
    }
}
```

### Frontend Implementation

#### Enhanced Timezone Selector Component

```typescript
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}

export function CountryTimezoneSelect({ value, onChange, error }: CountryTimezoneSelectProps) {
    const [countries, setCountries] = useState<Country[]>([]);
    const [timezones, setTimezones] = useState<Timezone[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Load countries on mount
    useEffect(() => {
        axios.get('/api/timezones/countries')
            .then(response => {
                setCountries(response.data);
                // If a timezone is already selected, determine its country
                if (value) {
                    detectCountryFromTimezone(value);
                }
            })
            .catch(error => {
                console.error('Failed to load countries:', error);
            });
    }, []);

    // Load timezones when country changes
    useEffect(() => {
        if (selectedCountry) {
            setLoading(true);
            axios.get(`/api/timezones/countries/${selectedCountry}`)
                .then(response => {
                    setTimezones(response.data);
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Failed to load timezones:', error);
                    setLoading(false);
                });
        } else {
            setTimezones([]);
        }
    }, [selectedCountry]);

    const detectCountryFromTimezone = async (timezone: string) => {
        // This would ideally be an API endpoint that returns the country for a timezone
        // For now, we'll do a simple detection based on common patterns
        const countryPatterns = {
            'US': ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Denver'],
            'CA': ['America/Toronto', 'America/Vancouver', 'America/Edmonton'],
            'GB': ['Europe/London'],
            'AU': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'],
            // Add more patterns as needed
        };

        for (const [country, patterns] of Object.entries(countryPatterns)) {
            if (patterns.some(pattern => timezone.includes(pattern))) {
                setSelectedCountry(country);
                break;
            }
        }
    };

    const handleCountryChange = (countryCode: string) => {
        setSelectedCountry(countryCode);
        onChange(''); // Clear timezone selection when country changes
    };

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
                <Label htmlFor="timezone">Timezone</Label>
                <Select 
                    value={value} 
                    onValueChange={onChange}
                    disabled={!selectedCountry || loading}
                >
                    <SelectTrigger id="timezone">
                        <SelectValue placeholder={loading ? "Loading..." : "Select a timezone"} />
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

#### Updated Profile Page Integration

```typescript
// In resources/js/pages/settings/profile.tsx
import { CountryTimezoneSelect } from '@/components/CountryTimezoneSelect';

// Replace the existing timezone selector with:
<CountryTimezoneSelect
    value={data.timezone}
    onChange={(timezone) => setData('timezone', timezone)}
    error={errors.timezone}
/>
```

### Routes Configuration

Add the following routes to handle the timezone API endpoints:

```php
// In routes/api.php
Route::prefix('timezones')->group(function () {
    Route::get('countries', [TimezoneController::class, 'countries']);
    Route::get('countries/{countryCode}', [TimezoneController::class, 'timezones']);
});
```

## Automatic Timezone Detection

### TimezoneDetector Component

The `TimezoneDetector` component provides intelligent mismatch detection:

```typescript
// Key features:
- Runs on every authenticated page load
- Compares browser timezone with saved preference
- Uses session storage to prevent repeated prompts
- Shows current time in both timezones for clarity
- Can now suggest the appropriate country based on detected timezone
```

### Enhanced Detection Logic

```javascript
// Enhanced detection flow with country awareness
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
if (browserTimezone !== currentTimezone) {
    // Detect country from browser timezone
    const detectedCountry = await detectCountryFromTimezone(browserTimezone);
    
    const sessionKey = `timezone_prompt_${userId}_${browserTimezone}`;
    if (!sessionStorage.getItem(sessionKey)) {
        // Show prompt with pre-selected country
        sessionStorage.setItem(sessionKey, 'true');
    }
}
```

## Timezone Conversion Strategy

### Backend Conversions

The User model provides helper methods for timezone conversion:

```php
// Convert from user's timezone to UTC
public function convertToUTC($datetime): Carbon
{
    return Carbon::parse($datetime, $this->timezone ?? 'UTC')->setTimezone('UTC');
}

// Convert from UTC to user's timezone
public function convertFromUTC($datetime): Carbon
{
    return Carbon::parse($datetime, 'UTC')->setTimezone($this->timezone ?? 'UTC');
}
```

### Frontend Display

Frontend utilities handle timezone-aware formatting:

```javascript
// Format datetime in user's local timezone
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: userTimezone
    });
};
```

## Shift Timezone Handling

Shifts maintain independent timezones for facility-specific scheduling:

### Shift Model Methods

```php
// Convert shift local time to UTC
public function localTimeToUTC(string $time, string $date): Carbon
{
    return Carbon::parse($date.' '.$time, $this->timezone)->utc();
}

// Convert UTC to shift local time
public function utcToLocalTime(Carbon $utcTime): Carbon
{
    return $utcTime->copy()->setTimezone($this->timezone);
}
```

### Use Cases

- **Multi-facility Operations**: Each facility operates in its local timezone
- **Shift Scheduling**: Shift times are defined in facility timezone
- **Runtime Calculations**: Asset runtime considers shift timezone for accuracy

## Implementation Details

### Configuration

```php
// config/app.php
'timezone' => 'UTC',  // Application default timezone
```

### Middleware Integration

The `TimezoneDetector` is integrated in the main layout:

```javascript
// resources/js/layouts/app/app-sidebar-layout.tsx
{auth?.user && (
    <TimezoneDetector 
        currentTimezone={(auth.user.timezone as string) || 'UTC'} 
        userId={auth.user.id} 
    />
)}
```

### Current Timezone Constants

The existing timezone constants in `resources/js/constants/timezones.ts` remain available for backward compatibility and quick access to common timezones.

## API Endpoints

### Get Countries

```
GET /api/timezones/countries
```

**Response:**
```json
[
    {
        "code": "US",
        "name": "United States",
        "timezone_count": 6
    },
    {
        "code": "CA",
        "name": "Canada",
        "timezone_count": 5
    }
    // ... more countries
]
```

### Get Timezones for Country

```
GET /api/timezones/countries/{countryCode}
```

**Parameters:**
- `countryCode`: Two-letter ISO country code (e.g., 'US', 'CA', 'GB')

**Response:**
```json
[
    {
        "value": "America/New_York",
        "label": "New York (UTC-05:00)"
    },
    {
        "value": "America/Chicago",
        "label": "Chicago (UTC-06:00)"
    }
    // ... more timezones
]
```

### Update User Timezone

```
PATCH /settings/timezone
```

**Request Body:**
```json
{
    "timezone": "America/New_York"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Timezone updated successfully",
    "timezone": "America/New_York"
}
```

## Frontend Components

### Key Components

1. **TimezoneDetector** (`resources/js/components/TimezoneDetector.tsx`)
   - Automatic mismatch detection
   - User prompt dialog
   - Session management
   - Country-aware suggestions

2. **CountryTimezoneSelect** (`resources/js/components/CountryTimezoneSelect.tsx`)
   - Dual dropdown interface
   - Country-first selection
   - Dynamic timezone loading
   - Proper error handling

3. **Timezone Utilities** (`resources/js/constants/timezones.ts`)
   - Timezone display names
   - Current time formatting
   - Timezone validation
   - Country detection helpers

## Best Practices

### For Developers

1. **Always Store in UTC**: Never store local times in the database
2. **Use PHP's Built-in Functions**: Leverage `DateTimeZone::listIdentifiers` for accurate timezone lists
3. **Cache Country/Timezone Data**: Consider caching the country-timezone mappings for performance
4. **Handle Edge Cases**: Some countries have many timezones (e.g., US, Russia, Canada)
5. **Validate Both Country and Timezone**: Ensure the selected timezone belongs to the selected country

### For Users

1. **Select Your Country First**: This narrows down the timezone options
2. **Verify UTC Offset**: Check the UTC offset shown in parentheses
3. **Update When Traveling**: Update both country and timezone when working from different locations

### Implementation Tips

```php
// Cache timezone data for performance
Cache::remember('timezones_by_country', 3600, function () {
    return TimezoneService::getCountriesWithTimezones();
});

// Validate timezone belongs to country
$request->validate([
    'country' => 'required|string|size:2',
    'timezone' => [
        'required',
        'string',
        'timezone',
        function ($attribute, $value, $fail) use ($request) {
            $countryTimezones = TimezoneService::getTimezonesForCountry($request->country);
            if (!in_array($value, $countryTimezones)) {
                $fail('The selected timezone is not valid for the selected country.');
            }
        },
    ],
]);
```

## Troubleshooting

### Common Issues

1. **Country Not Showing Timezones**
   - Verify the country code is valid
   - Check if `DateTimeZone::listIdentifiers` returns data for that country
   - Ensure API endpoint is accessible

2. **Timezone Detection Not Matching Country**
   - Browser timezone might not map cleanly to countries
   - Some timezones span multiple countries
   - Consider showing nearby options

3. **Performance Issues**
   - Cache country and timezone lists
   - Consider loading timezone data asynchronously
   - Implement pagination for countries with many timezones

### Debug Helpers

```javascript
// Check detected timezone
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);

// Verify user timezone
console.log(auth.user.timezone);

// Test timezone conversion
const testDate = new Date();
console.log(testDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
```

## Future Enhancements

1. **Geolocation Integration**: Auto-detect country based on IP address
2. **Timezone Abbreviations**: Show common abbreviations (EST, PST, GMT)
3. **DST Indicators**: Show which timezones observe daylight saving time
4. **Popular Timezones**: Quick access to frequently used timezones
5. **Search Functionality**: Allow searching across all timezones
6. **Regional Grouping**: Group timezones by region within large countries

## Related Documentation

- [User Management System](./UserManagement.md)
- [Shift Scheduling System](./ShiftScheduling.md)
- [API Documentation](./API.md)
- [PHP DateTimeZone Documentation](https://www.php.net/manual/en/class.datetimezone.php) 