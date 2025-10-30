import { useEffect } from 'react';
import axios from 'axios';

interface AutomaticTimezoneDetectorProps {
    currentTimezone: string;
    userId: number;
}

export default function AutomaticTimezoneDetector({ currentTimezone, userId }: AutomaticTimezoneDetectorProps) {
    useEffect(() => {
        // Detect browser timezone
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Check if it's different from the current timezone and both are valid
        if (browserTimezone && currentTimezone && browserTimezone !== currentTimezone) {
            // Check if we've already updated the timezone for this browser timezone in this session
            const sessionKey = `timezone_auto_updated_${userId}_${browserTimezone}`;
            const alreadyUpdated = sessionStorage.getItem(sessionKey);

            if (!alreadyUpdated) {
                // Silently update the timezone in the background
                updateTimezoneInBackground(browserTimezone, sessionKey);
            }
        }
    }, [currentTimezone, userId]);

    const updateTimezoneInBackground = async (newTimezone: string, sessionKey: string) => {
        try {
            // Update the user's timezone silently
            const response = await axios.patch('/settings/timezone', {
                timezone: newTimezone,
            });

            if (response.data.success) {
                // Mark that we've updated to this timezone to avoid repeated updates
                sessionStorage.setItem(sessionKey, 'true');

                // Optional: You could dispatch a custom event here if other components need to know
                window.dispatchEvent(new CustomEvent('timezoneUpdated', {
                    detail: { timezone: newTimezone }
                }));
            }
        } catch (error) {
            // Silently fail - we don't want to interrupt the user's experience
            console.error('Failed to update timezone automatically:', error);
        }
    };

    // This component doesn't render anything
    return null;
}
