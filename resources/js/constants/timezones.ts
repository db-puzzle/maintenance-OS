// Type definitions
export interface Timezone {
    value: string; // IANA timezone identifier
    label: string; // Display name
}

export interface TimezoneGroups {
    [region: string]: Timezone[];
}

// Main timezone data grouped by region
export const TIMEZONE_GROUPS: TimezoneGroups = {
    Americas: [
        { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
        { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
        { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
        { value: 'America/Sao_Paulo', label: 'Brasília Time' },
        { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
        { value: 'America/Mexico_City', label: 'Mexico City' },
        { value: 'America/Bogota', label: 'Bogotá' },
        { value: 'America/Lima', label: 'Lima' },
        { value: 'America/Toronto', label: 'Toronto' },
        { value: 'America/Vancouver', label: 'Vancouver' },
    ],
    Europe: [
        { value: 'Europe/London', label: 'London' },
        { value: 'Europe/Paris', label: 'Paris' },
        { value: 'Europe/Berlin', label: 'Berlin' },
        { value: 'Europe/Madrid', label: 'Madrid' },
        { value: 'Europe/Rome', label: 'Rome' },
        { value: 'Europe/Moscow', label: 'Moscow' },
        { value: 'Europe/Istanbul', label: 'Istanbul' },
        { value: 'Europe/Athens', label: 'Athens' },
        { value: 'Europe/Warsaw', label: 'Warsaw' },
        { value: 'Europe/Zurich', label: 'Zurich' },
        { value: 'Europe/Amsterdam', label: 'Amsterdam' },
        { value: 'Europe/Brussels', label: 'Brussels' },
        { value: 'Europe/Prague', label: 'Prague' },
    ],
    Asia: [
        { value: 'Asia/Tokyo', label: 'Tokyo' },
        { value: 'Asia/Shanghai', label: 'Beijing, Shanghai' },
        { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
        { value: 'Asia/Singapore', label: 'Singapore' },
        { value: 'Asia/Kolkata', label: 'India Standard Time' },
        { value: 'Asia/Dubai', label: 'Dubai' },
        { value: 'Asia/Seoul', label: 'Seoul' },
        { value: 'Asia/Manila', label: 'Manila' },
        { value: 'Asia/Jakarta', label: 'Jakarta' },
        { value: 'Asia/Tehran', label: 'Tehran' },
        { value: 'Asia/Baghdad', label: 'Baghdad' },
        { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh City' },
        { value: 'Asia/Bangkok', label: 'Bangkok' },
        { value: 'Asia/Kathmandu', label: 'Kathmandu' },
        { value: 'Asia/Almaty', label: 'Almaty' },
        { value: 'Asia/Tashkent', label: 'Tashkent' },
        { value: 'Asia/Riyadh', label: 'Riyadh' },
    ],
    Africa: [
        { value: 'Africa/Cairo', label: 'Cairo' },
        { value: 'Africa/Johannesburg', label: 'Johannesburg' },
        { value: 'Africa/Nairobi', label: 'Nairobi' },
        { value: 'Africa/Lagos', label: 'Lagos' },
    ],
    Pacific: [
        { value: 'Australia/Sydney', label: 'Sydney' },
        { value: 'Australia/Melbourne', label: 'Melbourne' },
        { value: 'Pacific/Auckland', label: 'Auckland' },
        { value: 'Australia/Brisbane', label: 'Brisbane' },
        { value: 'Australia/Perth', label: 'Perth' },
        { value: 'Pacific/Fiji', label: 'Fiji' },
        { value: 'Pacific/Honolulu', label: 'Honolulu' },
        { value: 'Pacific/Guam', label: 'Guam' },
        { value: 'Pacific/Tahiti', label: 'Tahiti' },
    ],
    Other: [{ value: 'UTC', label: 'UTC' }],
};

// Generate flat map for quick lookups from TIMEZONE_GROUPS
export const TIMEZONE_DISPLAY_NAMES: Record<string, string> = Object.values(TIMEZONE_GROUPS)
    .flat()
    .reduce(
        (acc, timezone) => {
            acc[timezone.value] = timezone.label;
            return acc;
        },
        {} as Record<string, string>,
    );

// Helper function to get timezone display name
export const getTimezoneDisplayName = (timezone: string): string => {
    return TIMEZONE_DISPLAY_NAMES[timezone] || timezone;
};

// Get all timezones as a flat array
export const getAllTimezones = (): Timezone[] => {
    return Object.values(TIMEZONE_GROUPS).flat();
};

// Get timezone by value
export const getTimezoneByValue = (value: string): Timezone | undefined => {
    return getAllTimezones().find((tz) => tz.value === value);
};

// Format current time in a specific timezone
export const getCurrentTimeInTimezone = (timezone: string): string => {
    if (!timezone) return '';

    try {
        return new Date().toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch (error) {
        console.error(`Invalid timezone: ${timezone}`, error);
        return '';
    }
};
