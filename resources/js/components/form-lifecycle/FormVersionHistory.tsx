import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, History } from 'lucide-react';

interface FormVersionHistoryProps {
    formId: number;
    currentVersionId?: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function FormVersionHistory({ isOpen, onClose }: FormVersionHistoryProps) {
    // This is a placeholder component that will be implemented with full version history functionality
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Histórico de Versões
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="text-muted-foreground py-8 text-center">
                        <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>Histórico de versões em desenvolvimento</p>
                        <p className="mt-2 text-sm">Em breve você poderá visualizar todas as versões anteriores do formulário</p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
