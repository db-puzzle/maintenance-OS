import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';
import { toast } from "sonner";

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import HeadingSmall from '@/components/heading-small';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Props {
    equipmentId: number;
    equipmentTag: string;
}

export default function DeleteEquipment({ equipmentId, equipmentTag }: Props) {
    const confirmationInput = useRef<HTMLInputElement>(null);
    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm<Required<{ confirmation: string }>>({ confirmation: '' });

    const deleteEquipment: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('cadastro.equipamentos.destroy', equipmentId), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                toast.success(`O equipamento ${equipmentTag} foi excluído com sucesso!`);
            },
            onError: (errors) => {
                toast.error("Erro ao excluir equipamento", {
                    description: "Não foi possível excluir o equipamento. Tente novamente."
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
        <div className="space-y-6 max-w-2xl">
            <HeadingSmall title="Excluir Equipamento" description="Exclua o equipamento e todos os seus recursos" />
            <div className="space-y-4 rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-200/10 dark:bg-red-700/10">
                <div className="relative space-y-0.5 text-red-600 dark:text-red-100">
                    <p className="font-medium">Atenção</p>
                    <p className="text-sm">Por favor, proceda com cautela, esta ação não pode ser desfeita.</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">Excluir Equipamento</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Você tem certeza que deseja excluir este equipamento?</DialogTitle>
                        <DialogDescription>
                            Uma vez que o equipamento seja excluído, todos os seus recursos e dados serão permanentemente excluídos. 
                            Por favor, digite a TAG do equipamento ({equipmentTag}) para confirmar que você deseja excluir permanentemente este equipamento.
                        </DialogDescription>
                        <form className="space-y-6" onSubmit={deleteEquipment}>
                            <div className="grid gap-2">
                                <Label htmlFor="confirmation" className="sr-only">
                                    Confirmação
                                </Label>

                                <Input
                                    id="confirmation"
                                    ref={confirmationInput}
                                    value={data.confirmation}
                                    onChange={(e) => setData('confirmation', e.target.value)}
                                    placeholder="Digite a TAG do equipamento"
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

                                <Button variant="destructive" disabled={processing || data.confirmation !== equipmentTag} asChild>
                                    <button type="submit">Excluir Equipamento</button>
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
} 