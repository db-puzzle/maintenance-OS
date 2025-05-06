import { Task } from '@/types/task';
import { useState } from 'react';
import { TaskCardMode } from './TaskContent';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultipleChoiceTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}

export default function MultipleChoiceTaskContent({ task, mode, onUpdate }: MultipleChoiceTaskContentProps) {
    const [selectedOption, setSelectedOption] = useState<string>('');
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [options, setOptions] = useState<string[]>(task.options || []);

    const isMultipleSelect = task.type === 'multiple_select';

    const handleAddOption = () => {
        const newOptions = [...options, ''];
        setOptions(newOptions);
        onUpdate?.({ ...task, options: newOptions });
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
        onUpdate?.({ ...task, options: newOptions });
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
        onUpdate?.({ ...task, options: newOptions });
    };

    // Filtra opções vazias para os modos preview e respond
    const validOptions = mode === 'edit' ? options : options.filter(option => option.trim() !== '');

    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="pl-4 pr-4 pb-4 bg-muted/30 rounded-md">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            {isMultipleSelect ? (
                                <p className="text-base text-foreground">O usuário poderá selecionar várias opções.</p>
                            ) : (
                                <p className="text-base text-foreground">O usuário poderá selecionar apenas uma opção.</p>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddOption}
                                className="flex items-center gap-2"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Adicionar Opção
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        placeholder={`Opção ${index + 1}`}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveOption(index)}
                                        className="h-10 w-10"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'preview' || mode === 'respond') {
        const isPreview = mode === 'preview';

        if (validOptions.length === 0) {
            return (
                <div className="p-4 bg-muted/30 rounded-md">
                    <p className="text-muted-foreground">Nenhuma opção válida disponível.</p>
                </div>
            );
        }

        if (isMultipleSelect) {
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        {validOptions.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`option-${index}`}
                                    checked={selectedOptions.includes(option)}
                                    onCheckedChange={(checked) => {
                                        if (!isPreview) {
                                            if (checked) {
                                                setSelectedOptions(prev => [...prev, option]);
                                            } else {
                                                setSelectedOptions(prev => prev.filter(item => item !== option));
                                            }
                                        }
                                    }}
                                    disabled={isPreview}
                                />
                                <Label 
                                    htmlFor={`option-${index}`} 
                                    className={cn(
                                        "text-base",
                                        isPreview && "text-muted-foreground"
                                    )}
                                >
                                    {option}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <RadioGroup 
                    value={selectedOption} 
                    onValueChange={(value) => !isPreview && setSelectedOption(value)}
                    disabled={isPreview}
                >
                    {validOptions.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem id={`option-${index}`} value={option} disabled={isPreview} />
                            <Label 
                                htmlFor={`option-${index}`} 
                                className={cn(
                                    "text-base",
                                    isPreview && "text-muted-foreground"
                                )}
                            >
                                {option}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
        );
    }

    return null;
} 