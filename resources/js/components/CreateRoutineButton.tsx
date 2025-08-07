import EditRoutineSheet from '@/components/EditRoutineSheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { forwardRef, useRef } from 'react';
// Import Routine type to match EditRoutineSheet
interface Routine {
    id?: number;
    name: string;
    trigger_type: 'runtime_hours' | 'calendar_days';
    trigger_runtime_hours?: number;
    trigger_calendar_days?: number;
    execution_mode: 'automatic' | 'manual';
    description?: string;
    form_id?: number;
    asset_id?: number;
    advance_generation_days: number;
    auto_approve_work_orders: boolean;
    priority_score: number;
    last_execution_runtime_hours?: number;
    last_execution_completed_at?: string;
    last_execution_form_version_id?: number;
    [key: string]: unknown;
}
interface CreateRoutineButtonProps {
    onSuccess?: (routine: Routine) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    text?: string;
    className?: string;
    assetId?: number;
    userPermissions?: string[];
}
const CreateRoutineButton = forwardRef<HTMLButtonElement, CreateRoutineButtonProps>(
    ({ onSuccess, variant = 'default', size = 'sm', text = 'Nova Rotina', className, assetId, userPermissions = [] }, ref) => {
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
                <Button ref={ref} variant={variant} size={size} onClick={handleClick} className={className}>
                    <Plus className="mr-1 h-4 w-4" />
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
                        userPermissions={userPermissions}
                    />
                </div>
            </>
        );
    },
);
CreateRoutineButton.displayName = 'CreateRoutineButton';
export default CreateRoutineButton;
