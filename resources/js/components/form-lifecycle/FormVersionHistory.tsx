import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, History, Calendar, User, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
interface Version {
    id: number;
    version_number: string;
    published_at: string;
    published_by: {
        id: number;
        name: string;
    } | null;
    tasks_count: number;
    is_current: boolean;
}
interface FormVersionHistoryProps {
    routineId: number;
    isOpen: boolean;
    onClose: () => void;
}
export default function FormVersionHistory({ routineId, isOpen, onClose }: FormVersionHistoryProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (isOpen) {
            fetchVersions();
        }
    }, [isOpen, routineId]);
    const fetchVersions = async () => {
        setLoading(true);
        try {
            const response = await axios.get(route('maintenance.routines.version-history', routineId));
            setVersions(response.data.versions);
        } catch (error) {
            console.error('Error fetching version history:', error);
            toast.error('Erro ao carregar histórico de versões');
        } finally {
            setLoading(false);
        }
    };
    const handleViewVersion = (versionId: number) => {
        router.visit(route('maintenance.routines.view-version', { routine: routineId, versionId }));
    };
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Histórico de Versões
                    </DialogTitle>
                    <DialogDescription>
                        Clique em uma versão para visualizar suas tarefas
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                                <p className="mt-2 text-sm text-gray-500">Carregando versões...</p>
                            </div>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center">
                            <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>Nenhuma versão publicada encontrada</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {versions.map((version) => (
                                <button
                                    key={version.id}
                                    className="w-full p-3 text-left border rounded-md bg-white hover:bg-gray-50 focus-visible:border-ring focus-visible:ring-ring/10 focus-visible:ring-[3px] focus-visible:bg-input-focus transition-[color,box-shadow] outline-none"
                                    onClick={() => handleViewVersion(version.id)}
                                >
                                    <div className="w-full flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-sm">
                                                Versão {version.version_number}
                                            </h3>
                                            {version.is_current && (
                                                <Badge variant="default" className="text-xs">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Atual
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {version.tasks_count} {version.tasks_count === 1 ? 'tarefa' : 'tarefas'}
                                        </Badge>
                                    </div>
                                    <div className="w-full flex items-center gap-4 text-xs text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                {format(new Date(version.published_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        {version.published_by && (
                                            <div className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                <span>{version.published_by.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex justify-end pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
