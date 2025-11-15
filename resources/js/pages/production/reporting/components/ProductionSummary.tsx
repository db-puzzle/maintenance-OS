import React from 'react';
import { formatNumber } from '@/utils/number';
import { Package, CheckCircle, XCircle } from 'lucide-react';

interface ProductionSummaryProps {
    orderQuantity: number;
    quantityCompleted: number;
    quantityScrapped: number;
    currentSessionCompleted: number;
    currentSessionScrapped: number;
    unitOfMeasure?: string;
}

export function ProductionSummary({
    orderQuantity,
    quantityCompleted,
    quantityScrapped,
    currentSessionCompleted,
    currentSessionScrapped,
    unitOfMeasure = 'EA'
}: ProductionSummaryProps) {
    const totalReported = quantityCompleted + quantityScrapped;
    const remaining = orderQuantity - totalReported;
    const sessionTotal = currentSessionCompleted + currentSessionScrapped;

    return (
        <div className="space-y-4">
            {/* Main Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                {/* Reported */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">Reported</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {formatNumber(quantityCompleted)}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {unitOfMeasure}
                    </div>
                </div>

                {/* Remaining */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Remaining</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {formatNumber(remaining)}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        of {formatNumber(orderQuantity)}
                    </div>
                </div>

                {/* Scrapped */}
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">Scrapped</span>
                    </div>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                        {formatNumber(quantityScrapped)}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {unitOfMeasure}
                    </div>
                </div>
            </div>

            {/* Current Session Info */}
            {sessionTotal > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Current session:</span>
                        <div className="flex items-center gap-4">
                            {currentSessionCompleted > 0 && (
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                    +{formatNumber(currentSessionCompleted)} completed
                                </span>
                            )}
                            {currentSessionScrapped > 0 && (
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                    +{formatNumber(currentSessionScrapped)} scrapped
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{Math.round((totalReported / orderQuantity) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full flex">
                        <div 
                            className="bg-green-500 transition-all duration-300"
                            style={{ width: `${(quantityCompleted / orderQuantity) * 100}%` }}
                        />
                        <div 
                            className="bg-red-500 transition-all duration-300"
                            style={{ width: `${(quantityScrapped / orderQuantity) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}








