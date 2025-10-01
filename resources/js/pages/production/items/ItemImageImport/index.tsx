import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { FileSelectionStep } from './components/FileSelectionStep';
import { ValidationStep } from './components/ValidationStep';
import { ProcessingStep } from './components/ProcessingStep';
import { ResultsStep } from './components/ResultsStep';
import { cn } from '@/lib/utils';
import { ImportFile, ImportSession, ImportOptions } from './types';

interface Props {
    acceptedExtensions: string[];
    maxFileSize: number;
    maxTotalSize: number;
    chunkSize: number;
    concurrentUploads: number;
    sessionId?: string;
}

type Step = 'selection' | 'validation' | 'processing' | 'results';

const steps: { id: Step; title: string }[] = [
    {
        id: 'selection',
        title: 'Seleção de Arquivos',
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

export default function ItemImageImport({
    acceptedExtensions,
    maxFileSize,
    maxTotalSize,
    chunkSize,
    concurrentUploads,
    sessionId: _initialSessionId,
}: Props) {
    const [currentStep, setCurrentStep] = useState<Step>('selection');
    const [selectedFiles, setSelectedFiles] = useState<ImportFile[]>([]);
    const [session, setSession] = useState<ImportSession | null>(null);
    // Fixed options as per requirements
    const importOptions: ImportOptions = {
        replaceExisting: true,
        skipDuplicates: false,
        generateBlurhash: true,
        quality: 85,
        applyToAll: true,
    };

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Itens', href: route('production.items.index') },
        { title: 'Importar Imagens', href: '#' },
    ];

    const handleFilesSelected = (files: ImportFile[]) => {
        setSelectedFiles(files);
        setCurrentStep('validation');
    };

    const handleValidationComplete = (validatedFiles: ImportFile[], sessionData: ImportSession) => {
        setSelectedFiles(validatedFiles);
        setSession(sessionData);
        setCurrentStep('processing');
    };


    const handleProcessingComplete = () => {
        setCurrentStep('results');
    };

    const handleStartNew = () => {
        setCurrentStep('selection');
        setSelectedFiles([]);
        setSession(null);
        // Options are now fixed, no need to reset
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar Imagens de Itens" />

            <div className="relative flex h-[calc(100vh-3rem)] flex-col">
                <div className="bg-white border-b px-6 py-4 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-900">Importar Imagens de Itens</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Importe múltiplas imagens de uma vez com correspondência automática por nome de arquivo
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="bg-white px-6 py-4 border-b flex-shrink-0 overflow-x-auto">
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
                                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
                                                {
                                                    'bg-primary text-white': isActive || isCompleted,
                                                    'bg-gray-200 text-gray-600': !isActive && !isCompleted,
                                                }
                                            )}
                                        >
                                            {isCompleted ? '✓' : index + 1}
                                        </div>
                                        <div className="ml-3">
                                            <p className={cn('text-sm font-medium whitespace-nowrap', {
                                                'text-gray-900': isActive,
                                                'text-gray-600': !isActive,
                                            })}>
                                                {step.title}
                                            </p>
                                        </div>
                                    </div>
                                    {!isLast && (
                                        <>
                                            {/* Vertical connector for mobile */}
                                            <div className="ml-4 h-8 w-0.5 bg-gray-200 md:hidden" />
                                            {/* Horizontal connector for desktop */}
                                            <div className="hidden md:block flex-1 mx-4 h-0.5 bg-gray-200" />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {currentStep === 'selection' && (
                        <FileSelectionStep
                            acceptedExtensions={acceptedExtensions}
                            maxFileSize={maxFileSize}
                            maxTotalSize={maxTotalSize}
                            onNext={handleFilesSelected}
                        />
                    )}

                    {currentStep === 'validation' && (
                        <ValidationStep
                            files={selectedFiles}
                            onNext={handleValidationComplete}
                            onBack={() => setCurrentStep('selection')}
                            importOptions={importOptions}
                        />
                    )}

                    {currentStep === 'processing' && session && (
                        <ProcessingStep
                            files={selectedFiles}
                            session={session}
                            options={importOptions}
                            chunkSize={chunkSize}
                            concurrentUploads={concurrentUploads}
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
