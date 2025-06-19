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
import { getCurrentTimeInTimezone, getTimezoneDisplayName } from '@/constants/timezones';
import axios from 'axios';
import { Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

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
        } catch {
            setIsUpdating(false);
        }
    };

    const handleCancel = () => {
        setShowModal(false);
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
                        <p>We detected that your browser is in a different timezone than your account settings.</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b py-2">
                                <span className="text-muted-foreground">Current timezone:</span>
                                <div className="text-right">
                                    <div className="font-medium">{getTimezoneDisplayName(currentTimezone)}</div>
                                    {currentTimezone && (
                                        <div className="text-muted-foreground text-xs">{getCurrentTimeInTimezone(currentTimezone)}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-muted-foreground">Detected timezone:</span>
                                <div className="text-right">
                                    <div className="font-medium text-blue-600">{getTimezoneDisplayName(detectedTimezone)}</div>
                                    {detectedTimezone && (
                                        <div className="text-muted-foreground text-xs">{getCurrentTimeInTimezone(detectedTimezone)}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <p className="text-sm">Would you like to update your timezone settings?</p>
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
