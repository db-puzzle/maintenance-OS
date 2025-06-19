import { create } from 'zustand';
import { toast } from 'sonner';
import { downloadFile } from '@/utils/download';
import { Button } from '@/components/ui/button';

export interface ExportTask {
    id: number;
    type: 'single' | 'batch';
    description: string;
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string;
    createdAt: Date;
    completedAt?: Date;
    error?: string;
}

interface ExportManagerStore {
    exports: ExportTask[];
    activeExportsCount: number;
    addExport: (exportTask: Omit<ExportTask, 'createdAt'>) => void;
    updateExport: (id: number, updates: Partial<ExportTask>) => void;
    removeExport: (id: number) => void;
    clearCompleted: () => void;
    downloadExport: (id: number) => void;
}

export const useExportManager = create<ExportManagerStore>((set, get) => ({
    exports: [],
    activeExportsCount: 0,

    addExport: (exportTask) => {
        const newExport: ExportTask = {
            ...exportTask,
            createdAt: new Date(),
        };

        set((state) => ({
            exports: [newExport, ...state.exports],
            activeExportsCount: state.activeExportsCount + 1,
        }));

        // Show initial toast
        toast.info(
            <div className="w-full">
                <p className="font-semibold text-sm">Export Started</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                    We'll notify you when your PDF is ready
                </p>
            </div>,
            {
                duration: 3000,
                id: `export-start-${newExport.id}`,
                className: 'font-sans',
            }
        );
    },

    updateExport: (id, updates) => {
        set((state) => {
            const exports = state.exports.map((exp) =>
                exp.id === id ? { ...exp, ...updates } : exp
            );

            // Calculate active exports
            const activeExportsCount = exports.filter(
                (exp) => exp.status === 'processing'
            ).length;

            // Handle status-specific notifications
            const exportTask = exports.find((exp) => exp.id === id);
            if (exportTask) {
                if (updates.status === 'completed' && updates.downloadUrl) {
                    const toastId = `export-complete-${id}`;
                    toast.success(
                        <div className="w-full space-y-2">
                            <div>
                                <p className="font-semibold text-sm">Export Ready!</p>
                                <p className="text-sm text-muted-foreground">
                                    Your PDF has been generated successfully
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    get().downloadExport(id);
                                    toast.dismiss(toastId);
                                }}
                                className="gap-2"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Download PDF
                            </Button>
                        </div>,
                        {
                            duration: Infinity, // Permanent until dismissed
                            id: toastId,
                            className: 'font-sans',
                            onDismiss: () => {
                                // Optional: track that user dismissed without downloading
                                console.log('Export toast dismissed without download');
                            },
                        }
                    );
                } else if (updates.status === 'failed') {
                    toast.error(
                        <div className="w-full">
                            <p className="font-semibold text-sm">Export Failed</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {updates.error || 'Please try again'}
                            </p>
                        </div>,
                        {
                            duration: 5000,
                            id: `export-failed-${id}`,
                            className: 'font-sans',
                        }
                    );
                } else if (updates.progress && updates.progress > 0 && updates.progress < 100) {
                    // Show progress update (but not too frequently)
                    const shouldShowProgress = updates.progress % 25 === 0;
                    if (shouldShowProgress) {
                        toast.loading(
                            <div className="w-full space-y-2">
                                <div>
                                    <p className="font-semibold text-sm">Generating PDF</p>
                                    <p className="text-sm text-muted-foreground">
                                        Please wait while we prepare your document
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out"
                                            style={{ width: `${updates.progress}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {updates.progress}%
                                    </span>
                                </div>
                            </div>,
                            {
                                duration: 2000,
                                id: `export-progress-${id}`,
                                className: 'font-sans',
                            }
                        );
                    }
                }
            }

            return {
                exports,
                activeExportsCount,
            };
        });
    },

    removeExport: (id) => {
        set((state) => {
            const exportToRemove = state.exports.find((exp) => exp.id === id);
            const wasActive = exportToRemove?.status === 'processing';

            return {
                exports: state.exports.filter((exp) => exp.id !== id),
                activeExportsCount: wasActive
                    ? state.activeExportsCount - 1
                    : state.activeExportsCount,
            };
        });
    },

    clearCompleted: () => {
        set((state) => ({
            exports: state.exports.filter((exp) => exp.status === 'processing'),
        }));
    },

    downloadExport: (id) => {
        const exportTask = get().exports.find((exp) => exp.id === id);
        if (exportTask?.downloadUrl) {
            // Extract a meaningful filename from the export description
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            let filename = 'export.pdf';

            if (exportTask.description.includes('Execution #')) {
                // Single execution export
                const match = exportTask.description.match(/Execution #(\d+)/);
                if (match) {
                    filename = `execution_${match[1]}_${timestamp}.pdf`;
                }
            } else if (exportTask.description.includes('History Report')) {
                // Batch export from history
                filename = `history_report_${timestamp}.pdf`;
            }

            // Use the download utility
            downloadFile(exportTask.downloadUrl, filename);

            // Optional: Mark as downloaded or remove from list
            // set((state) => ({
            //     exports: state.exports.filter((exp) => exp.id !== id),
            // }));
        }
    },
})); 