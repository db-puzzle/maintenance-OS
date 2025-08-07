import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import React, { useState } from 'react';
export interface TimeSelectProps {
    value: string; // formato "HH:MM"
    onChange: (value: string) => void;
    label?: string;
}
const TimeSelect: React.FC<TimeSelectProps> = ({ value, onChange, label }) => {
    // Parse do valor inicial (formato 24h) para componentes hora, minuto e período
    const parseTime = (timeString: string) => {
        const [hours, minutes] = timeString.split(':').map(Number);
        let period = 'AM';
        let hour12 = hours;
        if (hours >= 12) {
            period = 'PM';
            hour12 = hours === 12 ? 12 : hours - 12;
        } else if (hours === 0) {
            hour12 = 12;
        }
        return {
            hour: hour12.toString().padStart(2, '0'),
            minute: minutes.toString().padStart(2, '0'),
            period,
        };
    };
    // Converte os componentes de volta para formato 24h
    const formatTime = (hour: string, minute: string, period: string) => {
        let hour24 = parseInt(hour);
        if (period === 'PM' && hour24 < 12) {
            hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
            hour24 = 0;
        }
        return `${hour24.toString().padStart(2, '0')}:${minute}`;
    };
    const { hour, minute, period } = parseTime(value);
    const [selectedHour, setSelectedHour] = useState(hour);
    const [selectedMinute, setSelectedMinute] = useState(minute);
    const [selectedPeriod, setSelectedPeriod] = useState(period);
    const [hourOpen, setHourOpen] = useState(false);
    const [minuteOpen, setMinuteOpen] = useState(false);
    const [periodOpen, setPeriodOpen] = useState(false);
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    const periods = ['AM', 'PM'];
    const updateTime = (h = selectedHour, m = selectedMinute, p = selectedPeriod) => {
        const newTimeValue = formatTime(h, m, p);
        onChange(newTimeValue);
    };
    return (
        <div className="flex flex-col space-y-2">
            {label && <Label>{label}</Label>}
            <div className="flex">
                {/* Seletor de hora */}
                <Popover open={hourOpen} onOpenChange={setHourOpen} modal={true}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[50px] justify-center rounded-r-none border-r-0 text-center font-normal">
                            {selectedHour || 'Hora'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[100] w-[80px] p-0" align="center" side="bottom">
                        <Command>
                            <CommandInput placeholder="Hora" className="h-8" />
                            <CommandEmpty>Não encontrado</CommandEmpty>
                            <CommandList className="max-h-40">
                                <CommandGroup>
                                    {hours.map((h) => (
                                        <CommandItem
                                            key={h}
                                            value={h}
                                            onSelect={(value: string) => {
                                                setSelectedHour(value);
                                                setHourOpen(false);
                                                updateTime(value);
                                            }}
                                            className="justify-center text-center"
                                        >
                                            {h}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {/* Separador */}
                <span className="border-input bg-popover inline-flex items-center justify-center border-t border-b px-2">:</span>
                {/* Seletor de minutos */}
                <Popover open={minuteOpen} onOpenChange={setMinuteOpen} modal={true}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[50px] justify-center rounded-none border-r-0 border-l-0 text-center font-normal">
                            {selectedMinute || 'Min'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[100] w-[80px] p-0" align="center" side="bottom">
                        <Command>
                            <CommandInput placeholder="Min" className="h-8" />
                            <CommandEmpty>Não encontrado</CommandEmpty>
                            <CommandList className="max-h-40">
                                <CommandGroup>
                                    {minutes.map((m) => (
                                        <CommandItem
                                            key={m}
                                            value={m}
                                            onSelect={(value: string) => {
                                                setSelectedMinute(value);
                                                setMinuteOpen(false);
                                                updateTime(undefined, value);
                                            }}
                                            className="justify-center text-center"
                                        >
                                            {m}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {/* Seletor AM/PM */}
                <Popover open={periodOpen} onOpenChange={setPeriodOpen} modal={true}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[50px] justify-center rounded-l-none border-l-0 text-center font-normal">
                            {selectedPeriod}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[100] w-[80px] p-0" align="center" side="bottom">
                        <Command>
                            <CommandList className="max-h-20">
                                <CommandGroup>
                                    {periods.map((p) => (
                                        <CommandItem
                                            key={p}
                                            value={p}
                                            onSelect={(value: string) => {
                                                setSelectedPeriod(value);
                                                setPeriodOpen(false);
                                                updateTime(undefined, undefined, value);
                                            }}
                                            className="justify-center text-center"
                                        >
                                            {p}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};
export default TimeSelect;
