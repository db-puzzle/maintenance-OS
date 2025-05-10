import { FileText, CheckSquare, ListChecks, Ruler, Camera, ScanBarcode, Upload, QrCode, Barcode, CircleCheck } from 'lucide-react';
import { UnitCategory, MeasurementUnit, MeasurementUnitCategories, MeasurementUnits, findUnitCategory } from './units';

export const TaskTypeGroups = {
    measurementGroup: [
        { 
            id: 1, 
            name: 'Medição', 
            icon: Ruler,
            label: 'Nome da Medição',
            placeholder: 'Diâmetro do Eixo, Pressão do Ar, Temperatura do Motor, etc...',
            value: 'measurement' as const
        },
        { 
            id: 2, 
            name: 'Pergunta e resposta', 
            icon: FileText,
            label: 'Pergunta',
            placeholder: 'Digite a pergunta que será respondida...',
            value: 'question' as const
        }
    ],
    questionGroup: [
        { 
            id: 3, 
            name: 'Múltipla escolha', 
            icon: CircleCheck,
            label: 'Pergunta de Múltipla Escolha',
            placeholder: 'Digite a pergunta para escolha da resposta...',
            value: 'multiple_choice' as const
        },
        { 
            id: 4, 
            name: 'Múltipla seleção', 
            icon: ListChecks,
            label: 'Pergunta de Múltipla Seleção',
            placeholder: 'Digite a pergunta para seleção das respostas...',
            value: 'multiple_select' as const
        }
    ],
    dataCollectionGroup: [
        { 
            id: 5, 
            name: 'Registro fotográfico', 
            icon: Camera,
            label: 'Foto',
            placeholder: 'Vista Geral do Equipamento, Condição da Bucha, etc...',
            value: 'photo' as const
        },
        { 
            id: 6, 
            name: 'Leitor de Código', 
            icon: ScanBarcode,
            label: 'Nome do Código',
            placeholder: 'Número Serial, Código do Produto, Número do Lote, etc...',
            value: 'code_reader' as const
        },
        { 
            id: 7, 
            name: 'Upload de Arquivo', 
            icon: Upload,
            label: 'Nome do Arquivo',
            placeholder: 'Relatório de Inspeção, Ficha Técnica, Manual de Instruções, etc...',
            value: 'file_upload' as const
        }
    ]
} as const;

export const TaskTypes = [
    ...TaskTypeGroups.measurementGroup,
    ...TaskTypeGroups.questionGroup,
    ...TaskTypeGroups.dataCollectionGroup
] as const;

// Inferir o tipo TaskType dos valores do TaskTypes
export type TaskType = typeof TaskTypes[number]['value'];

export const CodeReaderTypes = [
    { 
        id: 1,
        value: 'qr_code' as const,
        name: 'QR Code',
        icon: QrCode
    },
    { 
        id: 2,
        value: 'barcode' as const,
        name: 'Código de Barras',
        icon: Barcode
    }
] as const;

export enum TaskState {
    Editing = 'Editing',
    Previewing = 'Previewing',
    Responding = 'Responding',
    Viewing = 'Viewing'
}

// Utilizando o tipo de unidade de medição do arquivo units.ts
export interface Measurement {
    name: string;
    min?: number;
    target?: number;
    max?: number;
    unit: typeof MeasurementUnits[number];
    category: UnitCategory;
}

export const DefaultMeasurement: Measurement = {
    name: 'Medição',
    min: undefined,
    target: undefined,
    max: undefined,
    unit: 'mm',
    category: 'Comprimento'
} as const;

export interface Task {
    id: string;
    type: TaskType;
    taskType?: TaskType;
    description: string;
    isRequired: boolean;
    options?: string[];
    measurement?: Measurement;
    codeReaderType?: (typeof CodeReaderTypes)[number]['value'];
    codeReaderInstructions?: string;
    fileUploadInstructions?: string;
    instructionImages: string[];
    state?: TaskState;
}

export const DefaultTaskValues = {
    description: '',
    isRequired: true,
    instructionImages: [] as string[],
    options: [] as string[],
    measurement: DefaultMeasurement
} as const;

// Operações de Tarefas
export const TaskOperations = {
    create: (
        id: string,
        type: TaskType,
        description: string = DefaultTaskValues.description,
        isRequired: boolean = DefaultTaskValues.isRequired
    ): Task => ({
        id,
        type,
        taskType: type,
        description,
        isRequired,
        instructionImages: DefaultTaskValues.instructionImages,
        options: DefaultTaskValues.options,
        measurement: DefaultTaskValues.measurement,
        state: TaskState.Editing
    }),

    generateNextId: (tasks: Task[] | undefined): string => {
        if (!tasks || tasks.length === 0) return "1";
        
        // Encontra o maior ID numérico na lista atual
        const maxId = Math.max(...tasks.map(t => {
            const id = parseInt(t.id);
            return isNaN(id) ? 0 : id;
        }));
        
        // Retorna o próximo ID
        return (maxId + 1).toString();
    },

    createAtIndex: (
        tasks: Task[] | undefined,
        index: number,
        type: TaskType,
        description: string = DefaultTaskValues.description,
        isRequired: boolean = DefaultTaskValues.isRequired
    ): Task => {
        // Se não houver lista de tarefas ou ela estiver vazia
        if (!tasks || tasks.length === 0 || index < 0) {
            const newId = "1"; // Primeira tarefa sempre começa com ID 1
            const task = TaskOperations.create(newId, type, description, isRequired);
            
            // Se for uma tarefa de medição, garantir que tenha uma medição válida
            if (type === 'measurement' && !task.measurement) {
                task.measurement = { ...DefaultMeasurement };
            }
            
            return task;
        }

        // Se o índice for maior que o tamanho da lista, adiciona ao final
        if (index >= tasks.length) {
            const newId = TaskOperations.generateNextId(tasks);
            const task = TaskOperations.create(newId, type, description, isRequired);
            
            // Se for uma tarefa de medição, garantir que tenha uma medição válida
            if (type === 'measurement' && !task.measurement) {
                task.measurement = { ...DefaultMeasurement };
            }
            
            return task;
        }

        // Cria a nova tarefa com o próximo ID disponível
        const newId = TaskOperations.generateNextId(tasks);
        const task = TaskOperations.create(newId, type, description, isRequired);
        
        // Se for uma tarefa de medição, garantir que tenha uma medição válida
        if (type === 'measurement' && !task.measurement) {
            task.measurement = { ...DefaultMeasurement };
        }
        
        return task;
    },

    updateType: (task: Task, type: TaskType): Task => ({
        ...task,
        type,
        taskType: type
    }),

    updateRequired: (task: Task, isRequired: boolean): Task => ({
        ...task,
        isRequired
    }),

    addOption: (task: Task): Task => ({
        ...task,
        options: [...(task.options || []), '']
    }),

    removeOption: (task: Task, optionIndex: number): Task => ({
        ...task,
        options: (task.options || []).filter((_, index) => index !== optionIndex)
    }),

    updateOptions: (task: Task, options: string[]): Task => ({
        ...task,
        options
    }),

    updateMeasurement: (
        task: Task,
        measurement: Measurement
    ): Task => ({
        ...task,
        measurement
    }),

    convertTaskState: (task: Task): Task => {
        const updatedTask = {
            ...task,
            options: task.options || [],
            isRequired: task.isRequired,
            taskType: task.type,
            instructionImages: task.instructionImages || [],
        };

        // Garantir que tarefas de medição tenham uma medição válida
        if (task.type === 'measurement') {
            updatedTask.measurement = task.measurement || { ...DefaultMeasurement };
        }

        return updatedTask;
    },

    // Métodos de gerenciamento de estado
    setEditing: (task: Task): Task => ({
        ...task,
        state: TaskState.Editing
    }),

    setPreviewing: (task: Task): Task => ({
        ...task,
        state: TaskState.Previewing
    }),

    setResponding: (task: Task): Task => ({
        ...task,
        state: TaskState.Responding
    }),

    setViewing: (task: Task): Task => ({
        ...task,
        state: TaskState.Viewing
    }),

    // Verificadores de estado
    isEditing: (task: Task): boolean => 
        task.state === TaskState.Editing,

    isPreviewing: (task: Task): boolean => 
        task.state === TaskState.Previewing,

    isResponding: (task: Task): boolean => 
        task.state === TaskState.Responding,

    isViewing: (task: Task): boolean => 
        task.state === TaskState.Viewing || task.state === undefined
} as const; 