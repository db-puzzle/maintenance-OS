import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowDown, ArrowRight, HelpCircle, LayoutGrid, Move, PlusCircle, Save, Trash2, X } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { autoArrangeNodes } from './auto-arrange-nodes';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Programação',
        href: '/scheduler',
    },
    {
        title: 'Editor de Rotas',
        href: '/scheduler/route-editor',
    },
];

// Tipos para workcells e nodes
interface Workcell {
    id: string;
    name: string;
    color: string;
    custom?: boolean;
}

interface Node {
    id: string;
    type: string;
    name: string;
    color: string;
    position: {
        x: number;
        y: number;
    };
}

interface Edge {
    id: string;
    source: string;
    target: string;
}

interface DraggingNode {
    id: string;
    offsetX: number;
    offsetY: number;
}

interface Position {
    x: number;
    y: number;
}

// Sample workcells that could be added to the manufacturing sequence
const AVAILABLE_WORKCELLS: Workcell[] = [
    { id: 'cutting', name: 'Estação de Corte', color: '#e9d8fd' },
    { id: 'welding', name: 'Estação de Solda', color: '#feebc8' },
    { id: 'assembly', name: 'Linha de Montagem', color: '#c6f6d5' },
    { id: 'painting', name: 'Cabine de Pintura', color: '#bee3f8' },
    { id: 'quality', name: 'Controle de Qualidade', color: '#fed7d7' },
    { id: 'packaging', name: 'Área de Embalagem', color: '#e2e8f0' },
    { id: 'cnc', name: 'Máquina CNC', color: '#fbd38d' },
    { id: 'molding', name: 'Moldagem por Injeção', color: '#b2f5ea' },
];

// Available colors for custom workcells
const WORKCELL_COLORS = [
    '#e9d8fd',
    '#feebc8',
    '#c6f6d5',
    '#bee3f8',
    '#fed7d7',
    '#e2e8f0',
    '#fbd38d',
    '#b2f5ea',
    '#feb2b2',
    '#fbd5e5',
    '#c4f1f9',
    '#b2f5ea',
    '#c3dafe',
    '#e9d8fd',
    '#fefcbf',
];

export default function RouteEditor() {
    // Estados para nodes (workcells) e edges (connections)
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [nextNodeId, setNextNodeId] = useState(1);

    // Estados para operações ativas
    const [draggingNode, setDraggingNode] = useState<DraggingNode | null>(null);
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
    const [jsonOutput, setJsonOutput] = useState('');
    const [showOutput, setShowOutput] = useState(false);
    const [draggingWorkcell, setDraggingWorkcell] = useState<string | null>(null);
    // Overlay visual para indicar estado de arrasto
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [showAutoArrangeOptions, setShowAutoArrangeOptions] = useState(false);

    // Estado para criação de workcells personalizados
    const [customWorkcells, setCustomWorkcells] = useState<Workcell[]>([]);
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [newWorkcellName, setNewWorkcellName] = useState('');
    const [newWorkcellColor, setNewWorkcellColor] = useState(WORKCELL_COLORS[0]);

    // Estado para rastrear posição do mouse durante a criação de conexão
    const [tempConnectionPos, setTempConnectionPos] = useState<Position>({ x: 0, y: 0 });

    // Referências
    const boardRef = useRef<HTMLDivElement>(null);

    // Efeito para escutar eventos de movimento do mouse durante criação de conexão
    React.useEffect(() => {
        const handleTempConnectionMouseMove = (e: any) => {
            if (e.detail) {
                setTempConnectionPos({ x: e.detail.x, y: e.detail.y });
            }
        };

        document.addEventListener('mousemove:temp-connection', handleTempConnectionMouseMove);

        return () => {
            document.removeEventListener('mousemove:temp-connection', handleTempConnectionMouseMove);
        };
    }, []);

    // Efeito para configurar eventos de drag and drop
    React.useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            // Isso é necessário para eventos de arrasto funcionarem em vários navegadores
            e.preventDefault();
        };

        // Adicionar manipulador de dragover global para garantir que o arrasto funcione em toda aplicação
        document.addEventListener('dragover', handleDragOver);

        return () => {
            document.removeEventListener('dragover', handleDragOver);
        };
    }, []);

    // Adicionar um workcell personalizado
    const addCustomWorkcell = () => {
        if (!newWorkcellName.trim()) return;

        const id = `custom-${Date.now()}`;
        const newCustomWorkcell: Workcell = {
            id,
            name: newWorkcellName.trim(),
            color: newWorkcellColor,
            custom: true,
        };

        setCustomWorkcells([...customWorkcells, newCustomWorkcell]);
        setNewWorkcellName('');
        setShowCustomForm(false);
    };

    // Calcular linha de conexão temporária ao criar uma conexão
    const getTempConnectionPath = () => {
        if (!connectingFrom) return null;

        const sourceNode = nodes.find((n) => n.id === connectingFrom);
        if (!sourceNode) return null;

        // Obter centro da origem
        const sourcePos = {
            x: sourceNode.position.x + 100, // centro x
            y: sourceNode.position.y + 40, // centro y
        };

        // Calcular ângulo para seta
        const dx = tempConnectionPos.x - sourcePos.x;
        const dy = tempConnectionPos.y - sourcePos.y;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        // Desenhar apenas uma linha tracejada reta
        return {
            path: `M${sourcePos.x},${sourcePos.y} L${tempConnectionPos.x},${tempConnectionPos.y}`,
            angle: angle,
            source: sourcePos,
            target: tempConnectionPos,
        };
    };

    // Adicionar um novo node workcell ao board
    const addNode = (workcellType: string, position: Position | null = null) => {
        // Encontrar entre workcells padrão ou personalizados
        let workcell = AVAILABLE_WORKCELLS.find((wc) => wc.id === workcellType);

        if (!workcell) {
            // Procurar nos workcells personalizados
            const customWorkcell = customWorkcells.find((wc) => wc.id === workcellType);
            if (customWorkcell) {
                workcell = customWorkcell;
            } else {
                return; // Se não encontrar, retornar sem adicionar
            }
        }

        // Usar posição fornecida ou padrão
        const nodePosition = position || {
            x: Math.random() * 200 + 50,
            y: Math.random() * 200 + 50,
        };

        const newNode: Node = {
            id: `node-${nextNodeId}`,
            type: workcellType,
            name: workcell.name,
            color: workcell.color,
            position: nodePosition,
        };

        setNodes([...nodes, newNode]);
        setNextNodeId(nextNodeId + 1);
    };

    // Iniciar arrasto de node
    const handleNodeDragStart = (e: any, nodeId: string) => {
        e.stopPropagation();
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;

        // Calcular offset relativo ao node, não ao cursor
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        setDraggingNode({
            id: nodeId,
            offsetX,
            offsetY,
        });
    };

    // Gerenciar movimento do mouse no board
    const handleMouseMove = useCallback(
        (e: any) => {
            const boardRect = boardRef.current?.getBoundingClientRect();
            if (!boardRect) return;

            if (draggingNode) {
                // Atualizar posição do node
                const x = e.clientX - boardRect.left - draggingNode.offsetX;
                const y = e.clientY - boardRect.top - draggingNode.offsetY;

                setNodes(nodes.map((node) => (node.id === draggingNode.id ? { ...node, position: { x, y } } : node)));
            }

            // Atualizar posição da linha de conexão temporária ao criar uma conexão
            if (connectingFrom) {
                // Atualizar a posição diretamente em vez de usar eventos personalizados
                setTempConnectionPos({
                    x: e.clientX - boardRect.left,
                    y: e.clientY - boardRect.top,
                });
            }
        },
        [draggingNode, nodes, connectingFrom],
    );

    // Gerenciar mouse up - potencialmente finalizando uma conexão
    const handleMouseUp = (e: any) => {
        if (draggingNode) {
            setDraggingNode(null);
            return;
        }

        // Verificar se estamos criando uma conexão
        if (connectingFrom) {
            // Obter coordenadas de posição relativas ao board
            const boardRect = boardRef.current?.getBoundingClientRect();
            if (!boardRect) return;

            const mouseX = e.clientX - boardRect.left;
            const mouseY = e.clientY - boardRect.top;

            // Verificar cada node para ver se o mouse está sobre ele
            const targetNode = nodes.find((node) => {
                if (node.id === connectingFrom) return false; // Pular node de origem

                const nodeLeft = node.position.x;
                const nodeRight = node.position.x + 200; // largura do node
                const nodeTop = node.position.y;
                const nodeBottom = node.position.y + 80; // altura do node

                return mouseX >= nodeLeft && mouseX <= nodeRight && mouseY >= nodeTop && mouseY <= nodeBottom;
            });

            if (targetNode) {
                // Completar a conexão com o node alvo
                handleConnectionEnd(targetNode.id);
            } else {
                // Cancelar a tentativa de conexão
                setConnectingFrom(null);
            }
        }
    };

    // Iniciar conexão entre nodes
    const handleConnectionStart = (e: any, nodeId: string) => {
        e.stopPropagation();
        e.preventDefault();

        // Inicializar com a posição atual do mouse
        const boardRect = boardRef.current?.getBoundingClientRect();
        if (!boardRect) return;

        setTempConnectionPos({
            x: e.clientX - boardRect.left,
            y: e.clientY - boardRect.top,
        });

        setConnectingFrom(nodeId);
    };

    // Completar uma conexão entre nodes
    const handleConnectionEnd = (targetNodeId: string) => {
        if (!connectingFrom || connectingFrom === targetNodeId) {
            setConnectingFrom(null);
            return;
        }

        // Verificar conexões existentes em qualquer direção entre esses nodes
        const existingConnection = edges.some(
            (edge) =>
                (edge.source === connectingFrom && edge.target === targetNodeId) || (edge.source === targetNodeId && edge.target === connectingFrom),
        );

        // Se já existe uma conexão em qualquer direção, não criar outra
        if (existingConnection) {
            // Cancelar a tentativa de conexão e mostrar uma mensagem
            setConnectingFrom(null);
            toast.error(
                'Já existe uma conexão entre estes postos de trabalho. Apenas uma conexão é permitida entre quaisquer dois postos de trabalho.',
            );
            return;
        }

        // Criar a nova conexão
        const newEdge: Edge = {
            id: `edge-${connectingFrom}-${targetNodeId}-${Date.now()}`,
            source: connectingFrom,
            target: targetNodeId,
        };

        setEdges([...edges, newEdge]);
        setConnectingFrom(null);
    };

    // Excluir um node e suas conexões
    const deleteNode = (nodeId: string) => {
        setNodes(nodes.filter((node) => node.id !== nodeId));
        setEdges(edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    };

    // Excluir uma conexão
    const deleteEdge = (edgeId: string) => {
        setEdges(edges.filter((edge) => edge.id !== edgeId));
    };

    // Calcular posição para linhas de conexão
    const getNodeCenter = (nodeId: string): Position => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return { x: 0, y: 0 };

        return {
            x: node.position.x + 100, // Metade da largura do node (200)
            y: node.position.y + 40, // Metade da altura do node (80)
        };
    };

    // Renderizar setas de conexão ao longo de um caminho
    const renderConnectionArrows = (sourcePos: Position, targetPos: Position) => {
        // Calcular ângulo para seta
        const angle = (Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x) * 180) / Math.PI;

        // Calcular distância entre nodes para colocar marcadores
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calcular posições para indicadores de direção - garantir pelo menos 2 setas para qualquer conexão
        const numArrows = Math.max(2, Math.min(Math.floor(distance / 40), 5)); // 2-5 setas com base na distância
        const arrowElements: React.ReactNode[] = [];

        for (let i = 1; i <= numArrows; i++) {
            const ratio = i / (numArrows + 1);
            const arrowX = sourcePos.x + dx * ratio;
            const arrowY = sourcePos.y + dy * ratio;

            // Criar setas mais visíveis com fundo
            arrowElements.push(
                <g key={`arrow-${i}`}>
                    {/* Fundo branco para melhor visibilidade */}
                    <polygon
                        points="-12,-7 0,0 -12,7"
                        fill="white"
                        stroke="white"
                        strokeWidth="1"
                        transform={`translate(${arrowX},${arrowY}) rotate(${angle})`}
                    />
                    {/* Primeiro plano da seta */}
                    <polygon points="-10,-6 0,0 -10,6" fill="#2563eb" transform={`translate(${arrowX},${arrowY}) rotate(${angle})`} />
                </g>,
            );
        }

        return {
            arrowElements,
            angle,
        };
    };

    // Organizar os nodes no espaço de trabalho de forma limpa
    const handleAutoArrangeNodes = (direction: string = 'horizontal') => {
        if (nodes.length === 0) return;

        const updatedNodes = autoArrangeNodes(nodes, edges, direction);
        setNodes(updatedNodes);
    };

    // Gerar saída JSON da sequência de fabricação
    const generateOutput = () => {
        // Coletar todos os tipos de workcell usados no diagrama
        const usedWorkcellTypes = new Set(nodes.map((node) => node.type));

        // Criar um dicionário de tipos de workcell
        const workcellTypes: Record<string, { name: string; color: string; custom?: boolean }> = {};

        // Adicionar workcells padrão que são usados
        AVAILABLE_WORKCELLS.forEach((wc) => {
            if (usedWorkcellTypes.has(wc.id)) {
                workcellTypes[wc.id] = {
                    name: wc.name,
                    color: wc.color,
                };
            }
        });

        // Adicionar workcells personalizados que são usados
        customWorkcells.forEach((wc) => {
            if (usedWorkcellTypes.has(wc.id)) {
                workcellTypes[wc.id] = {
                    name: wc.name,
                    color: wc.color,
                    custom: true,
                };
            }
        });

        const output = {
            workcellTypes,
            workcells: nodes.map((node) => ({
                id: node.id,
                type: node.type,
                name: node.name,
                position: node.position,
            })),
            connections: edges.map((edge) => ({
                source: edge.source,
                target: edge.target,
            })),
        };

        setJsonOutput(JSON.stringify(output, null, 2));
        setShowOutput(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editor de Rotas" />

            <div className="flex h-full flex-col">
                {/* Toolbar */}
                <div className="flex border-b border-gray-200 bg-gray-100 p-4">
                    <div className="flex-1">
                        <h2 className="font-bold">Editor de Sequência de Produção</h2>
                        <p className="text-sm text-gray-600">Arraste e solte postos de trabalho para desenhar sua sequência de produção</p>
                    </div>
                    <div className="flex space-x-2">
                        <div className="relative">
                            <Button
                                variant="outline"
                                onClick={() => setShowAutoArrangeOptions(!showAutoArrangeOptions)}
                                className="flex items-center gap-1"
                            >
                                <LayoutGrid size={16} />
                                <span>Auto Organizar</span>
                            </Button>

                            {showAutoArrangeOptions && (
                                <div className="absolute right-0 z-50 mt-1 w-48 rounded border border-gray-200 bg-white shadow-lg">
                                    <Button
                                        variant="ghost"
                                        className="h-auto w-full justify-start px-3 py-2"
                                        onClick={() => {
                                            handleAutoArrangeNodes('horizontal');
                                            setShowAutoArrangeOptions(false);
                                        }}
                                    >
                                        <ArrowRight size={16} className="mr-2" /> Fluxo Horizontal
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="h-auto w-full justify-start px-3 py-2"
                                        onClick={() => {
                                            handleAutoArrangeNodes('vertical');
                                            setShowAutoArrangeOptions(false);
                                        }}
                                    >
                                        <ArrowDown size={16} className="mr-2" /> Fluxo Vertical
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Button variant="default" onClick={generateOutput} className="flex items-center gap-1">
                            <Save size={16} />
                            <span>Salvar Sequência</span>
                        </Button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar com workcells disponíveis */}
                    <div className="w-64 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4">
                        <h3 className="mb-3 font-semibold">Postos de Trabalho Disponíveis</h3>

                        {/* Workcells padrão */}
                        {AVAILABLE_WORKCELLS.map((workcell) => (
                            <div
                                key={workcell.id}
                                className={`mb-2 flex cursor-move items-center rounded border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 ${draggingWorkcell === workcell.id ? 'border-blue-500 opacity-50' : ''}`}
                                draggable="true"
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', workcell.id);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    setDraggingWorkcell(workcell.id);
                                }}
                                onDragEnd={() => setDraggingWorkcell(null)}
                                style={{ borderLeftWidth: '4px', borderLeftColor: workcell.color }}
                            >
                                <div className="flex-1">{workcell.name}</div>
                                <Move size={16} className="text-gray-500" />
                            </div>
                        ))}

                        {/* Workcells personalizados */}
                        {customWorkcells.length > 0 && (
                            <>
                                {customWorkcells.map((workcell) => (
                                    <div
                                        key={workcell.id}
                                        className={`mb-2 flex cursor-move items-center rounded border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 ${draggingWorkcell === workcell.id ? 'border-blue-500 opacity-50' : ''}`}
                                        draggable="true"
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', workcell.id);
                                            e.dataTransfer.effectAllowed = 'copy';
                                            setDraggingWorkcell(workcell.id);
                                        }}
                                        onDragEnd={() => setDraggingWorkcell(null)}
                                        style={{ borderLeftWidth: '4px', borderLeftColor: workcell.color }}
                                    >
                                        <div className="flex-1">{workcell.name}</div>
                                        <Move size={16} className="text-gray-500" />
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Botão para adicionar workcell personalizado */}
                        {!showCustomForm ? (
                            <Button
                                variant="outline"
                                className="mt-3 w-full border-green-300 bg-green-50 py-5 text-green-800 hover:bg-green-100"
                                onClick={() => setShowCustomForm(true)}
                            >
                                <PlusCircle size={16} className="mr-2" /> Adicionar Posto de Trabalho
                            </Button>
                        ) : (
                            <div className="mt-3 rounded border border-gray-200 bg-white p-3">
                                <h4 className="mb-2 font-medium">Novo Posto de Trabalho</h4>
                                <input
                                    type="text"
                                    className="mb-2 w-full rounded border border-gray-300 p-2"
                                    placeholder="Nome do posto de trabalho"
                                    value={newWorkcellName}
                                    onChange={(e) => setNewWorkcellName(e.target.value)}
                                />

                                <div className="mb-2">
                                    <label className="mb-1 block text-sm">Cor:</label>
                                    <div className="flex flex-wrap gap-1">
                                        {WORKCELL_COLORS.map((color, index) => (
                                            <div
                                                key={index}
                                                className={`h-6 w-6 cursor-pointer rounded-full border ${newWorkcellColor === color ? 'border-black' : 'border-gray-300'}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setNewWorkcellColor(color)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="default" className="flex-1 bg-green-600 hover:bg-green-700" onClick={addCustomWorkcell}>
                                        Criar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            setShowCustomForm(false);
                                            setNewWorkcellName('');
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="flex w-full items-center justify-center gap-2">
                                        <HelpCircle size={16} />
                                        <span>Instruções de Uso</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Instruções do Editor de Rotas</DialogTitle>
                                    </DialogHeader>
                                    <div className="mt-4">
                                        <h3 className="mb-2 font-semibold">Como usar:</h3>
                                        <ul className="space-y-2 text-sm text-gray-600">
                                            <li className="flex items-start gap-2">
                                                <div className="mt-0.5 rounded bg-blue-100 p-1 text-blue-600">1</div>
                                                <span>Arraste postos da barra lateral para o quadro</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="mt-0.5 rounded bg-blue-100 p-1 text-blue-600">2</div>
                                                <span>Crie postos personalizados conforme necessário</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="mt-0.5 rounded bg-blue-100 p-1 text-blue-600">3</div>
                                                <span>Arraste postos existentes para reposicioná-los</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="mt-0.5 rounded bg-blue-100 p-1 text-blue-600">4</div>
                                                <span>Arraste a partir do ponto azul para criar conexões</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="mt-0.5 rounded bg-blue-100 p-1 text-blue-600">5</div>
                                                <span>Apenas uma conexão permitida entre quaisquer dois postos</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="mt-0.5 rounded bg-blue-100 p-1 text-blue-600">6</div>
                                                <span>Use Auto Organizar para layouts horizontais ou verticais</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="mt-0.5 rounded bg-blue-100 p-1 text-blue-600">7</div>
                                                <span>As setas em negrito mostram a direção do fluxo</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <div className="mt-0.5 rounded bg-blue-100 p-1 text-blue-600">8</div>
                                                <span>Clique em "Salvar Sequência" para gerar JSON</span>
                                            </li>
                                        </ul>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div
                        className={`relative flex-1 overflow-auto bg-gray-50 transition-all duration-200 ${isDraggingOver ? 'scale-[0.99] border-2 border-dashed border-blue-300 bg-blue-50' : ''}`}
                        ref={boardRef}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => {
                            setDraggingNode(null);
                            setConnectingFrom(null);
                        }}
                        style={{ userSelect: 'none' }}
                        onDragOver={(e) => {
                            // This is needed for drag events to work in many browsers
                            e.preventDefault();
                            // Set dropEffect to show it's a copy operation
                            e.dataTransfer.dropEffect = 'copy';
                            setIsDraggingOver(true);
                        }}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            setIsDraggingOver(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDraggingOver(false);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingOver(false);

                            // Get the workcell type from the dataTransfer
                            const workcellType = e.dataTransfer.getData('text/plain');

                            if (workcellType) {
                                // Calculate drop position relative to the board
                                const boardRect = boardRef.current?.getBoundingClientRect();
                                if (!boardRect) return;

                                const x = e.clientX - boardRect.left;
                                const y = e.clientY - boardRect.top;

                                // Add the node at the drop position
                                addNode(workcellType, { x, y });

                                // Mostrar feedback visual
                                toast.success('Posto de trabalho adicionado');
                            }
                        }}
                    >
                        {/* Mensagem de ajuda quando estiver arrastando */}
                        {isDraggingOver && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="rounded-lg bg-white p-4 text-center shadow-lg">
                                    <Move size={32} className="mx-auto mb-2 text-blue-500" />
                                    <p className="text-lg font-medium">Solte para adicionar o posto de trabalho</p>
                                </div>
                            </div>
                        )}

                        {/* Camada SVG para conexões */}
                        <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 1 }}>
                            {/* Conexões existentes */}
                            {edges.map((edge) => {
                                const sourceNode = nodes.find((n) => n.id === edge.source);
                                const targetNode = nodes.find((n) => n.id === edge.target);

                                if (!sourceNode || !targetNode) return null;

                                // Obter posições de origem e destino
                                const sourcePos = getNodeCenter(edge.source);

                                const targetPos = getNodeCenter(edge.target);

                                // Obter setas e ângulo
                                const { arrowElements, angle } = renderConnectionArrows(sourcePos, targetPos);

                                return (
                                    <g key={edge.id}>
                                        {/* Caminho com cor gradiente */}
                                        <defs>
                                            <linearGradient
                                                id={`gradient-${edge.id}`}
                                                gradientUnits="userSpaceOnUse"
                                                x1={sourcePos.x}
                                                y1={sourcePos.y}
                                                x2={targetPos.x}
                                                y2={targetPos.y}
                                            >
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#1d4ed8" />
                                            </linearGradient>
                                        </defs>

                                        <path
                                            d={`M${sourcePos.x},${sourcePos.y} L${targetPos.x},${targetPos.y}`}
                                            stroke={`url(#gradient-${edge.id})`}
                                            strokeWidth="3"
                                            fill="none"
                                        />

                                        {/* Indicadores de direção ao longo do caminho */}
                                        {arrowElements}

                                        {/* Seta final no destino - maior e mais visível */}
                                        <g>
                                            {/* Contorno branco para melhor visibilidade */}
                                            <polygon
                                                points="-16,-9 0,0 -16,9"
                                                fill="white"
                                                stroke="white"
                                                strokeWidth="1"
                                                transform={`translate(${targetPos.x},${targetPos.y}) rotate(${angle})`}
                                            />
                                            {/* Primeiro plano da seta */}
                                            <polygon
                                                points="-14,-8 0,0 -14,8"
                                                fill="#1d4ed8"
                                                transform={`translate(${targetPos.x},${targetPos.y}) rotate(${angle})`}
                                            />
                                        </g>

                                        {/* Indicador de origem - círculo maior com contorno */}
                                        <circle cx={sourcePos.x} cy={sourcePos.y} r={5} fill="white" stroke="#3b82f6" strokeWidth="2" />

                                        {/* Botão para excluir edge */}
                                        <foreignObject
                                            x={(sourcePos.x + targetPos.x) / 2 - 10}
                                            y={(sourcePos.y + targetPos.y) / 2 - 10}
                                            width="20"
                                            height="20"
                                        >
                                            <div
                                                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-red-100"
                                                onClick={() => deleteEdge(edge.id)}
                                            >
                                                <X size={12} className="text-red-500" />
                                            </div>
                                        </foreignObject>
                                    </g>
                                );
                            })}

                            {/* Conexão ativa sendo criada */}
                            {connectingFrom &&
                                (() => {
                                    const tempPath = getTempConnectionPath();

                                    if (!tempPath) return null;

                                    // Calcular distância para criar setas intermediárias
                                    const dx = tempPath.target.x - tempPath.source.x;
                                    const dy = tempPath.target.y - tempPath.source.y;
                                    const distance = Math.sqrt(dx * dx + dy * dy);

                                    if (distance < 30) return null; // Não desenhar se estiver muito próximo

                                    // Obter setas para a conexão temporária
                                    const { arrowElements } = renderConnectionArrows(tempPath.source, tempPath.target);

                                    return (
                                        <g>
                                            {/* Linha tracejada */}
                                            <path d={tempPath.path} stroke="#2563eb" strokeWidth="3" strokeDasharray="6" fill="none" />

                                            {/* Indicador de origem - círculo com contorno */}
                                            <circle
                                                cx={tempPath.source.x}
                                                cy={tempPath.source.y}
                                                r={5}
                                                fill="white"
                                                stroke="#3b82f6"
                                                strokeWidth="2"
                                            />

                                            {/* Setas de direção ao longo do caminho */}
                                            {arrowElements}

                                            {/* Seta no final - maior e mais visível */}
                                            <g>
                                                {/* Contorno branco */}
                                                <polygon
                                                    points="-16,-9 0,0 -16,9"
                                                    fill="white"
                                                    stroke="white"
                                                    strokeWidth="1"
                                                    transform={`translate(${tempPath.target.x},${tempPath.target.y}) rotate(${tempPath.angle})`}
                                                />
                                                {/* Seta azul */}
                                                <polygon
                                                    points="-14,-8 0,0 -14,8"
                                                    fill="#1d4ed8"
                                                    transform={`translate(${tempPath.target.x},${tempPath.target.y}) rotate(${tempPath.angle})`}
                                                />
                                            </g>
                                        </g>
                                    );
                                })()}
                        </svg>

                        {/* Elementos de node */}
                        {nodes.map((node) => (
                            <div
                                key={node.id}
                                className="absolute flex cursor-move flex-col rounded-md border bg-white shadow-md"
                                style={{
                                    left: node.position.x,
                                    top: node.position.y,
                                    width: '200px',
                                    height: '100px',
                                    zIndex: draggingNode?.id === node.id ? 100 : 10,
                                }}
                                onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                                draggable="false"
                            >
                                <div
                                    className="flex items-center justify-between border-b p-2"
                                    style={{ backgroundColor: node.color + '30' }}
                                    draggable="false"
                                >
                                    <span className="font-regular truncate" draggable="false">
                                        {node.name}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteNode(node.id)}
                                        className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                                <div className="flex flex-col p-2 text-sm text-gray-600" draggable="false">
                                    <span draggable="false">ID: {node.id}</span>
                                    <span className="text-xs text-gray-500" draggable="false">
                                        Entrada: {edges.filter((e) => e.target === node.id).length} / Saída:{' '}
                                        {edges.filter((e) => e.source === node.id).length}
                                    </span>
                                </div>

                                {/* Alça de conexão - área ampla clicável com indicador visual */}
                                <div
                                    className="absolute h-10 w-full cursor-pointer"
                                    style={{ bottom: '-10px', left: '0', zIndex: 20 }}
                                    onMouseDown={(e) => handleConnectionStart(e, node.id)}
                                    draggable="false"
                                >
                                    {/* Indicador visual no meio */}
                                    <div
                                        className="absolute flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-500"
                                        style={{ bottom: '0', left: '50%', transform: 'translateX(-50%)' }}
                                        draggable="false"
                                    >
                                        <div className="h-2 w-2 rounded-full bg-white" draggable="false"></div>
                                    </div>
                                </div>

                                {/* Área alvo de conexão (mostrar apenas se estiver conectando) */}
                                {connectingFrom && connectingFrom !== node.id && (
                                    <div className="absolute inset-0 z-30 border-2 border-blue-400 bg-blue-100 opacity-30" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal de Saída JSON */}
                {showOutput && (
                    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
                        <div className="flex max-h-2/3 w-2/3 flex-col rounded-lg bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b p-4">
                                <h3 className="font-bold">JSON da Sequência de Produção</h3>
                                <Button variant="ghost" size="icon" onClick={() => setShowOutput(false)} className="h-8 w-8">
                                    <X size={18} />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                                <pre className="overflow-auto rounded border border-gray-200 bg-gray-50 p-4 text-sm">{jsonOutput}</pre>
                            </div>
                            <div className="flex justify-end border-t p-4">
                                <Button variant="outline" className="mr-2" onClick={() => setShowOutput(false)}>
                                    Fechar
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={() => {
                                        navigator.clipboard.writeText(jsonOutput);
                                        toast.success('JSON copiado para a área de transferência!');
                                    }}
                                >
                                    Copiar para Área de Transferência
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
