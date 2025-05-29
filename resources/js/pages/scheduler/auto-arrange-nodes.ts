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

/**
 * Organiza automaticamente os nós em um layout horizontal ou vertical
 * @param nodes Lista de nós a serem organizados
 * @param edges Conexões entre os nós
 * @param direction Direção do layout ('horizontal' ou 'vertical')
 * @returns Lista de nós com posições atualizadas
 */
export function autoArrangeNodes(nodes: Node[], edges: Edge[], direction: string = 'horizontal'): Node[] {
    if (nodes.length === 0) return nodes;

    // Passo 1: Criar uma representação de grafo para análise
    const graph: Record<string, { id: string; inNodes: string[]; outNodes: string[]; level: number; lane: number; processed: boolean }> = {};
    nodes.forEach((node) => {
        graph[node.id] = {
            id: node.id,
            inNodes: [],
            outNodes: [],
            level: 0,
            lane: 0,
            processed: false,
        };
    });

    // Preencher conexões
    edges.forEach((edge) => {
        if (graph[edge.source]) {
            graph[edge.source].outNodes.push(edge.target);
        }
        if (graph[edge.target]) {
            graph[edge.target].inNodes.push(edge.source);
        }
    });

    // Passo 2: Encontrar nodes raiz (nodes sem conexões de entrada)
    const rootNodes = nodes.filter((node) => graph[node.id].inNodes.length === 0).map((node) => node.id);

    if (rootNodes.length === 0 && nodes.length > 0) {
        // Se nenhum node raiz for encontrado, mas temos nodes, use o primeiro como raiz
        rootNodes.push(nodes[0].id);
    }

    // Passo 3: Atribuir níveis usando travessia topológica (BFS)
    const queue = [...rootNodes];
    rootNodes.forEach((nodeId) => {
        graph[nodeId].level = 0;
    });

    let maxLevel = 0;

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId) continue; // Pular se for undefined

        const current = graph[currentId];

        // Processar todos os nodes de saída
        for (const outNodeId of current.outNodes) {
            const outNode = graph[outNodeId];

            // Calcular novo nível
            const newLevel = current.level + 1;

            // Atualizar apenas se o novo nível for maior (garante nivelamento adequado com ramificações)
            if (newLevel > outNode.level) {
                outNode.level = newLevel;
                maxLevel = Math.max(maxLevel, newLevel);
            }

            // Adicionar à fila se todos os nodes de entrada forem processados
            const allInNodesProcessed = outNode.inNodes.every((inNodeId) => graph[inNodeId].processed || inNodeId === currentId);

            if (allInNodesProcessed && !outNode.processed) {
                queue.push(outNodeId);
            }
        }

        current.processed = true;
    }

    // Redefinir flag de processamento para próxima travessia
    Object.values(graph).forEach((node) => {
        node.processed = false;
    });

    // Passo 4: Atribuir faixas para organizar processos paralelos
    // Usar outro BFS rastreando faixas
    let maxLane = 0;
    const laneQueue = [...rootNodes];

    rootNodes.forEach((nodeId, index) => {
        graph[nodeId].lane = index;
        maxLane = Math.max(maxLane, index);
    });

    while (laneQueue.length > 0) {
        const currentId = laneQueue.shift();
        if (!currentId) continue; // Pular se for undefined

        const current = graph[currentId];

        // Processar nodes de saída para atribuição de faixa
        for (const outNodeId of current.outNodes) {
            const outNode = graph[outNodeId];

            if (!outNode.processed) {
                // Se o node tiver múltiplas conexões de entrada, precisamos de tratamento especial
                if (outNode.inNodes.length > 1) {
                    const processedInNodesCount = outNode.inNodes.filter((inNodeId) => graph[inNodeId].processed || inNodeId === currentId).length;

                    // Processar apenas quando todos os nodes de entrada forem processados
                    if (processedInNodesCount === outNode.inNodes.length) {
                        // Para nodes com múltiplas entradas, calcular faixa como média das faixas de entrada
                        const inLanes = outNode.inNodes.map((inNodeId) => graph[inNodeId].lane);
                        const avgLane = inLanes.reduce((sum, lane) => sum + lane, 0) / inLanes.length;
                        outNode.lane = Math.round(avgLane);

                        // Garantir que não haja sobreposição verificando se a faixa já está ocupada neste nível
                        let laneTaken = true;
                        while (laneTaken) {
                            laneTaken = Object.values(graph).some((n) => n.id !== outNode.id && n.level === outNode.level && n.lane === outNode.lane);
                            if (laneTaken) outNode.lane++;
                        }

                        maxLane = Math.max(maxLane, outNode.lane);
                        laneQueue.push(outNodeId);
                        outNode.processed = true;
                    }
                } else {
                    // Para nodes normais, herdar a faixa do pai ou obter uma nova
                    outNode.lane = current.lane;

                    // Garantir que não haja sobreposição verificando se a faixa já está ocupada neste nível
                    let laneTaken = true;
                    while (laneTaken) {
                        laneTaken = Object.values(graph).some((n) => n.id !== outNode.id && n.level === outNode.level && n.lane === outNode.lane);
                        if (laneTaken) outNode.lane++;
                    }

                    maxLane = Math.max(maxLane, outNode.lane);
                    laneQueue.push(outNodeId);
                    outNode.processed = true;
                }
            }
        }
    }

    // Passo 5: Lidar com subgrafos desconectados (nodes sem conexões)
    nodes.forEach((node) => {
        if (!graph[node.id].processed && graph[node.id].inNodes.length === 0 && graph[node.id].outNodes.length === 0) {
            // Colocar nodes desconectados na parte inferior
            graph[node.id].level = maxLevel + 1;
            graph[node.id].lane = maxLane + 1;
            maxLane++;
        }
    });

    // Passo 6: Aplicar novas posições com base em níveis e faixas
    const nodeWidth = 300; // Largura do node + margem
    const nodeHeight = 150; // Altura do node + margem
    return nodes.map((node) => {
        const { level, lane } = graph[node.id];

        let newPosition;
        if (direction === 'horizontal') {
            // Layout horizontal: nível → x, faixa → y
            newPosition = {
                x: 50 + level * nodeWidth,
                y: 50 + lane * nodeHeight,
            };
        } else {
            // Layout vertical: faixa → x, nível → y
            newPosition = {
                x: 50 + lane * nodeWidth,
                y: 50 + level * nodeHeight,
            };
        }

        return {
            ...node,
            position: newPosition,
        };
    });
}
