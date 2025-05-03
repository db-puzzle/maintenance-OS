export interface Task {
    id?: number;
    type: 'question' | 'multiple_choice' | 'multiple_select' | 'measurement' | 'photo';
    description: string;
    options?: string[];
    measurementPoints?: {
        name: string;
        min: number;
        target: number;
        max: number;
        unit: string;
    }[];
    photoInstructions?: string;
    instructionImages: string[];
    required: boolean;
    isEditing?: boolean;
} 