import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { FileSelectionStep } from './components/FileSelectionStep';
import { ConfigurationStep } from './components/ConfigurationStep';
import { ValidationStep } from './components/ValidationStep';
import { ProcessingStep } from './components/ProcessingStep';
import { ResultsStep } from './components/ResultsStep';
import { cn } from '@/lib/utils';
import { ImportFile, FieldMapping, ImportOptions, ImportSession } from './types';
import { type BreadcrumbItem } from '@/types';

interface Props {
    supportedFormats: string[];
}

type Step = 'selection' | 'configuration' | 'validation' | 'processing' | 'results';

const steps: { id: Step; title: string }[] = [
    {
        id: 'selection',
        title: 'Seleção de Arquivo',
    },
    {
        id: 'configuration',
        title: 'Configuração',
    },
    {
        id: 'validation',
        title: 'Validação',
    },
    {
        id: 'processing',
        title: 'Processamento',
    },
    {
        id: 'results',
        title: 'Resultados',
    },
];

export default function WorkCellImport({ supportedFormats }: Props) {
    const [currentStep, setCurrentStep] = useState<Step>('selection');
    const [selectedFiles, setSelectedFiles] = useState<ImportFile[]>([]);
    const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
    const [importOptions, setImportOptions] = useState<ImportOptions>({
        updateExisting: true,
        skipDuplicates: false,
    });
    const [session, setSession] = useState<ImportSession | null>(null);

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/home' },
        { title: 'Células de Trabalho', href: route('production.work-cells.index') },
        { title: 'Importar Células', href: '#' },
    ];

    const handleFilesSelected = (files: ImportFile[]) => {
        setSelectedFiles(files);
        // Skip configuration for JSON files as they don't need field mapping
        const fileType = files[0]?.file.name.split('.').pop()?.toLowerCase();
        if (fileType === 'json') {
            // For JSON, go directly to validation with default options
            setFieldMapping({});
            setImportOptions({
                updateExisting: true,
                skipDuplicates: false,
            });
            setCurrentStep('validation');
        } else {
            setCurrentStep('configuration');
        }
    };

    const handleConfigurationComplete = (mapping: FieldMapping, options: ImportOptions) => {
        setFieldMapping(mapping);
        setImportOptions(options);
        setCurrentStep('validation');
    };

    const handleValidationComplete = (sessionData: ImportSession) => {
        setSession(sessionData);
        setCurrentStep('processing');
    };

    const handleProcessingComplete = (updatedSession: ImportSession) => {
        setSession(updatedSession);
        setCurrentStep('results');
    };

    const handleStartNew = () => {
        setCurrentStep('selection');
        setSelectedFiles([]);
        setFieldMapping({});
        setImportOptions({
            updateExisting: true,
            skipDuplicates: false,
        });
        setSession(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar Células de Trabalho" />

            <div className="relative flex h-[calc(100vh-3rem)] flex-col">
                <div className="bg-background border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importar Células de Trabalho</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Importe múltiplas células de trabalho a partir de arquivos CSV ou JSON
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="bg-background px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 overflow-x-auto">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full min-w-0">
                        {steps.map((step, index) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = index < currentStepIndex;
                            const isLast = index === steps.length - 1;

                            return (
                                <div key={step.id} className={cn(
                                    "flex flex-col md:flex-row md:items-center",
                                    !isLast && "md:flex-1"
                                )}>
                                    <div className="flex items-center">
                                        <div
                                            className={cn(
                                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 transition-colors',
                                                {
                                                    'bg-primary text-primary-foreground ring-2 ring-primary/20': isActive || isCompleted,
                                                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600': !isActive && !isCompleted,
                                                }
                                            )}
                                        >
                                            {isCompleted ? '✓' : index + 1}
                                        </div>
                                        <div className="ml-3">
                                            <p className={cn('text-sm font-medium whitespace-nowrap', {
                                                'text-gray-900 dark:text-gray-100': isActive || isCompleted,
                                                'text-gray-500 dark:text-gray-400': !isActive && !isCompleted,
                                            })}>
                                                {step.title}
                                            </p>
                                        </div>
                                    </div>
                                    {!isLast && (
                                        <>
                                            {/* Vertical connector for mobile */}
                                            <div className="ml-4 h-8 w-0.5 bg-gray-200 dark:bg-gray-700 md:hidden" />
                                            {/* Horizontal connector for desktop */}
                                            <div className="hidden md:block flex-1 mx-4 h-0.5 bg-gray-200 dark:bg-gray-700" />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-background">
                    {currentStep === 'selection' && (
                        <FileSelectionStep
                            supportedFormats={supportedFormats}
                            onNext={handleFilesSelected}
                        />
                    )}

                    {currentStep === 'configuration' && (
                        <ConfigurationStep
                            files={selectedFiles}
                            onNext={handleConfigurationComplete}
                            onBack={() => setCurrentStep('selection')}
                        />
                    )}

                    {currentStep === 'validation' && (
                        <ValidationStep
                            files={selectedFiles}
                            mapping={fieldMapping}
                            options={importOptions}
                            onNext={handleValidationComplete}
                            onBack={() => setCurrentStep('configuration')}
                        />
                    )}

                    {currentStep === 'processing' && session && (
                        <ProcessingStep
                            files={selectedFiles}
                            mapping={fieldMapping}
                            options={importOptions}
                            session={session}
                            onComplete={handleProcessingComplete}
                        />
                    )}

                    {currentStep === 'results' && session && (
                        <ResultsStep
                            session={session}
                            onNewImport={handleStartNew}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;
