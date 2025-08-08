import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { Camera, X, Package, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
interface ScanResult {
    type: 'order' | 'item' | 'operation';
    data: {
        id: number;
        code: string;
        name: string;
        description?: string;
        status?: string;
        actions?: Array<{
            label: string;
            action: string;
            variant?: 'default' | 'secondary' | 'destructive';
        }>;
    };
}
interface RecentScan {
    timestamp: Date;
    result: ScanResult;
}
// Mock QR Reader component (would be replaced with actual QR scanning library)
function QrReader({
    onResult,
    className
}: {
    onResult: (result: { text: string } | null) => void;
    className: string;
}) {
    useEffect(() => {
        // Simulate a scan after 3 seconds for demo
        const timer = setTimeout(() => {
            onResult({ text: 'ORD-2024-001' });
        }, 3000);
        return () => clearTimeout(timer);
    }, [onResult]);
    return (
        <div className={cn("bg-black flex items-center justify-center", className)}>
            <div className="text-white text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 animate-pulse" />
                <p>Camera view would be here</p>
                <p className="text-sm text-gray-400 mt-2">Scanning...</p>
            </div>
        </div>
    );
}
export default function QrScanner() {
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
    const handleScan = (text: string) => {
        // Parse QR code and determine type
        const result: ScanResult = {
            type: 'order',
            data: {
                id: 1,
                code: text,
                name: 'Ordem de Produção #001',
                description: 'Produto: ITEM-123',
                status: 'in_progress',
                actions: [
                    { label: 'Iniciar Operação', action: 'start', variant: 'default' },
                    { label: 'Pausar', action: 'pause', variant: 'secondary' },
                    { label: 'Concluir', action: 'complete', variant: 'default' }
                ]
            }
        };
        setScanResult(result);
        setIsScanning(false);
        // Add to recent scans
        setRecentScans(prev => [
            { timestamp: new Date(), result },
            ...prev.slice(0, 4)
        ]);
    };
    const handleAction = (action: string) => {
        console.log('Action:', action);
        // Handle different actions based on the action type
        switch (action) {
            case 'start':
                router.post(route('production.executions.start'), { order_id: scanResult?.data.id });
                break;
            case 'pause':
                router.post(route('production.executions.pause', scanResult?.data.id));
                break;
            case 'complete':
                router.post(route('production.executions.complete', scanResult?.data.id));
                break;
        }
        // Reset scanner
        setScanResult(null);
        setIsScanning(true);
    };
    return (
        <div className="h-screen bg-black flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 text-white p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">Scanner QR</h1>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-gray-800"
                        asChild
                    >
                        <Link href={route('production.tracking.dashboard')}>
                            <X className="h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>
            {/* Scanner Area */}
            <div className="flex-1 relative">
                {isScanning ? (
                    <QrReader
                        onResult={(result) => {
                            if (result) {
                                handleScan(result.text);
                            }
                        }}
                        constraints={{ facingMode: 'environment' }}
                        className="w-full h-full"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Button
                            size="lg"
                            onClick={() => setIsScanning(true)}
                            className="bg-white text-black hover:bg-gray-100"
                        >
                            <Camera className="h-6 w-6 mr-2" />
                            Iniciar Scanner
                        </Button>
                    </div>
                )}
                {/* Scan Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="w-64 h-64 border-4 border-white rounded-lg opacity-50" />
                    </div>
                </div>
            </div>
            {/* Result Panel */}
            {scanResult && (
                <div className="bg-white p-4 border-t animate-in slide-in-from-bottom">
                    <QrScanResult
                        result={scanResult}
                        onClose={() => setScanResult(null)}
                        onAction={handleAction}
                    />
                </div>
            )}
            {/* Recent Scans */}
            {recentScans.length > 0 && !scanResult && (
                <div className="bg-gray-900 text-white p-4 border-t border-gray-800">
                    <h3 className="text-sm font-medium mb-2">Scans Recentes</h3>
                    <div className="space-y-2">
                        {recentScans.slice(0, 3).map((scan, index) => (
                            <RecentScanItem
                                key={index}
                                scan={scan}
                                onClick={() => setScanResult(scan.result)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
// QR Scan Result Component
function QrScanResult({
    result,
    onClose,
    onAction
}: {
    result: ScanResult;
    onClose: () => void;
    onAction: (action: string) => void;
}) {
    const getIcon = () => {
        switch (result.type) {
            case 'order':
                return <Package className="h-6 w-6" />;
            case 'item':
                return <Package className="h-6 w-6" />;
            case 'operation':
                return <Play className="h-6 w-6" />;
            default:
                return <Package className="h-6 w-6" />;
        }
    };
    const getStatusBadge = () => {
        if (!result.data.status) return null;
        const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
            'in_progress': 'default',
            'paused': 'secondary',
            'completed': 'default'
        };
        const labels: Record<string, string> = {
            'in_progress': 'Em Progresso',
            'paused': 'Pausado',
            'completed': 'Concluído'
        };
        return (
            <Badge variant={variants[result.data.status] || 'default'}>
                {labels[result.data.status] || result.data.status}
            </Badge>
        );
    };
    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        {getIcon()}
                    </div>
                    <div>
                        <h3 className="font-semibold">{result.data.name}</h3>
                        <p className="text-sm text-muted-foreground">{result.data.code}</p>
                        {result.data.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {result.data.description}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge()}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            {result.data.actions && result.data.actions.length > 0 && (
                <div className="flex gap-2">
                    {result.data.actions.map((action) => (
                        <Button
                            key={action.action}
                            variant={action.variant || 'default'}
                            onClick={() => onAction(action.action)}
                            className="flex-1"
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
// Recent Scan Item Component
function RecentScanItem({
    scan,
    onClick
}: {
    scan: RecentScan;
    onClick: () => void;
}) {
    const timeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s atrás`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m atrás`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h atrás`;
    };
    return (
        <Card
            className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors"
            onClick={onClick}
        >
            <CardContent className="p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{scan.result.data.code}</span>
                        <span className="text-xs text-gray-400">{scan.result.data.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{timeAgo(scan.timestamp)}</span>
                </div>
            </CardContent>
        </Card>
    );
} 