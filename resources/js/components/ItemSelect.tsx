import InputError from '@/components/input-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { type SelectProps } from '@radix-ui/react-select';
import { LucideIcon, PlusCircle, Search } from 'lucide-react';
import { forwardRef, useEffect, useMemo, useState } from 'react';
export interface ItemSelectProps extends SelectProps {
    label?: string;
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
    createRoute?: string;
    onCreateClick?: () => void;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    view?: boolean;
    canCreate?: boolean;
    required?: boolean;
    searchable?: boolean;
    canClear?: boolean;
}
const ItemSelect = forwardRef<HTMLButtonElement, ItemSelectProps>(
    (
        {
            label,
            items,
            value,
            onValueChange,
            createRoute,
            onCreateClick,
            placeholder = 'Selecione um item',
            error,
            disabled = false,
            view = false,
            canCreate = true,
            required = false,
            searchable,
            canClear = false,
            ...props
        },
        ref,
    ) => {
        const [search, setSearch] = useState('');
        const [isSelectOpen, setIsSelectOpen] = useState(false);
        const showSearch = searchable ?? items.length > 8;
        const filteredItems = useMemo(() => {
            if (!showSearch || !search) return items;
            return items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
        }, [items, search, showSearch]);
        // Limpa o search quando o select é fechado
        useEffect(() => {
            if (!isSelectOpen) {
                setSearch('');
            }
        }, [isSelectOpen]);
        const selectedItem = items.find((item) => item.id.toString() === value);
        const hasCreateOption = canCreate && (onCreateClick || createRoute);
        // Função wrapper para interceptar o valor de limpar seleção
        const handleValueChange = (newValue: string) => {
            // Prevent changes in view mode
            if (view) return;
            if (newValue === '__clear__') {
                onValueChange('');
            } else {
                onValueChange(newValue);
            }
        };
        const CreateButton = () => {
            if (onCreateClick) {
                return (
                    <button
                        type="button"
                        onClick={() => {
                            onCreateClick();
                            setIsSelectOpen(false);
                        }}
                        className="text-primary flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:underline"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Criar novo(a) {label?.toLowerCase() || 'item'}
                    </button>
                );
            }
            if (createRoute) {
                return (
                    <Link
                        href={createRoute}
                        className="text-primary flex items-center gap-2 px-2 py-1.5 text-sm hover:underline"
                        onClick={() => setIsSelectOpen(false)}
                    >
                        <PlusCircle className="h-4 w-4" />
                        Criar novo(a) {label?.toLowerCase() || 'item'}
                    </Link>
                );
            }
            return null;
        };
        return (
            <div className="grid gap-2">
                {label && (
                    <label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                        {required && <span className="text-destructive ml-1">*</span>}
                    </label>
                )}
                <div className="bg-background rounded-md">
                    <Select
                        value={value}
                        onValueChange={handleValueChange}
                        disabled={disabled && !view}
                        open={isSelectOpen}
                        onOpenChange={(open) => {
                            // Prevent opening in view mode
                            if (!view) {
                                setIsSelectOpen(open);
                            }
                        }}
                        {...props}
                    >
                        <SelectTrigger
                            ref={ref}
                            error={!!error}
                            className={cn(
                                view &&
                                [
                                    'pointer-events-none cursor-default opacity-100',
                                    'text-foreground [&>span]:text-foreground',
                                    '[&>svg]:hidden',
                                    // Don't override placeholder text color
                                    '[&_[data-slot=select-value]:not(:has(*))]:text-inherit',
                                    // Add muted background in view mode to match TextInput styling
                                    'bg-muted/20',
                                ]
                                    .filter(Boolean)
                                    .join(' '),
                            )}
                            tabIndex={view ? -1 : 0}
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
                            <div className="flex flex-col max-h-[300px]">
                                {showSearch && (
                                    <div className="sticky top-0 z-10 bg-popover border-border flex items-center border-b px-2 pb-1">
                                        <Search className="text-muted-foreground mr-2 h-4 w-4" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Buscar..."
                                            className="w-full bg-transparent py-1 text-sm outline-none"
                                            autoFocus
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                                <div className="flex-1 overflow-y-auto">
                                    {filteredItems.length === 0 ? (
                                        <div className="text-muted-foreground px-2 py-8 text-center text-sm">
                                            {hasCreateOption
                                                ? `Nenhum(a) ${label?.toLowerCase() || 'item'} cadastrado(a)`
                                                : `Nenhum(a) ${label?.toLowerCase() || 'item'} disponível`}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Opção para limpar seleção */}
                                            {canClear && value && (
                                                <>
                                                    <SelectItem value="__clear__">
                                                        <div className="text-muted-foreground flex items-center gap-2">
                                                            <span>Limpar seleção</span>
                                                        </div>
                                                    </SelectItem>
                                                    <div className="my-1 border-t" />
                                                </>
                                            )}
                                            {filteredItems.map((item) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        {item.icon && <item.icon className="h-4 w-4" />}
                                                        <span>{item.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </>
                                    )}
                                </div>
                                {hasCreateOption && (
                                    <div className="sticky bottom-0 z-10 bg-popover border-t">
                                        <CreateButton />
                                    </div>
                                )}
                            </div>
                        </SelectContent>
                    </Select>
                </div>
                {error && <InputError message={error} />}
            </div>
        );
    },
);
ItemSelect.displayName = 'ItemSelect';
export { ItemSelect };
