import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, FileText, Edit2, Plus, ClipboardCheck, MoreVertical, Eye, Trash2 } from 'lucide-react';
import { Task } from '@/types/task';
import { Link, router } from '@inertiajs/react';
import EditRoutineSheet from '@/components/EditRoutineSheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export interface Routine {
    id?: number;
    name: string;
    trigger_hours: number;
    type: 1 | 2 | 3; // 1: Inspection, 2: Maintenance Routine, 3: Maintenance Report
    status: 'Active' | 'Inactive';
    description?: string;
    form_id?: number;
    form?: {
        id: number;
        name: string;
        tasks: Task[];
    };
}

interface RoutineListProps {
    routine?: Routine;
    onSave?: (routine: Routine) => void;
    onDelete?: (routine: Routine) => void;
    onCancel?: () => void;
    isNew?: boolean;
    assetId?: number;
}

const routineTypes = [
    { value: '1', label: 'Inspeção' },
    { value: '2', label: 'Rotina de Manutenção' },
    { value: '3', label: 'Relatório de Manutenção' }
];

export default function RoutineList({ routine, onSave, onDelete, onCancel, isNew = false, assetId }: RoutineListProps) {
    // Referência para o trigger do sheet
    const editSheetTriggerRef = useRef<HTMLButtonElement>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Estados para controle do modal de exclusão
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Estado para controlar o dropdown
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Dados da rotina ou dados vazios para nova rotina
    const routineData = routine || {
        name: '',
        trigger_hours: 0,
        type: 2 as const,
        status: 'Active' as const,
        description: '',
        form: undefined
    };

    const formatTriggerHours = (hours: number) => {
        if (hours < 24) {
            return `${hours} hora${hours !== 1 ? 's' : ''}`;
        } else if (hours % 24 === 0) {
            const days = hours / 24;
            return `${days} dia${days !== 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days} dia${days !== 1 ? 's' : ''} e ${remainingHours} hora${remainingHours !== 1 ? 's' : ''}`;
        }
    };

    const handleEditClick = () => {
        setIsSheetOpen(true);
        editSheetTriggerRef.current?.click();
    };

    const handleSheetSuccess = (updatedRoutine: Routine) => {
        setIsSheetOpen(false);
        if (onSave) {
            onSave(updatedRoutine);
        }
    };

    const handleSheetOpenChange = (open: boolean) => {
        setIsSheetOpen(open);
    };

    const handleDelete = () => {
        if (!routine?.id) return;
        setDropdownOpen(false);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (!routine?.id) return;

        setIsDeleting(true);
        router.delete(route('maintenance.assets.routines.destroy', { asset: assetId, routine: routine.id }), {
            onSuccess: () => {
                toast.success('Rotina excluída com sucesso!');
                setShowDeleteDialog(false);
                setConfirmationText('');
                setIsDeleting(false);
                // Chamar callback para atualizar a lista
                if (onDelete && routine) {
                    onDelete(routine);
                }
            },
            onError: () => {
                toast.error('Erro ao excluir rotina. Tente novamente.');
                setIsDeleting(false);
            }
        });
    };

    const cancelDelete = () => {
        setShowDeleteDialog(false);
        setConfirmationText('');
    };

    const isConfirmationValid = confirmationText === 'EXCLUIR';

    // Se for nova rotina, renderizar um card especial
    if (isNew) {
        return (
            <>
                <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
                    <CardContent className="flex flex-col items-center justify-center p-8">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-center mb-2">
                            Nova Rotina de Manutenção
                        </h3>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                            Configure uma nova rotina de manutenção para este ativo
                        </p>
                        <Button onClick={handleEditClick}>
                            <Plus className="h-4 w-4 mr-1" />
                            Criar Rotina
                        </Button>
                    </CardContent>
                </Card>

                {/* EditRoutineSheet com SheetTrigger interno */}
                <div style={{ display: 'none' }}>
                    <EditRoutineSheet
                        showTrigger={true}
                        triggerText="Trigger Oculto"
                        triggerVariant="outline"
                        triggerRef={editSheetTriggerRef}
                        routine={routineData}
                        isNew={true}
                        assetId={assetId}
                        onSuccess={handleSheetSuccess}
                        isOpen={isSheetOpen}
                        onOpenChange={handleSheetOpenChange}
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <li className="flex items-center justify-between gap-x-6 py-5">
                <div className="min-w-0">
                    <div className="flex items-start gap-x-3">
                        <p className="text-sm font-semibold text-gray-900">{routineData.name}</p>
                        <p className={`mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${routineData.status === 'Active'
                            ? 'text-green-700 bg-green-50 ring-green-600/20'
                            : 'text-gray-600 bg-gray-50 ring-gray-500/10'
                            }`}>
                            {routineData.status === 'Active' ? 'Ativo' : 'Inativo'}
                        </p>
                    </div>
                    <div className="mt-1 flex items-center gap-x-2 text-xs text-gray-500">
                        <p className="whitespace-nowrap flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Intervalo: {formatTriggerHours(routineData.trigger_hours)}
                        </p>
                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                            <circle r={1} cx={1} cy={1} />
                        </svg>
                        <p className="truncate">
                            {routineTypes.find(t => t.value === routineData.type.toString())?.label}
                        </p>
                        {routineData.form && (
                            <>
                                <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                                    <circle r={1} cx={1} cy={1} />
                                </svg>
                                <p className="truncate flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {routineData.form.tasks?.length || 0} tarefas
                                </p>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex flex-none items-center gap-x-4">
                    {routineData.form ? (
                        <Link
                            href={route('maintenance.assets.routines.form', { asset: assetId, routine: routineData.id, mode: 'fill' })}
                            className="hidden sm:block"
                        >
                            <Button size="sm">
                                <ClipboardCheck className="h-4 w-4 mr-1" />
                                Executar
                            </Button>
                        </Link>
                    ) : (
                        <Link
                            href={route('maintenance.assets.routines.form-editor', { asset: assetId, routine: routineData.id })}
                            className="hidden sm:block"
                        >
                            <Button size="sm" variant="secondary">
                                <FileText className="h-4 w-4 mr-1" />
                                Criar Tarefas
                            </Button>
                        </Link>
                    )}
                    {!isSheetOpen && (
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                                    <span className="sr-only">Abrir opções</span>
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {routineData.form ? (
                                    <>
                                        <DropdownMenuItem asChild className="sm:hidden">
                                            <Link
                                                href={route('maintenance.assets.routines.form', { asset: assetId, routine: routineData.id, mode: 'fill' })}
                                                className="flex items-center"
                                            >
                                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                                Executar
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="sm:hidden" />
                                    </>
                                ) : (
                                    <>
                                        <DropdownMenuItem asChild className="sm:hidden">
                                            <Link
                                                href={route('maintenance.assets.routines.form-editor', { asset: assetId, routine: routineData.id })}
                                                className="flex items-center"
                                            >
                                                <FileText className="h-4 w-4 mr-2" />
                                                Criar Tarefas
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="sm:hidden" />
                                    </>
                                )}
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={route('maintenance.assets.routines.executions', { asset: assetId, routine: routineData.id })}
                                        className="flex items-center"
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Visualizar Execuções
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleEditClick}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </li>

            {/* Modal de Confirmação de Exclusão */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogTitle>Confirmar exclusão</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir a rotina "{routineData.name}"? Esta ação não pode ser desfeita.
                    </DialogDescription>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="confirmation">Digite EXCLUIR para confirmar</Label>
                            <Input
                                id="confirmation"
                                variant="destructive"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" onClick={cancelDelete}>Cancelar</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={!isConfirmationValid || isDeleting}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* EditRoutineSheet com SheetTrigger interno */}
            <div style={{ display: 'none' }}>
                <EditRoutineSheet
                    showTrigger={true}
                    triggerText="Trigger Oculto"
                    triggerVariant="outline"
                    triggerRef={editSheetTriggerRef}
                    routine={routineData}
                    isNew={false}
                    assetId={assetId}
                    onSuccess={handleSheetSuccess}
                    isOpen={isSheetOpen}
                    onOpenChange={handleSheetOpenChange}
                />
            </div>
        </>
    );
} 