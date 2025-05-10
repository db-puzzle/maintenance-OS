import { type SelectProps } from '@radix-ui/react-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search } from 'lucide-react';
import { Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { useState, useMemo } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ItemSelectProps extends SelectProps {
    label: string;
    items: ReadonlyArray<{
        readonly id: number;
        readonly name: string;
        readonly icon?: LucideIcon;
        readonly value?: string;
        readonly label?: string;
        readonly placeholder?: string;
    }>;
    value: string;
    onValueChange: (value: string) => void;
    createRoute: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    canCreate?: boolean;
    required?: boolean;
    searchable?: boolean;
}

export default function ItemSelect({
    label,
    items,
    value,
    onValueChange,
    createRoute,
    placeholder = 'Selecione um item',
    error,
    disabled = false,
    canCreate = true,
    required = false,
    searchable,
    ...props
}: ItemSelectProps) {
    const [search, setSearch] = useState('');
    const showSearch = searchable ?? items.length > 8;
    const filteredItems = useMemo(() => {
        if (!showSearch || !search) return items;
        return items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
    }, [items, search, showSearch]);

    const selectedItem = items.find(item => item.id.toString() === value);

    return (
        <div className="grid gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
            </label>
            <div className="bg-background rounded-md">
                <Select
                    value={value}
                    onValueChange={onValueChange}
                    disabled={disabled}
                    {...props}
                >
                    <SelectTrigger
                        error={!!error}
                    >
                        <SelectValue placeholder={placeholder}>
                            {selectedItem && (
                                <div className="flex items-center gap-2">
                                    {selectedItem.icon && <selectedItem.icon className="h-4 w-4" />}
                                    <span>{selectedItem.name}</span>
                                </div>
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {showSearch && (
                            <div className="flex items-center px-2 pb-1 border-b border-border">
                                <Search className="w-4 h-4 text-muted-foreground mr-2" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar..."
                                    className="w-full py-1 bg-transparent outline-none text-sm"
                                    autoFocus
                                    onPointerDown={e => e.stopPropagation()}
                                    onKeyDown={e => e.stopPropagation()}
                                />
                            </div>
                        )}
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col">
                                <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                                    {canCreate 
                                        ? `Nenhum(a) ${label.toLowerCase()} cadastrado(a)`
                                        : `Nenhum(a) ${label.toLowerCase()} disponível`}
                                </div>
                                {canCreate && (
                                    <div className="border-t">
                                        <Link 
                                            href={createRoute}
                                            className="text-sm text-primary hover:underline flex items-center gap-2 px-2 py-1.5"
                                        >
                                            <PlusCircle className="h-4 w-4" />
                                            Criar novo(a) {label.toLowerCase()}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {filteredItems.map((item) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            {item.icon && <item.icon className="h-4 w-4" />}
                                            <span>{item.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                                {canCreate && (
                                    <div className="border-t">
                                        <Link 
                                            href={createRoute}
                                            className="text-sm text-primary hover:underline flex items-center gap-2 px-2 py-1.5"
                                        >
                                            <PlusCircle className="h-4 w-4" />
                                            Criar novo(a) {label.toLowerCase()}
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </SelectContent>
                </Select>
            </div>
            {error && <InputError message={error} />}
        </div>
    );
} 