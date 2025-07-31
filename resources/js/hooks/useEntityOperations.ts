import { BaseEntity, DependencyResult } from '@/types/shared';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface UseEntityOperationsProps {
    entityName: string;
    entityLabel: string;
    routes: {
        index: string;
        show: string;
        destroy: string;
        checkDependencies?: string;
    };
    routeParameterName?: string; // Optional parameter name for routes (defaults to 'id')
}

interface UseEntityOperationsReturn<T> {
    editingItem: T | null;
    deletingItem: T | null;
    loadingEdit: boolean;
    isEditSheetOpen: boolean;
    isDeleteDialogOpen: boolean;
    isDependenciesDialogOpen: boolean;
    dependencies: DependencyResult | null;
    isCheckingDependencies: boolean;

    handleEdit: (item: T) => Promise<void>;
    handleDelete: (item: T) => Promise<void>;
    confirmDelete: () => Promise<void>;
    checkDependencies: () => Promise<DependencyResult>;

    setEditSheetOpen: (open: boolean) => void;
    setDeleteDialogOpen: (open: boolean) => void;
    setDependenciesDialogOpen: (open: boolean) => void;
    clearEditingItem: () => void;
}

export function useEntityOperations<T extends BaseEntity>({
    entityName,
    entityLabel,
    routes,
    routeParameterName = 'id',
}: UseEntityOperationsProps): UseEntityOperationsReturn<T> {
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [deletingItem, setDeletingItem] = useState<T | null>(null);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [isEditSheetOpen, setEditSheetOpen] = useState(false);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDependenciesDialogOpen, setDependenciesDialogOpen] = useState(false);
    const [dependencies, setDependencies] = useState<DependencyResult | null>(null);
    const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);

    const handleEdit = async (item: T) => {
        setLoadingEdit(true);
        try {
            const routeParams = { [routeParameterName]: item.id };
            const response = await axios.get(route(routes.show, routeParams));
            const data = response.data;

            // Extract the entity data from the response
            // The response structure is { entityName: entityData, ... }
            const entityData = data[entityName] || data;

            setEditingItem(entityData);
            setEditSheetOpen(true);
        } catch (error) {
            console.error('Error fetching entity:', error);
            toast.error(`Erro ao carregar dados`);
        } finally {
            setLoadingEdit(false);
        }
    };

    const handleDelete = async (item: T) => {
        // Blur the current active element to prevent focus issues
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        setDeletingItem(item);
        setIsCheckingDependencies(true);

        try {
            if (routes.checkDependencies) {
                const routeParams = { [routeParameterName]: item.id };
                const response = await fetch(route(routes.checkDependencies, routeParams));
                const data = await response.json();
                setDependencies(data);

                if (data.can_delete) {
                    setDeleteDialogOpen(true);
                } else {
                    setDependenciesDialogOpen(true);
                }
            } else {
                // If no dependency check route is configured, open delete dialog directly
                setDeleteDialogOpen(true);
            }
        } catch {
            toast.error('Erro ao verificar dependências', {
                description: 'Não foi possível verificar as dependências.',
            });
            // On error, still allow deletion attempt
            setDeleteDialogOpen(true);
        } finally {
            setIsCheckingDependencies(false);
        }
    };

    const confirmDelete = async () => {
        if (!deletingItem) return;

        return new Promise<void>((resolve, reject) => {
            const routeParams = { [routeParameterName]: deletingItem.id };
            router.delete(route(routes.destroy, routeParams), {
                onSuccess: () => {
                    toast.success(`${entityLabel} excluído com sucesso`);
                    setDeleteDialogOpen(false);
                    setDeletingItem(null);
                    setDependencies(null);
                    resolve();
                },
                onError: (errors) => {
                    toast.error(`Erro ao excluir ${entityName}`);
                    reject(errors);
                },
                preserveScroll: true,
                preserveState: true,
            });
        });
    };

    const checkDependencies = async () => {
        if (!deletingItem || !routes.checkDependencies) {
            throw new Error('No item selected or dependencies route not configured');
        }

        const routeParams = { [routeParameterName]: deletingItem.id };
        const response = await fetch(route(routes.checkDependencies, routeParams));
        return response.json();
    };

    const clearEditingItem = () => {
        setEditingItem(null);
    };

    return {
        editingItem,
        deletingItem,
        loadingEdit,
        isEditSheetOpen,
        isDeleteDialogOpen,
        isDependenciesDialogOpen,
        dependencies,
        isCheckingDependencies,

        handleEdit,
        handleDelete,
        confirmDelete,
        checkDependencies,

        setEditSheetOpen: (open: boolean) => {
            setEditSheetOpen(open);
            if (!open) {
                clearEditingItem();
            }
        },
        setDeleteDialogOpen: (open: boolean) => {
            setDeleteDialogOpen(open);
            if (!open) {
                setDeletingItem(null);
                setDependencies(null);
            }
        },
        setDependenciesDialogOpen: (open: boolean) => {
            setDependenciesDialogOpen(open);
            if (!open) {
                setDeletingItem(null);
                setDependencies(null);
            }
        },
        clearEditingItem,
    };
}
