import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
interface Props {
    assetId: number;
    assetTag: string;
}
export default function DeleteAsset({ assetId, assetTag }: Props) {
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
    const deleteAsset: FormEventHandler = (e) => {
        e.preventDefault();
        destroy(route('asset-hierarchy.assets.destroy', assetId), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                toast.success(`O ativo ${assetTag} foi excluído com sucesso!`);
            },
            onError: () => {
                toast.error('Erro ao excluir ativo', {
                    description: 'Não foi possível excluir o ativo. Tente novamente.',
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
                <DialogTitle>Você tem certeza que deseja excluir este ativo?</DialogTitle>
                <DialogDescription>
                    Uma vez que o ativo seja excluído, todos os seus recursos e dados serão permanentemente excluídos. Por favor, digite a TAG do
                    ativo ({assetTag}) para confirmar que você deseja excluir permanentemente este ativo.
                </DialogDescription>
                <form className="space-y-6" onSubmit={deleteAsset}>
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
                            placeholder="Digite a TAG do ativo"
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
                        <Button variant="destructive" disabled={processing || data.confirmation !== assetTag} asChild>
                            <button type="submit">Excluir Ativo</button>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
