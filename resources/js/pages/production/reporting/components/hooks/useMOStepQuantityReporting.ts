import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { ManufacturingOrder } from '@/types/production';
import { UseMOStepDataReturn } from './useMOStepData';
import { getRemainingQuantity } from '../utils/moStepHelpers';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface UseMOStepQuantityReportingParams {
    stepData: UseMOStepDataReturn;
    order: ManufacturingOrder | null;
    onStateChanged?: () => void;
}

export interface UseMOStepQuantityReportingReturn {
    form: {
        data: {
            quantity_completed: number;
            quantity_scrapped: number;
            scrap_reason: string;
            notes: string;
            time_spent: number;
            mark_complete: boolean;
        };
        setData: <K extends keyof UseMOStepQuantityReportingReturn['form']['data']>(
            key: K | UseMOStepQuantityReportingReturn['form']['data'], 
            value?: UseMOStepQuantityReportingReturn['form']['data'][K]
        ) => void;
        reset: () => void;
        processing: boolean;
    };
    productionDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        maxQuantity: number;
        currentQuantity: number;
        onSubmit: (quantity: number) => void;
        unitOfMeasure?: string;
    };
    scrapDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        maxQuantity: number;
        currentQuantity: number;
        onSubmit: (quantity: number, reason?: string) => void;
        unitOfMeasure?: string;
    };
    handleSubmit: () => void;
    getRemainingQuantity: () => number;
}

export function useMOStepQuantityReporting({
    stepData,
    order,
    onStateChanged
}: UseMOStepQuantityReportingParams): UseMOStepQuantityReportingReturn {
    const { currentStep, activeExecution, initializeDialog } = stepData;
    
    const [showProductionDialog, setShowProductionDialog] = useState(false);
    const [showScrapDialog, setShowScrapDialog] = useState(false);
    
    // Form for quantity reporting (in_progress state)
    const { data, setData, post, reset, processing } = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        scrap_reason: '',
        notes: '',
        time_spent: 0,
        mark_complete: false as boolean,
    });
    
    // Calculate remaining quantity
    const getRemainingQuantityLocal = () => {
        return getRemainingQuantity(order!, currentStep, activeExecution);
    };
    
    // Submit quantity report
    const handleSubmit = () => {
        if (!activeExecution || !activeExecution.id || activeExecution.id === 0) {
            console.error('[MOStepActionDialog] No valid execution to report progress');
            return;
        }

        post(route('production.reporting.steps.report', { execution: activeExecution.id }), {
            preserveUrl: true,
            onSuccess: (_page) => {
                reset();
                initializeDialog().then(() => {
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: (errors) => {
                console.error('[MOStepActionDialog] Submit errors:', errors);
            }
        });
    };
    
    // Handle production report
    const handleProductionReport = (quantity: number) => {
        if (!activeExecution || !activeExecution.id) return;

        // Store previous data for potential revert
        const previousData = { ...data };

        // Update the form data
        setData({
            quantity_completed: quantity,
            quantity_scrapped: 0,
            scrap_reason: '',
            notes: '',
            time_spent: 0,
            mark_complete: false,
        });

        // Submit using the form's post method which uses the data from useForm
        post(route('production.reporting.steps.report', { execution: activeExecution.id }), {
            preserveUrl: true,
            onSuccess: () => {
                // Reset form after successful submission
                reset();
                initializeDialog().then(() => {
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: () => {
                // Revert on error
                setData(previousData);
            }
        });
    };

    // Handle scrap report
    const handleScrapReport = (quantity: number, reason?: string) => {
        if (!activeExecution || !activeExecution.id) return;

        // Store previous data for potential revert
        const previousData = { ...data };

        // Update the form data
        setData({
            quantity_completed: 0,
            quantity_scrapped: quantity,
            scrap_reason: reason || '',
            notes: '',
            time_spent: 0,
            mark_complete: false,
        });

        // Submit using the form's post method which uses the data from useForm
        post(route('production.reporting.steps.report', { execution: activeExecution.id }), {
            preserveUrl: true,
            onSuccess: () => {
                // Reset form after successful submission
                reset();
                initializeDialog().then(() => {
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: () => {
                // Revert on error
                setData(previousData);
            }
        });
    };
    
    return {
        form: {
            data,
            setData,
            reset,
            processing
        },
        productionDialog: {
            isOpen: showProductionDialog,
            onOpenChange: setShowProductionDialog,
            maxQuantity: getRemainingQuantityLocal(),
            currentQuantity: currentStep?.cumulative_quantity_completed || 0,
            onSubmit: handleProductionReport,
            unitOfMeasure: order?.unit_of_measure
        },
        scrapDialog: {
            isOpen: showScrapDialog,
            onOpenChange: setShowScrapDialog,
            maxQuantity: getRemainingQuantityLocal(),
            currentQuantity: currentStep?.cumulative_quantity_scrapped || 0,
            onSubmit: handleScrapReport,
            unitOfMeasure: order?.unit_of_measure
        },
        handleSubmit,
        getRemainingQuantity: getRemainingQuantityLocal
    };
}
