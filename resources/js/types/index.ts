export interface MachineType {
    id: number;
    name: string;
}

export interface Area {
    id: number;
    name: string;
    plant?: {
        id: number;
        name: string;
    };
}

export interface Equipment {
    id: number;
    tag: string;
    serial_number?: string;
    machine_type_id: number;
    description?: string;
    nickname?: string;
    manufacturer?: string;
    manufacturing_year?: number;
    area_id: number;
    photo_path?: string;
    machine_type?: MachineType;
    area?: Area;
}

export interface EquipmentForm {
    tag: string;
    serial_number: string;
    machine_type_id: string;
    description: string;
    nickname: string;
    manufacturer: string;
    manufacturing_year: string;
    area_id: string;
    photo: File | null;
    photo_path?: string | null;
} 