import { type BreadcrumbItem } from '@/types';
import { Head, router, Link } from '@inertiajs/react';
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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/cadastro/areas',
    },
];

interface Area {
    id: number;
    name: string;
    factory_id: number | null;
    parent_area_id: number | null;
    factory?: {
        id: number;
        name: string;
    } | null;
    parent_area?: {
        id: number;
        name: string;
        factory?: {
            id: number;
            name: string;
        } | null;
    } | null;
    closest_factory?: {
        id: number;
        name: string;
    } | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    areas: Area[];
}

export default function Areas({ areas }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [confirmationText, setConfirmationText] = useState('');

    console.log('Dados das áreas:', areas);

    const handleDelete = (area: Area) => {
        setIsDeleting(true);
        router.delete(route('cadastro.areas.destroy', area.id), {
            onFinish: () => {
                setIsDeleting(false);
                setSelectedArea(null);
                setConfirmationText('');
            },
            onError: (errors) => {
                setIsDeleting(false);
                setSelectedArea(null);
                setConfirmationText('');
                alert(errors.message || 'Não foi possível excluir a área.');
            },
        });
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Áreas" />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title="Áreas" 
                            description="Gerencie as áreas do sistema" 
                        />
                        <Button asChild>
                            <Link href={route('cadastro.areas.create')}>
                                Nova Área
                            </Link>
                        </Button>
                    </div>

                    <div className="rounded-md border w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Fábrica</TableHead>
                                    <TableHead>Área Pai</TableHead>
                                    <TableHead className="w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {areas.map((area) => {
                                    console.log(`Área ${area.name}:`, {
                                        parent_area_id: area.parent_area_id,
                                        parent_area: area.parent_area,
                                        closest_factory: area.closest_factory
                                    });
                                    return (
                                        <TableRow key={area.id}>
                                            <TableCell>{area.name}</TableCell>
                                            <TableCell>{area.closest_factory?.name || '-'}</TableCell>
                                            <TableCell>
                                                {area.parent_area_id && area.parent_area ? area.parent_area.name : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link href={route('cadastro.areas.edit', area.id)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                onClick={() => setSelectedArea(area)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogTitle>Você tem certeza que deseja excluir esta área?</DialogTitle>
                                                            <DialogDescription>
                                                                Uma vez que a área for excluída, todos os seus recursos e dados serão permanentemente excluídos. 
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
                                                                    onClick={() => selectedArea && handleDelete(selectedArea)}
                                                                >
                                                                    {isDeleting ? 'Excluindo...' : 'Excluir área'}
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 