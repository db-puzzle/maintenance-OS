import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, FileText } from 'lucide-react';

interface FormVersionHistoryProps {
    formId: number;
    currentVersionId?: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function FormVersionHistory({
    formId: _formId,
    currentVersionId: _currentVersionId,
    isOpen,
    onClose
}: FormVersionHistoryProps) {
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
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Histórico de versões em desenvolvimento</p>
                        <p className="text-sm mt-2">Em breve você poderá visualizar todas as versões anteriores do formulário</p>
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