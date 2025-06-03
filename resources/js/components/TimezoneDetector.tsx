import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Globe } from 'lucide-react';

// Set up axios defaults for CSRF protection
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Get CSRF token from meta tag
const token = document.head.querySelector('meta[name="csrf-token"]');
if (token) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = (token as HTMLMetaElement).content;
}

interface TimezoneDetectorProps {
    currentTimezone: string;
    userId: number;
    forceShow?: boolean;
}

// Map of common timezone identifiers to their display names
const timezoneDisplayNames: Record<string, string> = {
    'America/New_York': 'Eastern Time (US & Canada)',
    'America/Chicago': 'Central Time (US & Canada)',
    'America/Denver': 'Mountain Time (US & Canada)',
    'America/Los_Angeles': 'Pacific Time (US & Canada)',
    'America/Sao_Paulo': 'Brasília Time',
    'America/Argentina/Buenos_Aires': 'Buenos Aires',
    'America/Mexico_City': 'Mexico City',
    'Europe/London': 'London',
    'Europe/Paris': 'Paris',
    'Europe/Berlin': 'Berlin',
    'Europe/Madrid': 'Madrid',
    'Europe/Rome': 'Rome',
    'Europe/Moscow': 'Moscow',
    'Asia/Tokyo': 'Tokyo',
    'Asia/Shanghai': 'Beijing, Shanghai',
    'Asia/Hong_Kong': 'Hong Kong',
    'Asia/Singapore': 'Singapore',
    'Asia/Kolkata': 'India Standard Time',
    'Asia/Dubai': 'Dubai',
    'Australia/Sydney': 'Sydney',
    'Australia/Melbourne': 'Melbourne',
    'Pacific/Auckland': 'Auckland',
    'UTC': 'UTC',
};

export default function TimezoneDetector({ currentTimezone, userId, forceShow = false }: TimezoneDetectorProps) {
    const [showModal, setShowModal] = useState(false);
    const [detectedTimezone, setDetectedTimezone] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        // Detect browser timezone
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Check if it's different from the current timezone and both are valid
        if (browserTimezone && currentTimezone && browserTimezone !== currentTimezone) {
            // Check if we've already asked about this timezone in this session
            const sessionKey = `timezone_prompt_${userId}_${browserTimezone}`;
            const alreadyAsked = sessionStorage.getItem(sessionKey);

            if (!alreadyAsked || forceShow) {
                setDetectedTimezone(browserTimezone);
                setShowModal(true);
                // Mark that we've asked about this timezone (only if not forcing)
                if (!forceShow) {
                    sessionStorage.setItem(sessionKey, 'true');
                }
            }
        }
    }, [currentTimezone, userId, forceShow]);

    const handleConfirm = async () => {
        setIsUpdating(true);

        try {
            // Update the user's timezone using axios for better control
            const response = await axios.patch('/settings/timezone', {
                timezone: detectedTimezone,
            });

            if (response.data.success) {
                setShowModal(false);
                // Reload the page to apply the new timezone
                window.location.reload();
            } else {
                setIsUpdating(false);
            }
        } catch (error) {
            setIsUpdating(false);
        }
    };

    const handleCancel = () => {
        setShowModal(false);
    };

    const getTimezoneName = (tz: string) => {
        return timezoneDisplayNames[tz] || tz;
    };

    // Get current time in both timezones for comparison
    const getCurrentTimeInTimezone = (tz: string) => {
        if (!tz) return '';

        try {
            return new Date().toLocaleTimeString('en-US', {
                timeZone: tz,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error(`Invalid timezone: ${tz}`, error);
            return '';
        }
    };

    return (
        <AlertDialog open={showModal} onOpenChange={setShowModal}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-600" />
                        <AlertDialogTitle>Timezone Detection</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            We detected that your browser is in a different timezone than your account settings.
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Current timezone:</span>
                                <div className="text-right">
                                    <div className="font-medium">{getTimezoneName(currentTimezone)}</div>
                                    {currentTimezone && (
                                        <div className="text-xs text-muted-foreground">{getCurrentTimeInTimezone(currentTimezone)}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-muted-foreground">Detected timezone:</span>
                                <div className="text-right">
                                    <div className="font-medium text-blue-600">{getTimezoneName(detectedTimezone)}</div>
                                    {detectedTimezone && (
                                        <div className="text-xs text-muted-foreground">{getCurrentTimeInTimezone(detectedTimezone)}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <p className="text-sm">
                            Would you like to update your timezone settings?
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel} disabled={isUpdating}>
                        Keep Current
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} disabled={isUpdating}>
                        {isUpdating ? 'Updating...' : 'Update Timezone'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
} 