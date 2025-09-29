import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
    value: string;
    onChange: (emoji: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

const DEFAULT_EMOJIS = [
    // System/Admin
    '⚡', '🛡️', '👑', '🔐', '🔑', '⚙️',
    // Roles
    '👤', '👥', '👷', '🔧', '🏭', '🏢', '🏗️', '📋',
    // Status/Actions
    '✅', '❌', '⏸️', '▶️', '🔄', '📊', '📈', '📉',
    // Objects
    '🏭', '🏢', '🏗️', '🏠', '🚧', '🔨', '🔩', '⚒️',
    '🧰', '🔧', '🪛', '🪜', '🧲', '⚙️', '🔗', '📦',
    // Safety
    '🦺', '⛑️', '🥽', '🧤', '👷', '🚨', '⚠️', '☢️',
    // Technology
    '💻', '🖥️', '📱', '🖨️', '⌨️', '🖱️', '💾', '📡',
    // Documents
    '📄', '📃', '📋', '📊', '📈', '📉', '📐', '📏',
    // Time
    '⏰', '⏱️', '⏲️', '🕐', '📅', '📆', '🗓️', '⏳',
    // Communication
    '📞', '📧', '💬', '📢', '📣', '🔔', '🔕', '📬',
    // Others
    '🌡️', '💡', '🔋', '🔌', '🏷️', '🎯', '🚀', '💎',
];

export function EmojiPicker({
    value,
    onChange,
    placeholder = 'Choose an emoji...',
    disabled = false,
}: EmojiPickerProps) {
    const [open, setOpen] = useState(false);

    const handleSelect = (emoji: string) => {
        onChange(emoji);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                    disabled={disabled}
                >
                    {value ? (
                        <span className="flex items-center gap-2">
                            <span className="text-2xl">{value}</span>
                            <span className="text-sm">Click to change</span>
                        </span>
                    ) : (
                        placeholder
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3" align="start">
                <div className="grid grid-cols-8 gap-2">
                    {DEFAULT_EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => handleSelect(emoji)}
                            className={cn(
                                "h-10 w-10 rounded hover:bg-muted flex items-center justify-center text-2xl transition-colors",
                                value === emoji && "bg-muted ring-2 ring-primary"
                            )}
                            title={`Select ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                {value && (
                    <div className="mt-3 pt-3 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleSelect('')}
                        >
                            Clear Selection
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
