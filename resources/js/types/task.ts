export interface Task {
    id?: number;
    type: 'question' | 'multiple_choice' | 'multiple_select' | 'measurement' | 'photo' | 'code_reader' | 'file_upload';
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
    codeReaderType?: 'qr_code' | 'barcode';
    codeReaderInstructions?: string;
    fileUploadInstructions?: string;
    instructionImages: string[];
    required: boolean;
    isEditing?: boolean;
} 