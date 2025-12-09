import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { ScanLine, Keyboard, X } from 'lucide-react';

/**
 * Props for QR Scanner component.
 */
interface QrScannerProps {
    /**
     * Callback when MO number is scanned or entered.
     */
    onScan: (moNumber: string) => void;

    /**
     * Whether scanning mode is enabled initially.
     */
    autoStart?: boolean;

    /**
     * CSS class name.
     */
    className?: string;
}

/**
 * QR Scanner Component
 *
 * Provides QR code scanning via camera and manual MO number entry fallback.
 * Parses MO numbers from QR code URLs.
 */
export function QrScanner({ onScan, autoStart = false, className }: QrScannerProps) {
    const [scanning, setScanning] = useState(autoStart);
    const [manualInput, setManualInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerDivRef = useRef<HTMLDivElement>(null);

    /**
     * Parse MO number from QR code content.
     *
     * Supports:
     * - /production/orders/MO-2024-0001/qr
     * - /production/orders/MO-2024-0001
     * - MO-2024-0001 (direct)
     */
    const parseMoNumber = (qrContent: string): string | null => {
        // Match: /production/orders/{mo-number}/qr or /production/orders/{mo-number}
        const pattern = /\/production\/orders\/([A-Z0-9-]+)(?:\/qr)?/i;
        const match = qrContent.match(pattern);

        if (match) {
            return match[1].toUpperCase();
        }

        // Check if it's a direct MO number (MO-YYYY-####)
        if (/^MO-\d{4}-\d+$/i.test(qrContent)) {
            return qrContent.toUpperCase();
        }

        return null;
    };

    /**
     * Handle successful QR scan.
     */
    const handleScanSuccess = (decodedText: string) => {
        const moNumber = parseMoNumber(decodedText);

        if (moNumber) {
            onScan(moNumber);
            stopScanning();
            setError(null);
        } else {
            setError('QR Code inválido ou formato não reconhecido');
        }
    };

    /**
     * Handle manual MO number submission.
     */
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!manualInput.trim()) {
            setError('Digite um número de OM');
            return;
        }

        const moNumber = parseMoNumber(manualInput);

        if (moNumber) {
            onScan(moNumber);
            setManualInput('');
            setError(null);
        } else {
            setError('Número de OM inválido. Use o formato: MO-YYYY-####');
        }
    };

    /**
     * Start camera scanning.
     */
    const startScanning = async () => {
        if (scannerRef.current) {
            return; // Already scanning
        }

        try {
            setError(null);
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' }, // Use back camera on mobile
                {
                    fps: 10, // Frames per second
                    qrbox: { width: 250, height: 250 }, // Scanning box size
                    aspectRatio: 1.0,
                },
                handleScanSuccess,
                () => {
                    // Ignore scan errors (continuous scanning)
                }
            );

            setScanning(true);
        } catch (err) {
            console.error('Error starting scanner:', err);
            setError('Erro ao iniciar câmera. Verifique as permissões.');
            setScanning(false);
            scannerRef.current = null;
        }
    };

    /**
     * Stop camera scanning.
     */
    const stopScanning = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                scannerRef.current = null;
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
        setScanning(false);
    };

    /**
     * Cleanup on unmount.
     */
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                stopScanning();
            }
        };
    }, []);

    return (
        <div className={className}>
            {/* Camera Scanning Section */}
            <div className="space-y-4">
                {!scanning ? (
                    <Button
                        type="button"
                        onClick={startScanning}
                        className="w-full"
                        variant="outline"
                    >
                        <ScanLine className="mr-2 h-4 w-4" />
                        Escanear QR Code
                    </Button>
                ) : (
                    <div className="space-y-2">
                        <div
                            id="qr-reader"
                            ref={scannerDivRef}
                            className="w-full rounded-lg overflow-hidden border-2 border-primary"
                        />
                        <Button
                            type="button"
                            onClick={stopScanning}
                            variant="destructive"
                            className="w-full"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Parar Escaneamento
                        </Button>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            ou
                        </span>
                    </div>
                </div>

                {/* Manual Entry Section */}
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <TextInput
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Digite o número da OM (MO-2024-0001)"
                        className="flex-1"
                        disabled={scanning}
                    />
                    <Button
                        type="submit"
                        variant="secondary"
                        disabled={scanning || !manualInput.trim()}
                    >
                        <Keyboard className="mr-2 h-4 w-4" />
                        Adicionar
                    </Button>
                </form>

                {/* Instructions */}
                <p className="text-xs text-muted-foreground text-center">
                    Escaneie o QR Code da OM ou digite o número manualmente
                </p>
            </div>
        </div>
    );
}
