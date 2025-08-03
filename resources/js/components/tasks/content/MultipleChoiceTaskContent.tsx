import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Task } from '@/types/task';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TaskCardMode } from './TaskContent';
import { withSaveFunctionality, WithSaveFunctionalityProps } from './withSaveFunctionality';
interface MultipleChoiceTaskContentProps extends WithSaveFunctionalityProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}
function MultipleChoiceTaskContent({ task, mode, onUpdate, response, setResponse, disabled }: MultipleChoiceTaskContentProps) {
    const [options, setOptions] = useState<string[]>(task.options || []);
    const isMultipleSelect = task.type === 'multiple_select';
    useEffect(() => {
        if (isMultipleSelect) {
            if (!response || !Array.isArray(response.value)) {
                setResponse({ value: [] });
            }
        } else {
            if (!response || typeof response.value !== 'string') {
                setResponse({ value: '' });
            }
        }
    }, [isMultipleSelect, response, setResponse]);
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
    const validOptions = mode === 'edit' ? options : options.filter((option) => option.trim() !== '');
    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="bg-muted/30 rounded-md pr-4 pb-4 pl-4">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            {isMultipleSelect ? (
                                <p className="text-foreground text-base">O usuário poderá selecionar várias opções.</p>
                            ) : (
                                <p className="text-foreground text-base">O usuário poderá selecionar apenas uma opção.</p>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddOption}
                                className="flex w-full items-center justify-center gap-2 lg:w-auto"
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
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOption(index)} className="h-10 w-10">
                                        <Trash2 className="text-destructive h-4 w-4" />
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
        const isResponding = mode === 'respond';
        if (validOptions.length === 0) {
            return (
                <div className="bg-muted/30 rounded-md p-4">
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
                                    id={`option-${task.id}-${index}`}
                                    checked={response?.value?.includes(option)}
                                    onCheckedChange={(checked) => {
                                        if (isResponding) {
                                            const currentValue = response?.value || [];
                                            const newValue = checked
                                                ? [...currentValue, option]
                                                : currentValue.filter((item: string) => item !== option);
                                            setResponse({ value: newValue });
                                        }
                                    }}
                                    disabled={!isResponding || disabled}
                                />
                                <Label htmlFor={`option-${task.id}-${index}`} className={cn('text-base', !isResponding && 'text-muted-foreground')}>
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
                    value={response?.value}
                    onValueChange={(value) => isResponding && setResponse({ value })}
                    disabled={!isResponding || disabled}
                >
                    {validOptions.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem id={`option-${task.id}-${index}`} value={option} />
                            <Label htmlFor={`option-${task.id}-${index}`} className={cn('text-base', !isResponding && 'text-muted-foreground')}>
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
export default withSaveFunctionality(MultipleChoiceTaskContent);
