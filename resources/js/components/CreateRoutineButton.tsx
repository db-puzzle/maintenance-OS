import { useRef, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import EditRoutineSheet from '@/components/EditRoutineSheet';
import { Routine } from '@/components/RoutineList';

interface CreateRoutineButtonProps {
    onSuccess?: (routine: Routine) => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    text?: string;
    className?: string;
    assetId?: number;
}

const CreateRoutineButton = forwardRef<HTMLButtonElement, CreateRoutineButtonProps>(({ 
    onSuccess, 
    variant = "default", 
    size = "default", 
    text = "Nova Rotina",
    className,
    assetId 
}, ref) => {
    const sheetTriggerRef = useRef<HTMLButtonElement>(null);

    const handleClick = () => {
        sheetTriggerRef.current?.click();
    };

    const handleSheetSuccess = (routine: Routine) => {
        if (onSuccess) {
            onSuccess(routine);
        }
    };

    return (
        <>
            <Button 
                ref={ref}
                variant={variant} 
                size={size} 
                onClick={handleClick}
                className={className}
            >
                <Plus className="h-4 w-4 mr-1" />
                {text}
            </Button>

            {/* EditRoutineSheet em modo criação com SheetTrigger interno */}
            <div style={{ display: 'none' }}>
                <EditRoutineSheet
                    showTrigger={true}
                    triggerText="Trigger Oculto"
                    triggerVariant="outline"
                    triggerRef={sheetTriggerRef}
                    isNew={true}
                    assetId={assetId}
                    onSuccess={handleSheetSuccess}
                />
            </div>
        </>
    );
});

CreateRoutineButton.displayName = 'CreateRoutineButton';

export default CreateRoutineButton; 