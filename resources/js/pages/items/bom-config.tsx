import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Edit, GripVertical, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import AppLayout from '@/layouts/app-layout';
import CreateLayout from '@/layouts/asset-hierarchy/create-layout';
import ItemModal from './components/ItemModal';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/items',
    },
    {
        title: 'Configuração BOM',
        href: '/items/bom-config',
    },
];

interface Props {
    data: {
        data: Record<string, unknown>[];
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

interface BOMItem {
    id: string;
    name: string;
    description: string;
    quantity: number;
    unit: string;
    children: BOMItem[];
}

interface VisualBOMBuilderProps {
    ref?: React.RefObject<{ handleExportBOM: () => void }>;
}

const VisualBOMBuilder = React.forwardRef<{ handleExportBOM: () => void }, VisualBOMBuilderProps>((props, ref) => {
    const [items, setItems] = useState<BOMItem[]>([
        {
            id: '1',
            name: 'Main Assembly',
            description: 'Top level assembly',
            quantity: 1,
            unit: 'ea',
            children: [
                {
                    id: '1-1',
                    name: 'Sub-Assembly A',
                    description: 'First sub-assembly',
                    quantity: 2,
                    unit: 'ea',
                    children: [
                        { id: '1-1-1', name: 'Component X', description: 'Metal bracket', quantity: 4, unit: 'ea', children: [] },
                        { id: '1-1-2', name: 'Component Y', description: 'Fastener set', quantity: 12, unit: 'ea', children: [] },
                    ],
                },
                {
                    id: '1-2',
                    name: 'Sub-Assembly B',
                    description: 'Second sub-assembly',
                    quantity: 1,
                    unit: 'ea',
                    children: [{ id: '1-2-1', name: 'Component Z', description: 'Circuit board', quantity: 1, unit: 'ea', children: [] }],
                },
            ],
        },
    ]);

    const [expanded, setExpanded] = useState<Record<string, boolean>>({ '1': true, '1-1': true, '1-2': true });
    const [editingItem, setEditingItem] = useState<BOMItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
    const draggingRef = useRef<string | null>(null);
    const dragItemRef = useRef<HTMLElement | null>(null);
    const dropTypeRef = useRef<{ parentId: string; index: number } | null>(null);

    // Helper function to find and update an item in the tree
    const findItemById = (items: BOMItem[], id: string): BOMItem | null => {
        for (const item of items) {
            if (item.id === id) {
                return item;
            }
            if (item.children && item.children.length > 0) {
                const found = findItemById(item.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    // Helper function to update the items tree
    const updateItemsTree = (items: BOMItem[], id: string, updateFn: (item: BOMItem) => BOMItem): BOMItem[] => {
        return items.map((item) => {
            if (item.id === id) {
                return updateFn(item);
            }
            if (item.children && item.children.length > 0) {
                return {
                    ...item,
                    children: updateItemsTree(item.children, id, updateFn),
                };
            }
            return item;
        });
    };

    // Helper function to remove an item from the tree
    const removeItemFromTree = (items: BOMItem[], id: string): BOMItem[] => {
        return items.reduce<BOMItem[]>((acc, item) => {
            if (item.id === id) {
                return acc;
            }

            if (item.children && item.children.length > 0) {
                const newChildren = removeItemFromTree(item.children, id);
                return [...acc, { ...item, children: newChildren }];
            }

            return [...acc, item];
        }, []);
    };

    // Helper function to add a child to an item
    const addChildToItem = (items: BOMItem[], parentId: string, newChild: BOMItem): BOMItem[] => {
        return items.map((item) => {
            if (item.id === parentId) {
                return {
                    ...item,
                    children: [...item.children, newChild],
                };
            }
            if (item.children && item.children.length > 0) {
                return {
                    ...item,
                    children: addChildToItem(item.children, parentId, newChild),
                };
            }
            return item;
        });
    };

    // Function to toggle expanded state
    const toggleExpand = (id: string) => {
        setExpanded((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    // Usar useEffect para garantir que todos os elementos estejam prontos para drag and drop
    useEffect(() => {
        // Adicionar uma classe específica para os itens arrastáveis
        const allDraggableItems = document.querySelectorAll('.drag-handle');
        allDraggableItems.forEach((item) => {
            item.setAttribute('draggable', 'true');
        });

        // Limpar qualquer estado de dragging quando a página é carregada/recarregada
        draggingRef.current = null;
    }, [items]);

    // Função para iniciar o arrasto com mousedown + dragstart
    const handleItemMouseDown = (e: React.MouseEvent) => {
        // Garantir que estamos no elemento correto
        const target = e.currentTarget as HTMLElement;
        dragItemRef.current = target;
    };

    // Function to handle drag start - simplificado e mais direto
    const handleDragStart = (id: string) => {
        draggingRef.current = id;
    };

    // Função atualizada para adicionar um item em uma posição específica dentro de um pai
    const insertItemAtPosition = (items: BOMItem[], parentId: string, newItem: BOMItem, position: number): BOMItem[] => {
        return items.map((item) => {
            if (item.id === parentId) {
                // Criar uma cópia dos filhos
                const newChildren = [...item.children];
                // Inserir o novo item na posição específica
                newChildren.splice(position, 0, newItem);

                return {
                    ...item,
                    children: newChildren,
                };
            }

            if (item.children && item.children.length > 0) {
                return {
                    ...item,
                    children: insertItemAtPosition(item.children, parentId, newItem, position),
                };
            }

            return item;
        });
    };

    // Função para obter o ID do pai de um item
    const getParentId = (items: BOMItem[], childId: string, parentId: string = ''): string => {
        for (const item of items) {
            // Verificar se este item é o pai
            const isParent = item.children.some((child) => child.id === childId);
            if (isParent) {
                return item.id;
            }

            // Verificar recursivamente nos filhos
            if (item.children.length > 0) {
                const foundParentId = getParentId(item.children, childId, item.id);
                if (foundParentId) {
                    return foundParentId;
                }
            }
        }

        return parentId;
    };

    // Função para obter a posição/índice de um item dentro dos filhos do seu pai
    const getItemIndex = (items: BOMItem[], itemId: string): number => {
        // Encontrar o pai
        const parentId = getParentId(items, itemId);
        if (!parentId) return -1;

        // Encontrar o pai na árvore
        const parent = findItemById(items, parentId);
        if (!parent) return -1;

        // Encontrar o índice do item nos filhos do pai
        return parent.children.findIndex((child) => child.id === itemId);
    };

    // Function to handle drag over - atualizada para lidar com drop zones
    const handleDragOver = (e: React.DragEvent, targetId: string, dropType: 'as-child' | 'reorder' = 'as-child', position?: number) => {
        // Sempre previnir o comportamento padrão para permitir o drop
        e.preventDefault();

        // Verificar se estamos arrastando algo
        if (!draggingRef.current) return;

        // Não destacar o item sendo arrastado
        if (draggingRef.current === targetId) return;

        // Se for drop para reordenar, não precisamos da verificação de filhos
        if (dropType === 'as-child') {
            // Verificar se o alvo é um filho do item arrastado (para prevenir referência circular)
            const isChildOfDragged = checkIfChildOfDragged(draggingRef.current, targetId);
            if (isChildOfDragged) return;
        }

        // Remover qualquer destaque existente
        document.querySelectorAll('.highlight-drop-area').forEach((el) => {
            el.classList.remove('border-blue-500', 'border-2', 'bg-blue-50', 'highlight-drop-area');
        });

        document.querySelectorAll('.highlight-reorder-area').forEach((el) => {
            el.classList.remove('border-blue-500', 'border-2', 'h-2', 'bg-blue-500', 'highlight-reorder-area');
        });

        // Armazenar o tipo de operação atual
        dropTypeRef.current = dropType === 'reorder' && position !== undefined ? { parentId: targetId, index: position } : null;

        if (dropType === 'reorder' && position !== undefined) {
            // Para reordenação, precisamos destacar a drop zone
            const container = e.currentTarget as HTMLElement;
            if (container) {
                container.classList.add('border-blue-500', 'border-2', 'h-2', 'bg-blue-500', 'highlight-reorder-area');
            }
        } else {
            // Para adição como filho, destacar o container do item
            const container = e.currentTarget as HTMLElement;
            if (container) {
                container.classList.add('border-blue-500', 'border-2', 'bg-blue-50', 'highlight-drop-area');
            }
        }

        // Definir o efeito de drop
        e.dataTransfer.dropEffect = 'move';
    };

    // Função helper para verificar referência circular
    const checkIfChildOfDragged = (draggedId: string, targetId: string): boolean => {
        const draggedItem = findItemById(items, draggedId);

        const checkChildren = (item: BOMItem): boolean => {
            if (item.id === targetId) return true;
            if (item.children && item.children.length > 0) {
                return item.children.some((child) => checkChildren(child));
            }
            return false;
        };

        return draggedItem ? draggedItem.children.some((child) => checkChildren(child)) : false;
    };

    // Function to handle drag leave - atualizada para lidar com os dois tipos de áreas
    const handleDragLeave = (e: React.DragEvent) => {
        // Verificar se o mouse realmente saiu do elemento (e não apenas entrou em um filho)
        if (e.currentTarget && e.relatedTarget) {
            const currentTarget = e.currentTarget as HTMLElement;
            const relatedTarget = e.relatedTarget as HTMLElement;

            // Se o relatedTarget é filho do currentTarget, não remover os destaques
            if (currentTarget.contains(relatedTarget)) {
                return;
            }
        }

        const container = e.currentTarget as HTMLElement;

        // Remover o destaque visual baseado na classe
        if (container.classList.contains('highlight-drop-area')) {
            container.classList.remove('border-blue-500', 'border-2', 'bg-blue-50', 'highlight-drop-area');
        }

        if (container.classList.contains('highlight-reorder-area')) {
            container.classList.remove('border-blue-500', 'border-2', 'h-2', 'bg-blue-500', 'highlight-reorder-area');
        }
    };

    // Function to handle drag end
    const handleDragEnd = () => {
        // Remover classes visuais de todos os elementos
        document.querySelectorAll('.droppable-area').forEach((el) => {
            el.classList.remove('border-blue-500', 'border-2', 'bg-blue-50', 'opacity-50');
        });

        // Limpar a referência de arrasto
        if (draggingRef.current) {
            const draggedElement = document.querySelector(`[data-id="${draggingRef.current}"]`);
            if (draggedElement) {
                draggedElement.classList.remove('opacity-50');
            }
            draggingRef.current = null;
        }
    };

    // Function to handle drop - atualizada para suportar reordenação
    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();

        // Remover destaques visuais
        document.querySelectorAll('.highlight-drop-area, .highlight-reorder-area').forEach((el) => {
            el.classList.remove('border-blue-500', 'border-2', 'bg-blue-50', 'h-2', 'bg-blue-500', 'highlight-drop-area', 'highlight-reorder-area');
        });

        // Recuperar o ID do item arrastado
        const draggedId = draggingRef.current;
        if (!draggedId) {
            try {
                const dataId = e.dataTransfer.getData('text/plain');
                if (dataId) {
                    draggingRef.current = dataId;
                } else {
                    return;
                }
            } catch (error) {
                console.error('Error getting data from dataTransfer:', error);
                return;
            }
        }

        const finalDraggedId = draggingRef.current;
        if (!finalDraggedId) return;

        // Não permitir drop no próprio item
        if (finalDraggedId === targetId && dropTypeRef.current) {
            resetDragState();
            return;
        }

        // Verificar referência circular para adição como filho
        if (dropTypeRef.current && checkIfChildOfDragged(finalDraggedId, targetId)) {
            // Mostrar feedback de erro
            const targetElement = document.querySelector(`[data-id="${targetId}"]`);
            if (targetElement) {
                targetElement.classList.add('border-red-500', 'border-2');
                setTimeout(() => {
                    targetElement.classList.remove('border-red-500', 'border-2');
                }, 1000);
            }
            resetDragState();
            return;
        }

        // Obter o item arrastado
        const draggedItem = findItemById(items, finalDraggedId);
        if (!draggedItem) {
            resetDragState();
            return;
        }

        // Criar uma cópia dos itens sem o item arrastado
        const newItems = removeItemFromTree(items, finalDraggedId);
        let updatedItems: BOMItem[];

        // Processar de acordo com o tipo de operação
        if (dropTypeRef.current) {
            const { parentId, index } = dropTypeRef.current;
            updatedItems = insertItemAtPosition(newItems, parentId, draggedItem, index);

            // Garantir que o nó pai esteja expandido
            setExpanded((prev) => ({
                ...prev,
                [parentId]: true,
            }));
        } else {
            // Adição como filho: adicionar ao final dos filhos do alvo
            updatedItems = addChildToItem(newItems, targetId, draggedItem);

            // Expandir o nó alvo
            setExpanded((prev) => ({
                ...prev,
                [targetId]: true,
            }));
        }

        // Atualizar o estado
        setItems(updatedItems);

        // Limpar estado de drag
        resetDragState();
    };

    // Função auxiliar para resetar o estado de drag
    const resetDragState = () => {
        draggingRef.current = null;
        dropTypeRef.current = null;
        document.body.classList.remove('dragging-active');
    };

    // Function to handle edit item
    const handleEditItem = (item: BOMItem) => {
        setEditingItem({ ...item });
        setIsModalOpen(true);
    };

    // Function to save edited item
    const handleSaveEdit = () => {
        if (!editingItem) return;

        const updatedItems = updateItemsTree(items, editingItem.id, () => ({
            ...editingItem,
        }));

        setItems(updatedItems);
        setEditingItem(null);
        setIsModalOpen(false);
    };

    // Function to add new item
    const handleAddItem = (parentId: string) => {
        const parent = findItemById(items, parentId);
        if (!parent) return;

        const newId = `${parentId}-${parent.children.length + 1}`;

        const newItem: BOMItem = {
            id: newId,
            name: 'Novo Item',
            description: 'Descrição',
            quantity: 1,
            unit: 'ea',
            children: [],
        };

        setNewItemParentId(parentId);
        setEditingItem(newItem);
        setIsModalOpen(true);
    };

    // Function to save new item
    const handleSaveNewItem = () => {
        if (!editingItem || !newItemParentId) return;

        const updatedItems = addChildToItem(items, newItemParentId, editingItem);
        setItems(updatedItems);

        // Expand the parent to show the new item
        setExpanded((prev) => ({
            ...prev,
            [newItemParentId]: true,
        }));

        setEditingItem(null);
        setNewItemParentId(null);
        setIsModalOpen(false);
    };

    // Function to delete an item
    const handleDeleteItem = (id: string) => {
        // Don't allow deleting the root item
        if (id === '1') return;

        const updatedItems = removeItemFromTree(items, id);
        setItems(updatedItems);
    };

    // Function to export BOM as JSON
    const handleExportBOM = () => {
        const dataStr = JSON.stringify(items, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'bom.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    // Exporte a função handleExportBOM através do ref
    React.useImperativeHandle(ref, () => ({
        handleExportBOM,
    }));

    // Função para lidar com o cancelamento de edição/adição
    const handleCancelEdit = () => {
        setEditingItem(null);
        setNewItemParentId(null);
        setIsModalOpen(false);
    };

    // TreeItem component atualizado para incluir drop zones
    const TreeItem = ({
        node,
        depth = 0,
        isLast = true,
        parentConnectorLines = [],
    }: {
        node: BOMItem;
        depth?: number;
        isLast?: boolean;
        parentConnectorLines: boolean[];
    }) => {
        const isExpanded = expanded[node.id];
        const hasChildren = node.children && node.children.length > 0;

        // Create the connector lines for children of this node
        const childConnectorLines = [...parentConnectorLines];
        if (depth > 0) {
            // Add connector for this level: true if not last item, false otherwise
            childConnectorLines.push(!isLast);
        }

        return (
            <div className="w-full">
                {/* Drop zone para inserir antes deste item (exceto para o item raiz) */}
                {node.id !== '1' && (
                    <div
                        className="drop-zone mx-6 h-1 rounded transition-all hover:h-2 hover:bg-gray-200"
                        onDragOver={(e) => {
                            // Encontrar o ID do pai e o índice atual deste nó
                            const parentId = getParentId(items, node.id);
                            if (!parentId) return;

                            const currentIndex = getItemIndex(items, node.id);
                            handleDragOver(e, parentId, 'reorder', currentIndex);
                        }}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => {
                            if (dropTypeRef.current) {
                                handleDrop(e, dropTypeRef.current.parentId);
                            }
                        }}
                    ></div>
                )}

                <div className="flex">
                    {/* Display connector lines from parent levels */}
                    {parentConnectorLines.map((showLine, i) => (
                        <div key={`connector-${i}`} className="relative w-6">
                            {showLine && <div className="absolute top-0 left-3 h-full w-0 border-l-2 border-gray-300"></div>}
                        </div>
                    ))}

                    {/* Current level connector */}
                    {depth > 0 && (
                        <div className="relative w-6">
                            {/* Vertical line */}
                            <div className="absolute top-0 left-3 h-1/2 w-0 border-l-2 border-gray-300"></div>

                            {/* Horizontal line to the node */}
                            <div className="absolute top-1/2 left-3 w-3 border-t-2 border-gray-300"></div>

                            {/* Continue vertical line for non-last items */}
                            {!isLast && <div className="absolute top-1/2 left-3 h-1/2 w-0 border-l-2 border-gray-300"></div>}
                        </div>
                    )}

                    {/* Item content */}
                    <div
                        className="droppable-area flex-grow rounded border border-gray-200 p-2 hover:bg-gray-50"
                        data-draggable="true"
                        data-id={node.id}
                        onDragOver={(e) => handleDragOver(e, node.id, 'as-child')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, node.id)}
                    >
                        <div className="flex w-full items-center">
                            {/* Drag handle - agora com mousedown + dragstart */}
                            <div
                                className="drag-handle mr-2 cursor-grab p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                                draggable="true"
                                onMouseDown={(e) => handleItemMouseDown(e)}
                                onDragStart={() => handleDragStart(node.id)}
                                onDragEnd={handleDragEnd}
                                title="Arraste para reposicionar"
                            >
                                <GripVertical size={16} />
                            </div>

                            {hasChildren && (
                                <button className="mr-2 focus:outline-none" onClick={() => toggleExpand(node.id)}>
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                            )}
                            {!hasChildren && <div className="mr-2 w-6"></div>}

                            <div className="grid flex-grow grid-cols-12 gap-2">
                                <div className="col-span-3 font-medium">{node.name}</div>
                                <div className="col-span-4 text-gray-600">{node.description}</div>
                                <div className="col-span-2 text-center">
                                    {node.quantity} {node.unit}
                                </div>
                                <div className="col-span-3 flex justify-end gap-2">
                                    <button
                                        className="rounded p-1 text-blue-600 hover:bg-blue-100"
                                        onClick={() => handleEditItem(node)}
                                        title="Editar item"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        className="rounded p-1 text-green-600 hover:bg-green-100"
                                        onClick={() => handleAddItem(node.id)}
                                        title="Adicionar item filho"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    {node.id !== '1' && (
                                        <button
                                            className="rounded p-1 text-red-600 hover:bg-red-100"
                                            onClick={() => handleDeleteItem(node.id)}
                                            title="Remover item"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Render children */}
                {hasChildren && isExpanded && (
                    <div>
                        {node.children.map((child, index) => (
                            <TreeItem
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                isLast={index === node.children.length - 1}
                                parentConnectorLines={childConnectorLines}
                            />
                        ))}

                        {/* Drop zone para adicionar ao final dos filhos */}
                        <div className="flex">
                            {/* Espaço para as linhas de conexão */}
                            {[...childConnectorLines, false].map((showLine, i) => (
                                <div key={`last-connector-${i}`} className="relative w-6">
                                    {showLine && <div className="absolute top-0 left-3 h-full w-0 border-l-2 border-gray-300"></div>}
                                </div>
                            ))}

                            <div
                                className="drop-zone mx-4 h-2 flex-grow rounded transition-all hover:h-3 hover:bg-gray-200"
                                onDragOver={(e) => handleDragOver(e, node.id, 'reorder', node.children.length)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => {
                                    if (dropTypeRef.current) {
                                        handleDrop(e, dropTypeRef.current.parentId);
                                    }
                                }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="overflow-auto">
                <div className="mb-4 grid w-full grid-cols-12 gap-2 rounded-lg bg-gray-100 p-3 font-semibold">
                    <div className="col-span-3">Nome</div>
                    <div className="col-span-4">Descrição</div>
                    <div className="col-span-2 text-center">Quantidade</div>
                    <div className="col-span-3 text-right">Ações</div>
                </div>

                <div>
                    {items.map((item, index) => (
                        <TreeItem key={item.id} node={item} isLast={index === items.length - 1} parentConnectorLines={[]} />
                    ))}
                </div>
            </div>

            {/* Utilizar o componente ItemModal ao invés do modal inline */}
            {editingItem && (
                <ItemModal
                    editingItem={editingItem}
                    isNewItem={!!newItemParentId}
                    onCancel={handleCancelEdit}
                    onSave={newItemParentId ? handleSaveNewItem : handleSaveEdit}
                    setEditingItem={setEditingItem}
                    isOpen={isModalOpen}
                    onOpenChange={setIsModalOpen}
                />
            )}
        </div>
    );
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function BomConfig({ data, filters }: Props) {
    const visualBomRef = React.useRef<{ handleExportBOM: () => void }>(null);

    const handleExport = () => {
        visualBomRef.current?.handleExportBOM();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuração BOM" />

            <CreateLayout
                title="Configuração BOM"
                subtitle="Gerencie as configurações de BOM do sistema"
                breadcrumbs={breadcrumbs}
                backRoute="/items"
                onSave={handleExport}
                saveButtonText="Exportar BOM"
            >
                <VisualBOMBuilder ref={visualBomRef} />
            </CreateLayout>
        </AppLayout>
    );
}
