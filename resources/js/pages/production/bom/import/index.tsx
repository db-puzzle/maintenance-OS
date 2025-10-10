import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { FileSelectionStep } from './components/FileSelectionStep';
import { MappingStep } from './components/MappingStep';
import { ValidationStep } from './components/ValidationStep';
import { ProcessingStep } from './components/ProcessingStep';
import { ResultsStep } from './components/ResultsStep';
import { type BomImportSession, type BomImportFile, type BomInfo, type CsvMapping, type StepType, type StepInfo } from './types';
import { type BreadcrumbItem } from '@/types';

interface Props {
    supportedFormats: string[];
}

const steps: StepInfo[] = [
    { id: 'selection', title: 'Seleção de Arquivo' },
    { id: 'mapping', title: 'Mapeamento' },
    { id: 'validation', title: 'Validação' },
    { id: 'processing', title: 'Processamento' },
    { id: 'results', title: 'Resultados' },
];

export default function BomImportWizard({ supportedFormats }: Props) {
    const [currentStep, setCurrentStep] = useState<StepType>('selection');
    const [session, setSession] = useState<BomImportSession | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [uploadError, setUploadError] = useState<{ title: string; description?: string } | null>(null);
    const [bomInfo, setBomInfo] = useState<BomInfo>({
        name: '',
        description: '',
        external_reference: '',
    });
    const [csvMapping, setCsvMapping] = useState<CsvMapping>({});
    const [isSkippingMapping, setIsSkippingMapping] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: '/home' },
        { title: 'BOMs', href: route('production.bom.index') },
        { title: 'Importar BOM', href: '#' },
    ];

    // Initialize session on mount
    useEffect(() => {
        initializeSession();
    }, []);

    const initializeSession = async () => {
        try {
            const response = await axios.post(route('production.bom.import.init-session'));
            console.log('Session initialized:', response.data);
            setSession({
                sessionId: response.data.sessionId,
                status: 'initialized',
                created_at: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Failed to initialize session:', error);
            alert('Erro ao inicializar sessão. Por favor, recarregue a página.');
        } finally {
            setIsInitializing(false);
        }
    };

    const handleFileSelection = async (file: BomImportFile, info: BomInfo) => {
        if (!session) {
            console.error('No session available');
            return;
        }

        setBomInfo(info);
        setUploadError(null); // Clear any previous errors

        // Upload file to backend
        const formData = new FormData();
        formData.append('sessionId', session.sessionId);
        formData.append('file', file.file);
        formData.append('bom_info', JSON.stringify(info));

        try {
            const response = await axios.post(route('production.bom.import.upload-file'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Update session with file info
            const updatedSession = {
                ...session,
                status: 'file_uploaded' as const,
                file_info: {
                    original_name: file.filename,
                    type: response.data.fileType,
                    size: file.size,
                },
                csv_headers: response.data.headers || [],
            };
            setSession(updatedSession);

            // Auto-advance based on file type
            if (response.data.fileType === 'json') {
                setIsSkippingMapping(true);
                setCurrentStep('validation');
                // Automatically trigger validation for JSON files
                setTimeout(() => validateData(updatedSession, {}), 100);
            } else {
                setCurrentStep('mapping');
            }
        } catch (error) {
            console.error('Failed to upload file:', error);

            const axiosError = error as any;
            if (axiosError.response?.status === 422) {
                const errorData = axiosError.response.data;

                // Set error state to show in UI
                if (errorData.error) {
                    // Log the full error data for debugging
                    console.log('Error data received:', errorData);

                    let description = errorData.details || 'Por favor, verifique o arquivo e tente novamente.';

                    // Add line/column info if available
                    if (errorData.line && errorData.column) {
                        description = `Linha ${errorData.line}, Coluna ${errorData.column}: ${description}`;
                    }

                    setUploadError({
                        title: errorData.error,
                        description: description
                    });
                } else if (errorData.errors) {
                    // Handle validation errors
                    const firstError = Object.values(errorData.errors)[0];
                    setUploadError({
                        title: 'Erro de validação',
                        description: Array.isArray(firstError) ? firstError[0] : firstError as string
                    });
                } else {
                    setUploadError({
                        title: 'Erro ao fazer upload do arquivo',
                        description: 'Por favor, tente novamente.'
                    });
                }
            } else {
                // Generic error
                setUploadError({
                    title: 'Erro inesperado',
                    description: 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.'
                });
            }
        }
    };

    const handleMappingComplete = async (mapping: CsvMapping) => {
        setCsvMapping(mapping);
        setCurrentStep('validation');

        // Trigger validation with mapping
        if (session) {
            setTimeout(() => validateData(session, mapping), 100);
        }
    };

    const validateData = async (currentSession: BomImportSession, mapping: CsvMapping) => {
        try {
            const response = await axios.post(route('production.bom.import.validate-data'), {
                sessionId: currentSession.sessionId,
                mapping: Object.keys(mapping).length > 0 ? mapping : undefined,
            });

            const updatedSession = {
                ...currentSession,
                status: 'validated' as const,
                validation: response.data,
                mapping: mapping,
            };
            setSession(updatedSession);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleValidationConfirm = () => {
        setCurrentStep('processing');
    };

    const handleProcessingComplete = async (updatedSession?: BomImportSession) => {
        // Use the updated session if provided, otherwise fetch it
        if (updatedSession) {
            setSession(updatedSession);
        } else if (session) {
            try {
                const response = await axios.get(
                    route('production.bom.import.session-status', { sessionId: session.sessionId })
                );
                setSession(response.data);
            } catch (error) {
                console.error('Failed to fetch final session status:', error);
            }
        }
        setCurrentStep('results');
    };

    const handleStartNew = () => {
        // Reset everything
        setCurrentStep('selection');
        setBomInfo({
            name: '',
            description: '',
            external_reference: '',
        });
        setCsvMapping({});
        setIsSkippingMapping(false);
        initializeSession();
    };

    const handleBack = () => {
        if (currentStep === 'mapping') {
            setCurrentStep('selection');
        } else if (currentStep === 'validation') {
            if (isSkippingMapping || session?.file_info?.type === 'json') {
                setCurrentStep('selection');
            } else {
                setCurrentStep('mapping');
            }
        }
    };

    // Get current step index for progress indicator
    const getStepIndex = (stepId: StepType): number => {
        // Skip mapping step for JSON files in the visual indicator
        if (session?.file_info?.type === 'json') {
            const jsonSteps = steps.filter(s => s.id !== 'mapping');
            return jsonSteps.findIndex(s => s.id === stepId);
        }
        return steps.findIndex(s => s.id === stepId);
    };

    const currentStepIndex = getStepIndex(currentStep);
    const displaySteps = session?.file_info?.type === 'json'
        ? steps.filter(s => s.id !== 'mapping')
        : steps;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar BOM" />

            <div className="relative flex h-[calc(100vh-3rem)] flex-col">
                <div className="bg-background border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importar BOM</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Importe estruturas de produtos a partir de arquivos CSV ou JSON
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="bg-background px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 overflow-x-auto">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full min-w-0">
                        {displaySteps.map((step, index) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = index < currentStepIndex;
                            const isLast = index === displaySteps.length - 1;

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
                    {/* Error Alert */}
                    {uploadError && currentStep === 'selection' && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{uploadError.title}</AlertTitle>
                            {uploadError.description && (
                                <AlertDescription className="mt-2 whitespace-pre-wrap font-mono text-sm">
                                    {uploadError.description}
                                </AlertDescription>
                            )}
                        </Alert>
                    )}

                    {currentStep === 'selection' && (
                        isInitializing ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                                    <p className="text-gray-600 dark:text-gray-400">Inicializando importação...</p>
                                </div>
                            </div>
                        ) : (
                            <FileSelectionStep
                                supportedFormats={supportedFormats}
                                onNext={handleFileSelection}
                                initialBomInfo={bomInfo}
                            />
                        )
                    )}

                    {currentStep === 'mapping' && session?.csv_headers && (
                        <MappingStep
                            headers={session.csv_headers}
                            data={session.data || []}
                            onNext={handleMappingComplete}
                            onBack={handleBack}
                            initialMapping={csvMapping}
                        />
                    )}

                    {currentStep === 'validation' && session?.validation && (
                        <ValidationStep
                            session={session}
                            onNext={handleValidationConfirm}
                            onBack={handleBack}
                        />
                    )}

                    {currentStep === 'processing' && session && (
                        <ProcessingStep
                            session={session}
                            onComplete={handleProcessingComplete}
                        />
                    )}

                    {currentStep === 'results' && session && (session.result || session.status === 'failed') && (
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
