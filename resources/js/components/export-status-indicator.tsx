import React from 'react';
import { FileDown, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExportManager } from '@/hooks/use-export-manager';
import { cn } from '@/lib/utils';

export function ExportStatusIndicator() {
    const { exports, activeExportsCount, removeExport, clearCompleted, downloadExport } = useExportManager();

    if (exports.length === 0) {
        return null;
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'processing':
                return <Loader2 className="h-3 w-3 animate-spin" />;
            case 'completed':
                return <CheckCircle2 className="h-3 w-3 text-green-600" />;
            case 'failed':
                return <XCircle className="h-3 w-3 text-red-600" />;
            default:
                return null;
        }
    };

    const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                >
                    <FileDown className="h-5 w-5" />
                    {activeExportsCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-blue-600 text-white text-xs items-center justify-center">
                                {activeExportsCount}
                            </span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Export Status</span>
                    {exports.some(e => e.status === 'completed') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={clearCompleted}
                        >
                            Clear completed
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="max-h-96">
                    {exports.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No active exports
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {exports.map((exportTask) => (
                                <DropdownMenuItem
                                    key={exportTask.id}
                                    className="flex items-start gap-3 p-3 cursor-default focus:bg-transparent"
                                    onSelect={(e) => e.preventDefault()}
                                >
                                    <div className="mt-0.5">
                                        {getStatusIcon(exportTask.status)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium leading-tight">
                                                    {exportTask.description}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {getRelativeTime(exportTask.createdAt)}
                                                </p>
                                            </div>
                                            {exportTask.status !== 'processing' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto p-0 text-xs hover:bg-transparent"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeExport(exportTask.id);
                                                    }}
                                                >
                                                    ×
                                                </Button>
                                            )}
                                        </div>
                                        {exportTask.status === 'processing' && exportTask.progress > 0 && (
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                                                    <div
                                                        className="h-full rounded-full bg-blue-600 transition-all"
                                                        style={{ width: `${exportTask.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {exportTask.progress}%
                                                </span>
                                            </div>
                                        )}
                                        {exportTask.status === 'completed' && exportTask.downloadUrl && (
                                            <button
                                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    downloadExport(exportTask.id);
                                                }}
                                            >
                                                Download PDF
                                            </button>
                                        )}
                                        {exportTask.status === 'failed' && exportTask.error && (
                                            <p className="text-xs text-red-600">
                                                {exportTask.error}
                                            </p>
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 