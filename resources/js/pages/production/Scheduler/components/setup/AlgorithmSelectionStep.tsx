import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Info, Calendar, Zap, Clock, Target } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StateButton from '@/components/StateButton';

interface AlgorithmSelectionStepProps {
    algorithms: Array<{ value: string; label: string }>;
    initialAlgorithm: string;
    initialRespectLockedSchedules: boolean;
    onNext: (algorithm: string, respectLockedSchedules: boolean) => void;
    onBack: () => void;
}

const algorithmDetails = {
    asap: {
        title: 'As Soon As Possible (ASAP)',
        shortDescription: 'Forward scheduling for urgent orders',
        description: 'Starts operations as early as possible • Minimizes idle time • Best for urgent orders • May increase inventory costs',
        icon: Zap,
        details: [
            'Starts from the earliest available time',
            'Minimizes idle time between operations',
            'Best for urgent orders or when early delivery is preferred',
            'May result in higher inventory holding costs'
        ]
    },
    due_date: {
        title: 'Due Date Priority',
        shortDescription: 'Backward scheduling for on-time delivery',
        description: 'Schedules from due dates • Auto-forward fallback • Optimizes on-time delivery • Reduces inventory costs',
        icon: Target,
        details: [
            'Schedules backwards from order due dates',
            'Automatically switches to forward scheduling if backward is not feasible',
            'Optimizes for on-time delivery',
            'Reduces inventory holding costs'
        ]
    },
    just_in_time: {
        title: 'Just In Time (JIT)',
        shortDescription: 'Minimizes work-in-progress inventory',
        description: 'Finishes just before needed • Reduces inventory costs • Requires accurate forecasting • Less buffer for delays',
        icon: Clock,
        details: [
            'Schedules operations to finish just before they are needed',
            'Reduces inventory and storage costs',
            'Requires accurate demand forecasting',
            'May have less buffer for delays'
        ]
    },
    balanced: {
        title: 'Balanced Load',
        shortDescription: 'Distributes workload evenly',
        description: 'Levels resource utilization • Prevents bottlenecks • May extend completion time • Best for stable production',
        icon: Calendar,
        details: [
            'Levels resource utilization across time periods',
            'Prevents resource bottlenecks',
            'May extend overall completion time',
            'Best for stable production environments'
        ]
    }
};

export function AlgorithmSelectionStep({
    algorithms,
    initialAlgorithm,
    initialRespectLockedSchedules,
    onNext,
    onBack,
}: AlgorithmSelectionStepProps) {
    const [algorithm, setAlgorithm] = useState(initialAlgorithm);
    const [respectLockedSchedules, setRespectLockedSchedules] = useState(initialRespectLockedSchedules);

    const handleNext = () => {
        onNext(algorithm, respectLockedSchedules);
    };

    return (
        <div className="space-y-6">
            {/* Main Selection Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Choose Scheduling Algorithm</CardTitle>
                    <CardDescription>
                        Select the algorithm that best fits your production requirements
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Algorithm Selection using StateButtons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {algorithms.map((algo) => {
                            const details = algorithmDetails[algo.value as keyof typeof algorithmDetails];
                            if (!details) return null;

                            return (
                                <StateButton
                                    key={algo.value}
                                    icon={details.icon}
                                    title={details.title}
                                    description={details.description}
                                    selected={algorithm === algo.value}
                                    onClick={() => setAlgorithm(algo.value)}
                                    iconSize="md"
                                    className="h-auto"
                                />
                            );
                        })}
                    </div>

                    {/* Additional Options */}
                    <div className="border-t pt-6">
                        <h3 className="font-medium mb-4">Additional Options</h3>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="respect-locked"
                                    checked={respectLockedSchedules}
                                    onCheckedChange={(checked) => setRespectLockedSchedules(!!checked)}
                                />
                                <Label
                                    htmlFor="respect-locked"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Respect locked schedules
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                                When enabled, the scheduler will not modify any schedules that have been manually locked,
                                ensuring your manual adjustments are preserved.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info Alert */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    The scheduling algorithm determines how operations are sequenced and timed.
                    Choose based on your production priorities: speed (ASAP), delivery reliability (Due Date),
                    inventory reduction (JIT), or resource optimization (Balanced).
                </AlertDescription>
            </Alert>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t">
                <Button
                    variant="outline"
                    onClick={onBack}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <Button
                    onClick={handleNext}
                >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
