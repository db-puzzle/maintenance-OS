import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { type BomImportSession } from '../types';

interface Props {
    session: BomImportSession;
    onComplete: (updatedSession?: BomImportSession) => void;
}

export function ProcessingStep({ session, onComplete }: Props) {
    const [currentSession, setCurrentSession] = useState<BomImportSession>(session);
    const [statusMessage, setStatusMessage] = useState('Iniciando processamento...');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        startProcessing();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startProcessing = async () => {
        if (isProcessing) return;

        setIsProcessing(true);

        try {
            // Start the import process
            await axios.post(route('production.bom.import.process'), {
                sessionId: session.sessionId,
            });

            // Start polling for status
            pollStatus();
        } catch (error) {
            console.error('Failed to start processing:', error);
            setStatusMessage('Erro ao iniciar processamento');
        }
    };

    const pollStatus = () => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(
                    route('production.bom.import.session-status', { sessionId: session.sessionId })
                );

                const updatedSession = response.data;
                setCurrentSession(updatedSession);

                // Update status message based on session status
                switch (updatedSession.status) {
                    case 'processing':
                        setStatusMessage('Processando estrutura da BOM...');
                        break;
                    case 'completed':
                        setStatusMessage('Importação concluída com sucesso!');
                        clearInterval(interval);
                        setTimeout(() => onComplete(updatedSession), 1500);
                        break;
                    case 'failed':
                        setStatusMessage('Erro durante a importação');
                        clearInterval(interval);
                        break;
                }
            } catch (error) {
                console.error('Failed to poll status:', error);
                clearInterval(interval);
                setStatusMessage('Erro ao verificar status');
            }
        }, 2000); // Poll every 2 seconds
    };

    const getProgress = () => {
        switch (currentSession.status) {
            case 'initialized':
                return 10;
            case 'file_uploaded':
                return 25;
            case 'validated':
                return 50;
            case 'processing':
                return 75;
            case 'completed':
                return 100;
            case 'failed':
                return 0;
            default:
                return 0;
        }
    };

    const isError = currentSession.status === 'failed';
    const isSuccess = currentSession.status === 'completed';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Processando Importação</CardTitle>
                    <CardDescription>
                        Aguarde enquanto a BOM é importada para o sistema
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>Progresso</span>
                            <span>{getProgress()}%</span>
                        </div>
                        <Progress value={getProgress()} className="h-2" />
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3">
                        {!isError && !isSuccess && (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        )}
                        {isSuccess && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {isError && (
                            <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <p className="text-sm font-medium">{statusMessage}</p>
                    </div>

                    {/* Processing Details */}
                    <div className="space-y-2 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                            <span className={currentSession.status === 'processing' || currentSession.status === 'completed' ? 'text-green-600' : ''}>
                                ✓ Arquivo validado
                            </span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span className={currentSession.status === 'completed' ? 'text-green-600' : ''}>
                                {currentSession.status === 'processing' ? '○' : '✓'} Criando estrutura da BOM
                            </span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span className={currentSession.status === 'completed' ? 'text-green-600' : ''}>
                                {currentSession.status === 'completed' ? '✓' : '○'} Gerando códigos QR
                            </span>
                        </p>
                    </div>

                    {/* Error Details */}
                    {isError && currentSession.result?.errors && currentSession.result.errors.length > 0 && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                                {currentSession.result.errors.map((error, index) => (
                                    <p key={index}>{error}</p>
                                ))}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
                <CardContent className="pt-6">
                    <p className="text-sm text-gray-600 text-center">
                        Este processo pode levar alguns minutos dependendo do tamanho da BOM.
                        <br />
                        Por favor, não feche esta janela.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
