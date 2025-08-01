import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';
import { toast } from 'sonner';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
    workOrderId: number;
    workOrderNumber: string;
    discipline: 'maintenance' | 'quality';
}

export function DeleteWorkOrder({ workOrderId, workOrderNumber, discipline }: Props) {
    const confirmationInput = useRef<HTMLInputElement>(null);
    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm<Required<{ confirmation: string }>>({ confirmation: '' });

    const deleteWorkOrder: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route(`${discipline}.work-orders.destroy`, workOrderId), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                toast.success(`A ordem de serviço ${workOrderNumber} foi excluída com sucesso!`);
            },
            onError: () => {
                toast.error('Erro ao excluir ordem de serviço', {
                    description: 'Não foi possível excluir a ordem de serviço. Tente novamente.',
                });
            },
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        clearErrors();
        reset();
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                    Excluir
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Você tem certeza que deseja excluir esta ordem de serviço?</DialogTitle>
                <DialogDescription>
                    Uma vez que a ordem de serviço seja excluída, todos os seus recursos e dados serão permanentemente excluídos. Por favor, digite o número da
                    ordem ({workOrderNumber}) para confirmar que você deseja excluir permanentemente esta ordem de serviço.
                </DialogDescription>
                <form className="space-y-6" onSubmit={deleteWorkOrder}>
                    <div className="grid gap-2">
                        <Label htmlFor="confirmation" className="sr-only">
                            Confirmação
                        </Label>

                        <Input
                            id="confirmation"
                            variant="destructive"
                            ref={confirmationInput}
                            value={data.confirmation}
                            onChange={(e) => setData('confirmation', e.target.value)}
                            placeholder="Digite o número da ordem"
                            autoComplete="off"
                        />

                        <InputError message={errors.confirmation} />
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary" onClick={closeModal}>
                                Cancelar
                            </Button>
                        </DialogClose>

                        <Button variant="destructive" disabled={processing || data.confirmation !== workOrderNumber} asChild>
                            <button type="submit">Excluir Ordem</button>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 