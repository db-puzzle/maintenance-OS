import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Play, Upload } from 'lucide-react';
import { getFormState, type FormData } from './FormStatusBadge';
import { toast } from 'sonner';

interface FormExecutionGuardProps {
    form: FormData;
    onExecute: (versionId: number) => void;
    onPublishAndExecute?: () => void;
    onEditForm?: () => void;
    children: React.ReactElement<any>;
}

export default function FormExecutionGuard({
    form,
    onExecute,
    onPublishAndExecute,
    onEditForm,
    children
}: FormExecutionGuardProps) {
    const [showDialog, setShowDialog] = React.useState(false);
    const state = getFormState(form);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (state === 'unpublished') {
            toast.error('Formulário não publicado', {
                description: 'Esta rotina precisa ser publicada antes de ser executada.',
                action: onEditForm ? {
                    label: 'Editar Formulário',
                    onClick: onEditForm
                } : undefined
            });
            return;
        }

        if (state === 'draft') {
            setShowDialog(true);
            return;
        }

        // Published state - execute directly
        const versionId = form.current_version?.id || form.current_version_id || form.currentVersionId;
        if (versionId) {
            onExecute(versionId);
        }
    };

    const handleContinueWithPublished = () => {
        const versionId = form.current_version?.id || form.current_version_id || form.currentVersionId;
        if (versionId) {
            onExecute(versionId);
        }
        setShowDialog(false);
    };

    const handlePublishAndExecute = () => {
        if (onPublishAndExecute) {
            onPublishAndExecute();
        }
        setShowDialog(false);
    };

    // Clone the child element and add onClick handler
    const childWithHandler = React.cloneElement(children, {
        onClick: handleClick,
        disabled: state === 'unpublished' || children.props.disabled
    });

    return (
        <>
            {childWithHandler}

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            Alterações não publicadas
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Esta rotina tem alterações não publicadas. A execução usará a versão publicada
                            {form.current_version && ` (v${form.current_version.version_number})`}.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowDialog(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleContinueWithPublished}
                            className="flex items-center gap-2"
                        >
                            <Play className="h-4 w-4" />
                            Continuar com v{form.current_version?.version_number || '1.0'}
                        </Button>
                        {onPublishAndExecute && (
                            <Button
                                onClick={handlePublishAndExecute}
                                className="flex items-center gap-2"
                            >
                                <Upload className="h-4 w-4" />
                                Publicar e Executar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
} 