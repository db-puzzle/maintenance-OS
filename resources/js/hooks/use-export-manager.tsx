import { create } from 'zustand';
import { toast } from 'sonner';
import { downloadFile } from '@/utils/download';

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
        toast.info('Export started - we\'ll notify you when ready', {
            duration: 3000,
            id: `export-start-${newExport.id}`,
        });
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
                        <div className="flex flex-col gap-2">
                            <span>Your export is ready!</span>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    get().downloadExport(id);
                                    toast.dismiss(toastId);
                                }}
                                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 text-left"
                            >
                                Download PDF
                            </button>
                        </div>,
                        {
                            duration: Infinity, // Permanent until dismissed
                            id: toastId,
                            onDismiss: () => {
                                // Optional: track that user dismissed without downloading
                                console.log('Export toast dismissed without download');
                            },
                        }
                    );
                } else if (updates.status === 'failed') {
                    toast.error(
                        <div className="flex flex-col gap-1">
                            <span>Export failed</span>
                            <span className="text-sm text-muted-foreground">
                                {updates.error || 'Please try again'}
                            </span>
                        </div>,
                        {
                            duration: 5000,
                            id: `export-failed-${id}`,
                        }
                    );
                } else if (updates.progress && updates.progress > 0 && updates.progress < 100) {
                    // Show progress update (but not too frequently)
                    const shouldShowProgress = updates.progress % 25 === 0;
                    if (shouldShowProgress) {
                        toast.loading(
                            <div className="flex flex-col gap-1">
                                <span>Generating PDF...</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-32 rounded-full bg-gray-200">
                                        <div
                                            className="h-full rounded-full bg-blue-600 transition-all"
                                            style={{ width: `${updates.progress}%` }}
                                        />
                                    </div>
                                    <span className="text-sm">{updates.progress}%</span>
                                </div>
                            </div>,
                            {
                                duration: 2000,
                                id: `export-progress-${id}`,
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