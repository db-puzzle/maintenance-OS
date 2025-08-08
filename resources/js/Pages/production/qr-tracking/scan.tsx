import React, { useState, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Camera, Keyboard, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import axios from 'axios';
interface Props {
    scan_modes: Record<string, string>;
}
export default function QrTrackingScan({ scan_modes }: Props) {
    const [scanMode, setScanMode] = useState<'camera' | 'manual'>('manual');
    const [qrCode, setQrCode] = useState('');
    const [selectedMode, setSelectedMode] = useState('production');
    const [notes, setNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [scannedItem, setScannedItem] = useState<Record<string, unknown> | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
            setScanMode('camera');
            setError(null);
        } catch {
            setError('Unable to access camera. Please check permissions.');
        }
    };
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setScanMode('manual');
    };
    const processScan = async () => {
        if (!qrCode.trim()) {
            setError('Please enter or scan a QR code');
            return;
        }
        setIsProcessing(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await axios.post('/production/tracking/scan', {
                qr_code: qrCode,
                scan_mode: selectedMode,
                notes: notes,
                location: null, // Could get geolocation if needed
            });
            setSuccess(response.data.message);
            setScannedItem(response.data.item);
            // Clear form after successful scan
            setTimeout(() => {
                setQrCode('');
                setNotes('');
                setSuccess(null);
                setScannedItem(null);
            }, 5000);
        } catch (err: unknown) {
            setError((err as unknown).response?.data?.message || 'Failed to process scan');
        } finally {
            setIsProcessing(false);
        }
    };
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processScan();
    };
    return (
        <>
            <Head title="Scan QR Code" />
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Scan QR Code</h1>
                    <p className="text-muted-foreground mt-1">
                        Scan or enter a QR code to track production items
                    </p>
                </div>
                {/* Scan Mode Selector */}
                <div className="flex gap-2">
                    <Button
                        variant={scanMode === 'manual' ? 'default' : 'outline'}
                        onClick={() => stopCamera()}
                        className="flex-1"
                    >
                        <Keyboard className="w-4 h-4 mr-2" />
                        Manual Entry
                    </Button>
                    <Button
                        variant={scanMode === 'camera' ? 'default' : 'outline'}
                        onClick={() => startCamera()}
                        className="flex-1"
                        disabled={!navigator.mediaDevices}
                    >
                        <Camera className="w-4 h-4 mr-2" />
                        Camera Scan
                    </Button>
                </div>
                {/* Camera View */}
                {scanMode === 'camera' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Camera Scanner</CardTitle>
                            <CardDescription>
                                Position the QR code within the camera view
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-64 h-64 border-2 border-primary rounded-lg" />
                                </div>
                            </div>
                            <Alert className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Camera QR scanning is not implemented in this demo.
                                    Please use manual entry for now.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                )}
                {/* Manual Entry Form */}
                {scanMode === 'manual' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Manual QR Entry</CardTitle>
                            <CardDescription>
                                Enter the QR code manually or paste from clipboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="qr_code">QR Code</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="qr_code"
                                            placeholder="Enter QR code..."
                                            value={qrCode}
                                            onChange={(e) => setQrCode(e.target.value)}
                                            className="font-mono"
                                        />
                                        <Button type="button" variant="outline" size="icon">
                                            <QrCode className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="scan_mode">Scan Purpose</Label>
                                    <Select value={selectedMode} onValueChange={setSelectedMode}>
                                        <SelectTrigger id="scan_mode">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(scan_modes).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes (Optional)</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Add any additional notes..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isProcessing || !qrCode.trim()}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Process Scan
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}
                {/* Error/Success Messages */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {success && (
                    <Alert className="border-green-200 bg-green-50">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">{success}</AlertDescription>
                    </Alert>
                )}
                {/* Scanned Item Details */}
                {scannedItem && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Scanned Item Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Item Number</dt>
                                    <dd className="text-sm mt-1">{scannedItem.item_number}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                                    <dd className="text-sm mt-1">{scannedItem.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">BOM</dt>
                                    <dd className="text-sm mt-1">
                                        {scannedItem.bom_version?.bill_of_material?.name || 'N/A'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Quantity</dt>
                                    <dd className="text-sm mt-1">{scannedItem.quantity} {scannedItem.unit_of_measure}</dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
} 