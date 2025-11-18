import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Printer, Pause, Play, AlertCircle } from 'lucide-react';

interface MOStepActionButtonsProps {
    onPrintLabels: () => void;
    onTakePhoto: () => void;
    onPutOnHold: () => void;
    onResume: () => void;
    onReportIssue: () => void;
    photoLimitReached: boolean;
    isOnHold: boolean;
    disabled?: boolean;
}

export function MOStepActionButtons({
    onPrintLabels,
    onTakePhoto,
    onPutOnHold,
    onResume,
    onReportIssue,
    photoLimitReached,
    isOnHold,
    disabled = false
}: MOStepActionButtonsProps) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    className="h-[72px] flex flex-col items-center justify-center gap-1 p-3"
                    onClick={onPrintLabels}
                    disabled={disabled}
                >
                    <Printer className="h-5 w-5" />
                    <div className="text-center">
                        <div className="text-xs leading-tight">PRINT</div>
                        <div className="text-xs leading-tight">QR CODE</div>
                    </div>
                </Button>
                <Button
                    variant="outline"
                    className="h-[72px] flex flex-col items-center justify-center gap-1 p-3"
                    onClick={onTakePhoto}
                    disabled={photoLimitReached || disabled}
                >
                    <Camera className="h-5 w-5" />
                    <div className="text-center">
                        <div className="text-xs leading-tight">TAKE</div>
                        <div className="text-xs leading-tight">PICTURE</div>
                    </div>
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {isOnHold ? (
                    <Button
                        variant="outline"
                        className="h-[72px] flex flex-col items-center justify-center gap-1 p-3"
                        onClick={onResume}
                        disabled={disabled}
                    >
                        <Play className="h-5 w-5" />
                        <div className="text-center">
                            <div className="text-xs leading-tight">RESUME</div>
                            <div className="text-xs leading-tight">STEP</div>
                        </div>
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className="h-[72px] flex flex-col items-center justify-center gap-1 p-3"
                        onClick={onPutOnHold}
                        disabled={disabled}
                    >
                        <Pause className="h-5 w-5" />
                        <div className="text-center">
                            <div className="text-xs leading-tight">PUT</div>
                            <div className="text-xs leading-tight">ON HOLD</div>
                        </div>
                    </Button>
                )}
                <Button
                    variant="outline"
                    className="h-[72px] flex flex-col items-center justify-center gap-1 p-3"
                    onClick={onReportIssue}
                    disabled={disabled}
                >
                    <AlertCircle className="h-5 w-5" />
                    <div className="text-center">
                        <div className="text-xs leading-tight">REPORT</div>
                        <div className="text-xs leading-tight">ISSUE</div>
                    </div>
                </Button>
            </div>
        </div>
    );
}
