import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ListLayout from '@/layouts/cadastro/list-layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@inertiajs/react';
import { toast } from "sonner";
import { PaginationWrapper } from '@/components/ui/pagination-wrapper';

interface PageProps {
    [key: string]: any;
    flash?: {
        success?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
    },
    {
        title: 'Tipos de Equipamento',
        href: '/cadastro/tipos-equipamento',
    },
];

interface EquipmentType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    equipment_count: number;
}

interface Equipment {
    id: number;
    tag: string;
    description: string | null;
}

interface Dependencies {
    hasDependencies: boolean;
    equipment: Equipment[];
    totalEquipment: number;
}

interface Props {
    equipmentTypes: {
        data: EquipmentType[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
        sort: string;
        direction: 'asc' | 'desc';
        per_page: number;
    };
}

export default function TiposEquipamento({ equipmentTypes, filters }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEquipmentType, setSelectedEquipmentType] = useState<EquipmentType | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const [dependencies, setDependencies] = useState<Dependencies | null>(null);
    const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
    const [showDependenciesDialog, setShowDependenciesDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const { flash } = usePage<PageProps>().props;

    useEffect(() => {
        if (flash?.success) {
            toast.success("Sucesso!", {
                description: flash.success,
            });
        }
    }, [flash]);

    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            router.get(
                route('cadastro.tipos-equipamento'),
                { 
                    search,
                    sort: filters.sort,
                    direction: filters.direction,
                    page: equipmentTypes.current_page
                },
                { preserveState: true, preserveScroll: true }
            );
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [search, filters.sort, filters.direction]);

    const handleDelete = (equipmentType: EquipmentType) => {
        setIsDeleting(true);
        router.delete(route('cadastro.tipos-equipamento.destroy', equipmentType.id), {
            onSuccess: () => {
                setIsDeleting(false);
                setSelectedEquipmentType(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
            },
            onError: (errors) => {
                setIsDeleting(false);
                setSelectedEquipmentType(null);
                setConfirmationText('');
                setShowDeleteDialog(false);
                toast.error("Erro ao excluir tipo de equipamento", {
                    description: errors.message || 'Não foi possível excluir o tipo de equipamento.',
                });
            },
        });
    };

    const checkDependencies = async (equipmentType: EquipmentType) => {
        setIsCheckingDependencies(true);
        setSelectedEquipmentType(equipmentType);
        
        try {
            const response = await fetch(route('cadastro.tipos-equipamento.check-dependencies', equipmentType.id));
            const data = await response.json();
            setDependencies(data);
            
            if (!data.hasDependencies) {
                setShowDeleteDialog(true);
            } else {
                setShowDependenciesDialog(true);
            }
        } catch (error) {
            toast.error("Erro ao verificar dependências", {
                description: "Não foi possível verificar as dependências do tipo de equipamento.",
            });
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    const handleSort = (column: string) => {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        
        router.get(
            route('cadastro.tipos-equipamento'),
            { 
                search,
                sort: column,
                direction,
                page: 1
            },
            { preserveState: true }
        );
    };

    const getSortIcon = (column: string) => {
        if (filters.sort !== column) {
            return <ArrowUpDown className="h-4 w-4" />;
        }
        return filters.direction === 'asc' ? 
            <ArrowUp className="h-4 w-4" /> : 
            <ArrowDown className="h-4 w-4" />;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tipos de Equipamento" />

            <ListLayout
                title="Tipos de Equipamento"
                description="Gerencie os tipos de equipamento do sistema"
                searchPlaceholder="Buscar tipos de equipamento..."
                searchValue={search}
                onSearchChange={(value) => setSearch(value)}
                createRoute={route('cadastro.tipos-equipamento.create')}
                createButtonText="Novo Tipo de Equipamento"
            >
                <div className="rounded-md w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 font-bold hover:bg-transparent"
                                        onClick={() => handleSort('name')}
                                    >
                                        Nome
                                        <span className="ml-2">{getSortIcon('name')}</span>
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 font-bold hover:bg-transparent"
                                        onClick={() => handleSort('description')}
                                    >
                                        Descrição
                                        <span className="ml-2">{getSortIcon('description')}</span>
                                    </Button>
                                </TableHead>
                                <TableHead className="text-center">
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 font-bold hover:bg-transparent"
                                        onClick={() => handleSort('equipment_count')}
                                    >
                                        Equipamentos
                                        <span className="ml-2">{getSortIcon('equipment_count')}</span>
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {equipmentTypes.data.map((equipmentType) => (
                                <TableRow 
                                    key={equipmentType.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.get(route('cadastro.tipos-equipamento.show', equipmentType.id))}
                                >
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{equipmentType.name}</div>
                                            {equipmentType.description && (
                                                <div className="text-sm text-muted-foreground">
                                                    {equipmentType.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{equipmentType.description || '-'}</TableCell>
                                    <TableCell className="text-center">{equipmentType.equipment_count}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                asChild
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Link href={route('cadastro.tipos-equipamento.edit', equipmentType.id)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            checkDependencies(equipmentType);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                            </Dialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-center">
                    <PaginationWrapper
                        currentPage={equipmentTypes.current_page}
                        lastPage={equipmentTypes.last_page}
                        routeName="cadastro.tipos-equipamento"
                        search={search}
                        sort={filters.sort}
                        direction={filters.direction}
                        perPage={filters.per_page}
                    />
                </div>
            </ListLayout>

            {/* Diálogo de Dependências */}
            <Dialog open={showDependenciesDialog} onOpenChange={setShowDependenciesDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogTitle>Não é possível excluir este tipo de equipamento</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-6">
                            <div className="text-sm">
                                Este tipo de equipamento possui equipamentos vinculados e não pode ser excluído até que todos 
                                os equipamentos sejam removidos ou alterados para outro tipo.
                            </div>
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="font-medium text-sm">
                                        Total de Equipamentos Vinculados: {dependencies?.totalEquipment}
                                    </div>
                                    <div className="text-sm text-muted-foreground italic">
                                        Clique no código do equipamento para detalhes
                                    </div>
                                </div>

                                {dependencies?.equipment && dependencies.equipment.length > 0 && (
                                    <div className="space-y-3">
                                        <ul className="list-disc list-inside space-y-2 text-sm">
                                            {dependencies.equipment.map(equipment => (
                                                <li key={equipment.id}>
                                                    <Link
                                                        href={route('cadastro.equipamentos.show', equipment.id)}
                                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                                    >
                                                        {equipment.tag}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogDescription>
                    <DialogFooter>
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowDependenciesDialog(false)}
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Diálogo de Confirmação de Exclusão */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogTitle>Você tem certeza que deseja excluir este tipo de equipamento?</DialogTitle>
                    <DialogDescription>
                        Uma vez que o tipo de equipamento for excluído, todos os seus recursos e dados serão permanentemente excluídos. 
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
                        <Button 
                            variant="secondary"
                            onClick={() => {
                                setShowDeleteDialog(false);
                                setConfirmationText('');
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant="destructive" 
                            disabled={isDeleting || !isConfirmationValid}
                            onClick={() => selectedEquipmentType && handleDelete(selectedEquipmentType)}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir tipo de equipamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 