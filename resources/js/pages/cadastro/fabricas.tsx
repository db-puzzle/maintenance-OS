import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Fábricas',
        href: '/cadastro/fabricas',
    },
];

interface Factory {
    id: number;
    name: string;
    street: string | null;
    number: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    gps_coordinates: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    factories: Factory[];
}

export default function Fabricas({ factories }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
    const [confirmationText, setConfirmationText] = useState('');

    const handleDelete = (factory: Factory) => {
        setIsDeleting(true);
        router.delete(route('cadastro.fabricas.destroy', factory.id), {
            onFinish: () => {
                setIsDeleting(false);
                setSelectedFactory(null);
                setConfirmationText('');
            },
        });
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fábricas" />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title="Fábricas" 
                            description="Gerencie as fábricas do sistema" 
                        />
                        <Button asChild>
                            <Link href={route('cadastro.fabricas.create')}>
                                Nova Fábrica
                            </Link>
                        </Button>
                    </div>

                    <div className="rounded-md border w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Endereço</TableHead>
                                    <TableHead>Cidade</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>CEP</TableHead>
                                    <TableHead>Coordenadas GPS</TableHead>
                                    <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {factories.map((factory) => (
                                    <TableRow key={factory.id}>
                                        <TableCell>{factory.name}</TableCell>
                                        <TableCell>
                                            {factory.street}, {factory.number}
                                        </TableCell>
                                        <TableCell>{factory.city}</TableCell>
                                        <TableCell>{factory.state}</TableCell>
                                        <TableCell>{factory.zip_code}</TableCell>
                                        <TableCell>{factory.gps_coordinates}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={route('cadastro.fabricas.edit', factory.id)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => setSelectedFactory(factory)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogTitle>Você tem certeza que deseja excluir esta fábrica?</DialogTitle>
                                                        <DialogDescription>
                                                            Uma vez que a fábrica for excluída, todos os seus recursos e dados serão permanentemente excluídos. 
                                                            Esta ação não pode ser desfeita.
                                                        </DialogDescription>
                                                        <div className="grid gap-2 py-4">
                                                            <Label htmlFor="confirmation" className="sr-only">
                                                                Confirmação
                                                            </Label>
                                                            <Input
                                                                id="confirmation"
                                                                type="text"
                                                                value={confirmationText}
                                                                onChange={(e) => setConfirmationText(e.target.value)}
                                                                placeholder="Digite EXCLUIR para confirmar"
                                                                autoComplete="off"
                                                            />
                                                        </div>
                                                        <DialogFooter className="gap-2">
                                                            <DialogClose asChild>
                                                                <Button 
                                                                    variant="secondary"
                                                                    onClick={() => setConfirmationText('')}
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                            </DialogClose>
                                                            <Button 
                                                                variant="destructive" 
                                                                disabled={isDeleting || !isConfirmationValid}
                                                                onClick={() => selectedFactory && handleDelete(selectedFactory)}
                                                            >
                                                                {isDeleting ? 'Excluindo...' : 'Excluir fábrica'}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 