import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ImportFile, FieldMapping, ImportOptions } from '../types';
import { ArrowLeft } from 'lucide-react';

interface Props {
    files: ImportFile[];
    onNext: (mapping: FieldMapping, options: ImportOptions) => void;
    onBack: () => void;
}

const WORK_CELL_FIELDS = [
    { key: 'name', label: 'Nome', required: true },
    { key: 'description', label: 'Descrição', required: false },
    { key: 'cell_type', label: 'Tipo de Célula', required: true },
    { key: 'plant', label: 'Planta', required: false },
    { key: 'area', label: 'Área', required: false },
    { key: 'sector', label: 'Setor', required: false },
    { key: 'shift', label: 'Turno', required: false },
    { key: 'manufacturer', label: 'Fabricante', required: false },
    { key: 'has_finite_capacity', label: 'Capacidade Finita', required: false },
    { key: 'default_production_rate', label: 'Taxa de Produção Padrão', required: false },
    { key: 'default_unit_of_measure', label: 'Unidade de Medida Padrão', required: false },
    { key: 'is_active', label: 'Ativa', required: false },
];

export function ConfigurationStep({ files, onNext, onBack }: Props) {
    const [mapping, setMapping] = useState<FieldMapping>(() => {
        // Auto-map fields based on header names
        const defaultMapping: FieldMapping = {};
        WORK_CELL_FIELDS.forEach(field => {
            defaultMapping[field.key] = field.key;
        });
        return defaultMapping;
    });

    const [options, setOptions] = useState<ImportOptions>({
        updateExisting: true,
        skipDuplicates: false,
    });

    // Parse CSV headers if available
    const csvHeaders = files[0]?.preview?.[0]?.split(',').map(h => h.trim()) || [];

    const handleMappingChange = (field: string, value: string | null) => {
        setMapping(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleOptionChange = (option: keyof ImportOptions, value: boolean) => {
        setOptions(prev => ({
            ...prev,
            [option]: value
        }));
    };

    const isValid = () => {
        // Check if all required fields are mapped
        return WORK_CELL_FIELDS
            .filter(f => f.required)
            .every(f => mapping[f.key] && mapping[f.key] !== 'ignore');
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configuração da Importação</CardTitle>
                    <CardDescription>
                        Mapeie os campos do arquivo para os campos das células de trabalho
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Field mapping */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Mapeamento de Campos</h3>
                        <div className="space-y-3">
                            {WORK_CELL_FIELDS.map(field => (
                                <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                                    <Label className="text-sm">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <Select
                                        value={mapping[field.key] || 'ignore'}
                                        onValueChange={(value) =>
                                            handleMappingChange(field.key, value === 'ignore' ? null : value)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ignore">Ignorar</SelectItem>
                                            {csvHeaders.map((header, index) => (
                                                <SelectItem key={index} value={header}>
                                                    {header}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Import options */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Opções de Importação</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="update-existing" className="text-sm font-medium">
                                        Atualizar registros existentes
                                    </Label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Se uma célula com o mesmo nome já existir, seus dados serão atualizados
                                    </p>
                                </div>
                                <Switch
                                    id="update-existing"
                                    checked={options.updateExisting}
                                    onCheckedChange={(checked) => handleOptionChange('updateExisting', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="skip-duplicates" className="text-sm font-medium">
                                        Pular registros duplicados
                                    </Label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Células que já existem serão ignoradas (não serão atualizadas)
                                    </p>
                                </div>
                                <Switch
                                    id="skip-duplicates"
                                    checked={options.skipDuplicates}
                                    onCheckedChange={(checked) => handleOptionChange('skipDuplicates', checked)}
                                    disabled={options.updateExisting}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Info about conflicting options */}
                    {options.updateExisting && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Nota:</strong> Com "Atualizar registros existentes" ativado,
                                a opção "Pular duplicados" é desabilitada pois registros existentes serão atualizados.
                            </p>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={onBack}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                        <Button
                            onClick={() => onNext(mapping, options)}
                            disabled={!isValid()}
                        >
                            Próximo
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
