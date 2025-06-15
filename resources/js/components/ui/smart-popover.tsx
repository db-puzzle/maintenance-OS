import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputError } from "@/components/ui/input-error";

interface SmartPopoverProps {
    id: string;
    value: string | undefined;
    options: Array<{ id: string | number; name: string }>;
    onChange: (value: string) => void;
    onClearError?: () => void;
    error?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
}

export function SmartPopover({
    id,
    value,
    options,
    onChange,
    onClearError,
    error,
    placeholder = "Selecione uma opção",
    searchPlaceholder = "Buscar...",
    emptyMessage = "Nenhuma opção encontrada.",
    className,
    disabled = false,
}: SmartPopoverProps) {
    const [open, setOpen] = useState(false);

    const selectedOption = useMemo(() =>
        options.find((option) => option.id.toString() === value),
        [options, value]
    );

    const sortedOptions = useMemo(() =>
        [...options].sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
        ),
        [options]
    );

    return (
        <div className="w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "w-full justify-between",
                            error && "border-destructive focus-visible:ring-destructive",
                            disabled && "opacity-50 cursor-not-allowed",
                            className
                        )}
                        disabled={disabled}
                    >
                        {value ? selectedOption?.name : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                    <Command>
                        <CommandInput placeholder={searchPlaceholder} />
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {sortedOptions.map((option) => (
                                <CommandItem
                                    key={option.id}
                                    value={option.name}
                                    onSelect={() => {
                                        onChange(option.id.toString());
                                        onClearError?.();
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.id.toString()
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    {option.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
            <InputError message={error} />
        </div>
    );
} 