import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/TextInput';
import { ScanLine, Keyboard } from 'lucide-react';
import { createFormAdapter } from '@/utils/form-adapters';
import { useForm } from '@inertiajs/react';

interface QrScannerProps {
    onScan: (moNumber: string) => void;
    mode?: 'camera' | 'manual' | 'both';
}

/**
 * QR Code Scanner component for logistics workflows.
 *
 * Scans Manufacturing Order QR codes during shipment creation and receiving.
 * Reuses the existing MO QR code system - no changes to QR generation needed!
 *
 * Supported formats:
 * - https://domain.com/production/orders/MO-2024-0001/qr
 * - /production/orders/MO-2024-0001/qr
 * - MO-2024-0001 (direct number)
 */
export function QrScanner({ onScan, mode = 'both' }: QrScannerProps) {
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const { data, setData, errors, clearErrors } = useForm({
        manual_input: '',
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    /**
     * Parse MO number from QR code URL or direct number.
     */
    const parseMoNumber = (qrContent: string): string | null => {
        // Match: /production/orders/{mo-number}/qr or /production/orders/{mo-number}
        const pattern = /\/production\/orders\/([A-Z0-9-]+)(?:\/qr)?/i;
        const match = qrContent.match(pattern);

        if (match) {
            return match[1];
        }

        // Check if it's a direct MO number
        if (/^MO-\d{4}-\d+$/i.test(qrContent)) {
            return qrContent.toUpperCase();
        }

        return null;
    };

    /**
     * Handle QR code scan result.
     */
    const handleScan = (decodedText: string) => {
        const moNumber = parseMoNumber(decodedText);

        if (moNumber) {
            onScan(moNumber);
            if (scannerRef.current) {
                scannerRef.current.clear();
                scannerRef.current = null;
            }
            setScanning(false);
        } else {
            alert('QR Code inválido ou formato não reconhecido');
        }
    };

    /**
     * Handle manual MO number entry.
     */
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const moNumber = parseMoNumber(data.manual_input);

        if (moNumber) {
            onScan(moNumber);
            setData('manual_input', '');
        } else {
            alert('Número de OM inválido');
        }
    };

    /**
     * Start the QR code scanner.
     */
    const startScanner = () => {
        setScanning(true);

        // Small delay to ensure DOM element exists
        setTimeout(() => {
            scannerRef.current = new Html5QrcodeScanner(
                'qr-reader',
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                false
            );

            scannerRef.current.render(
                (decodedText: string) => handleScan(decodedText),
                (_errorMessage: string) => {
                    // Ignore scan errors (continuous scanning)
                }
            );
        }, 100);
    };

    /**
     * Stop the scanner.
     */
    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear();
            scannerRef.current = null;
        }
        setScanning(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear();
            }
        };
    }, []);

    return (
        <div className="space-y-4">
            {(mode === 'camera' || mode === 'both') && (
                <div>
                    {!scanning ? (
                        <Button onClick={startScanner} className="w-full" type="button">
                            <ScanLine className="h-4 w-4 mr-2" />
                            Escanear QR Code
                        </Button>
                    ) : (
                        <div className="space-y-2">
                            <div id="qr-reader" className="w-full" />
                            <Button
                                onClick={stopScanner}
                                variant="outline"
                                className="w-full"
                                type="button"
                            >
                                Parar Scanner
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {(mode === 'manual' || mode === 'both') && (
                <div>
                    {mode === 'both' && (
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 border-t border-muted" />
                            <span className="text-sm text-muted-foreground">ou</span>
                            <div className="flex-1 border-t border-muted" />
                        </div>
                    )}
                    <form onSubmit={handleManualSubmit} className="flex gap-2">
                        <div className="flex-1">
                            <TextInput
                                form={formAdapter}
                                name="manual_input"
                                label="Número da OM"
                                placeholder="Digite o número da OM (MO-2024-0001)"
                            />
                        </div>
                        <Button type="submit" variant="outline">
                            <Keyboard className="h-4 w-4 mr-2" />
                            Adicionar
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}

