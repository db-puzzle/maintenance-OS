import React, { useEffect, useRef } from 'react';
import { BaseEntitySheet } from '@/components/BaseEntitySheet';
import { TextInput } from '@/components/TextInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkCell } from '@/types/production';
interface WorkCellForm {
    [key: string]: string | number | boolean | null | undefined;
    name: string;
    description: string;
    cell_type: string;
    available_hours_per_day: number;
    efficiency_percentage: number;
    shift_id: string;
    plant_id: string;
    area_id: string;
    sector_id: string;
    manufacturer_id: string;
    is_active: boolean;
}
interface CreateWorkCellSheetProps {
    workCell?: WorkCell;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    onSuccess?: () => void;
}
const CreateWorkCellSheet: React.FC<CreateWorkCellSheetProps> = ({ workCell, open, onOpenChange, mode, onSuccess }) => {
    const nameInputRef = useRef<HTMLInputElement>(null);
    // Auto-focus the name input when sheet opens for creation
    useEffect(() => {
        if (open && mode === 'create') {
            // Use requestAnimationFrame to ensure the DOM is ready
            const focusInput = () => {
                requestAnimationFrame(() => {
                    if (nameInputRef.current) {
                        nameInputRef.current.focus();
                        nameInputRef.current.select();
                    }
                });
            };
            // Try multiple times with increasing delays to handle animation and focus traps
            const timeouts = [100, 300, 500];
            const timers = timeouts.map((delay) => setTimeout(focusInput, delay));
            // Cleanup timeouts
            return () => {
                timers.forEach((timer) => clearTimeout(timer));
            };
        }
    }, [open, mode]);
    // Handle onOpenChange to focus when sheet opens
    const handleOpenChange = (open: boolean) => {
        if (onOpenChange) {
            onOpenChange(open);
        }
        // Focus the input when opening in create mode
        if (open && mode === 'create') {
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 100);
        }
    };
    return (
        <BaseEntitySheet<WorkCellForm>
            entity={workCell}
            open={open}
            onOpenChange={handleOpenChange}
            mode={mode}
            onSuccess={onSuccess}
            formConfig={{
                initialData: {
                    name: '',
                    description: '',
                    cell_type: 'internal',
                    available_hours_per_day: 8,
                    efficiency_percentage: 85,
                    shift_id: '',
                    plant_id: '',
                    area_id: '',
                    sector_id: '',
                    manufacturer_id: '',
                    is_active: true,
                },
                createRoute: 'production.work-cells.store',
                updateRoute: 'production.work-cells.update',
                entityName: 'Célula de Trabalho',
            }}
        >
            {({ data, setData, errors }) => (
                <>
                    {/* Nome da Célula - Campo Obrigatório */}
                    <TextInput
                        ref={nameInputRef}
                        form={{
                            data,
                            setData,
                            errors,
                            clearErrors: () => { },
                        }}
                        name="name"
                        label="Nome da Célula"
                        placeholder="Nome da célula de trabalho"
                        required
                    />
                    {/* Tipo de Célula */}
                    <div className="space-y-2">
                        <Label htmlFor="cell_type" className="text-sm text-muted-foreground">
                            Tipo de Célula <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={data.cell_type}
                            onValueChange={(value) => setData('cell_type', value)}
                        >
                            <SelectTrigger id="cell_type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="internal">Interna</SelectItem>
                                <SelectItem value="external">Externa</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.cell_type && <p className="text-destructive text-sm">{errors.cell_type}</p>}
                    </div>
                    {/* Horas Disponíveis e Eficiência - Grid com 2 colunas */}
                    <div className="grid grid-cols-2 gap-4">
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => { },
                            }}
                            name="available_hours_per_day"
                            label="Horas/Dia"
                            placeholder="8"
                            required
                        />
                        <TextInput
                            form={{
                                data,
                                setData,
                                errors,
                                clearErrors: () => { },
                            }}
                            name="efficiency_percentage"
                            label="Eficiência (%)"
                            placeholder="85"
                            required
                        />
                    </div>
                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-muted-foreground text-sm">
                            Descrição
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Descrição da célula de trabalho..."
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            className="min-h-[100px]"
                        />
                        {errors.description && <p className="text-destructive text-sm">{errors.description}</p>}
                    </div>
                </>
            )}
        </BaseEntitySheet>
    );
};
export default CreateWorkCellSheet;