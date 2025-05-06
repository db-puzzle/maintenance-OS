import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface EditableTextProps {
    value: string;
    onChange: (value: string) => void;
    isEditing: boolean;
    editingClassName?: string;
    viewClassName?: string;
}

export function EditableText({ 
    value, 
    onChange, 
    isEditing,
    editingClassName = '',
    viewClassName = ''
}: EditableTextProps) {
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const baseStyles = "w-full tracking-normal";
    
    // Atualiza o valor local quando o valor da prop mudar
    useEffect(() => {
        setLocalValue(value);
    }, [value]);
    
    // Foca no input quando entrar no modo de edição
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);
    
    // Manipula a mudança no input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
    };

    // Manipula a tecla Enter
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputRef.current?.blur();
        }
    };

    if (isEditing) {
        return (
            <div className="flex-1 min-w-0">
                <Input
                    type="text"
                    value={localValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className={`${baseStyles} ${editingClassName}`}
                    autoFocus
                    ref={inputRef}
                />
            </div>
        );
    }

    return (
        <div className={`${baseStyles} border border-transparent ${viewClassName}`}>
            {value}
        </div>
    );
} 